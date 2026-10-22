import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Customer } from '../../types/Customer';
import type { SegmentationResult } from '../../types/Segmentation';
import { CUSTOMERS_CHANGED_EVENT, getCustomers, initializeCustomers, getLastSegmentation, saveSegmentationResult } from '../../services/customerService';
import { runSegmentation, validateSegmentationInput } from '../../services/segmentationService';
import { inspectSegmentationInput } from '../../services/segmentationValidation';
import { sampleCustomers } from '../customers/sampleCustomers';
import Icon from '../../components/ui/Icon';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import './segmentation.css';
import SegmentDetail from './SegmentDetail';
import ValueLevelBadge from '../../components/ui/ValueLevelBadge';

const decimal = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const fingerprint = (customers: Customer[]) => JSON.stringify(customers.map(({ id, nombre, gastoAcumulado, visitas6Meses, antiguedadMeses }) => ({ id, nombre, gastoAcumulado, visitas6Meses, antiguedadMeses })));

export default function Segmentation({ onCustomers }: { onCustomers: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [k, setK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const lastFingerprint = useRef<string | null>(null);

  function refresh() {
    try {
      const latest = getCustomers();
      const current = fingerprint(latest);
      if (lastFingerprint.current !== null && lastFingerprint.current !== current) {
        controller.current?.abort();
        controller.current = null;
        setLoading(false);
        setConfirm(false);
        setResult(null);
        setNotice('Los clientes cambiaron. Ejecuta nuevamente con los datos actualizados.');
      }
      lastFingerprint.current = current;
      setResult(getLastSegmentation());
      setCustomers(latest);
      setReady(true);
      setError('');
    } catch (cause) {
      controller.current?.abort();
      controller.current = null;
      setLoading(false);
      setConfirm(false);
      setResult(null);
      setReady(false);
      setCustomers([]);
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los clientes.');
    }
  }

  useEffect(() => {
    try { initializeCustomers(sampleCustomers); refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los clientes.'); }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'segmentacion-clientes.customers') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
    return () => {
      controller.current?.abort();
      controller.current = null;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
    };
  }, []);

  function requestRun(event: FormEvent) {
    event.preventDefault();
    try {
      validateSegmentationInput(getCustomers(), k);
      setError('');
      setConfirm(true);
    } catch (cause) {
      refresh();
      setConfirm(false);
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'Revisa los datos antes de ejecutar.');
    }
  }

  async function execute() {
    setConfirm(false);
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const snapshot = getCustomers();
      validateSegmentationInput(snapshot, k);
      const response = await runSegmentation(snapshot, k, { signal: request.signal });
      if (request.signal.aborted) return;
      if (fingerprint(snapshot) !== fingerprint(getCustomers())) throw new Error('Los clientes cambiaron durante la ejecución. Vuelve a ejecutar.');
      saveSegmentationResult(response, snapshot);
      setResult(response);
    } catch (cause) {
      if (!request.signal.aborted) {
        refresh();
        setError(cause instanceof Error ? cause.message : 'No se pudo completar la ejecución. Inténtalo nuevamente.');
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setLoading(false);
      }
    }
  }

  const insufficient = ready && customers.length < k;
  const validation = inspectSegmentationInput(customers, k);
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">ANÁLISIS DE CLIENTES</p><h1>Segmentación</h1><p>Agrupa a tus clientes según la similitud de sus hábitos de compra.</p></div><span className="simulation-badge">K-Means activo</span></div>
      <div className="simulation-banner"><Icon name="segments" /><div><strong>Segmentación con K-Means</strong><p>Se estandarizan gasto, visitas y antigüedad para encontrar grupos similares. Al confirmar, los segmentos se guardan y actualizan el panel.</p></div></div>
      {error && <div className="notice error" role="alert">{error} {!ready && <button type="button" onClick={refresh}>Volver a consultar</button>}</div>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="segmentation-setup">
        <section className="card segmentation-config" aria-labelledby="config-title">
          <div className="section-heading"><div><h2 id="config-title">Configuración del proceso</h2><p>Elige cuántos grupos deseas obtener.</p></div><Icon name="segments" /></div>
          <form onSubmit={requestRun} className="segmentation-form">
            <div className="segmentation-field"><label htmlFor="cluster-count">Número de segmentos (K)</label><select id="cluster-count" value={k} disabled={loading} onChange={(event) => { setK(Number(event.target.value)); if (ready) setError(''); }}>{[2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} segmentos</option>)}</select><p>K indica la cantidad de grupos que tendrá el resultado.</p></div>
            <div className="dataset-status"><span className="metric-icon cyan"><Icon name="customers" /></span><div><strong>{ready ? customers.length : '—'} clientes disponibles</strong><p>{ready ? 'Datos actuales de tu directorio' : 'Revisa la carga de los datos'}</p></div></div>
            {insufficient && <p className="insufficient-data" role="status">Necesitas al menos {k} clientes válidos para K={k}. Actualmente tienes {customers.length}.</p>}
            <button className="primary icon-button run-segmentation" type="submit" disabled={!ready || !validation.isValid || loading}>{loading ? <><span className="loading-spinner" />Ejecutando…</> : <><Icon name="chart" />Ejecutar segmentación</>}</button>
            <p className="simulation-caption">Las asignaciones y la fecha de ejecución se conservarán al recargar.</p>
          </form>
        </section>
        <aside className="card segmentation-guide"><p className="section-overline">VARIABLES DEL ANÁLISIS</p><h2>¿Qué datos se utilizan?</h2><ul><li><span className="metric-icon cyan"><Icon name="wallet" /></span><div><strong>Gasto acumulado</strong><p>Importe total registrado en soles.</p></div></li><li><span className="metric-icon purple"><Icon name="visits" /></span><div><strong>Visitas en 6 meses</strong><p>Frecuencia de visita del cliente.</p></div></li><li><span className="metric-icon blue"><Icon name="customers" /></span><div><strong>Antigüedad</strong><p>Meses desde que es cliente.</p></div></li></ul><p className="guide-footnote">K-Means estandariza estas tres variables antes de comparar clientes. El nombre y el código sirven para identificar registros.</p></aside>
      </div>
      <section className="card segmentation-results" aria-labelledby="results-title" aria-busy={loading}>
        <div className="section-heading"><div><h2 id="results-title">Resultados de la ejecución</h2><p>{result ? 'Segmentos obtenidos con K-Means a partir de los registros procesados.' : 'Aquí aparecerá el resumen del proceso.'}</p></div><span className="status-badge">{loading ? 'En proceso' : result ? 'Segmentación completada' : 'Sin ejecución'}</span></div>
        {loading ? <div className="segmentation-empty" role="status"><span className="loading-spinner large" /><h3>Calculando los segmentos</h3><p>Procesando los clientes. Espera un momento…</p></div> : result ? <>
          <div className="simulated-groups">{result.grupos.map((group) => <article key={group.id}><div className="bar-heading"><h3>Segmento {group.id}</h3><span>{group.cantidad} {group.cantidad === 1 ? 'cliente' : 'clientes'}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${group.cantidad / result.cantidadProcesada * 100}%` }} /></div><dl><div><dt>Gasto promedio</dt><dd>S/ {decimal(group.gastoPromedio)}<ValueLevelBadge value={group.gastoPromedio} baseline={result.escalado.medias[0]} /></dd></div><div><dt>Visitas promedio</dt><dd>{decimal(group.visitasPromedio)}<ValueLevelBadge value={group.visitasPromedio} baseline={result.escalado.medias[1]} /></dd></div><div><dt>Antigüedad promedio</dt><dd>{decimal(group.antiguedadPromedio)} meses<ValueLevelBadge value={group.antiguedadPromedio} baseline={result.escalado.medias[2]} /></dd></div></dl><button className="segment-detail-link" aria-label={`Ver detalle del segmento ${group.id}`} onClick={() => setSelectedSegment(group.id)}>Ver detalle</button></article>)}</div>
          <details className="algorithm-details"><summary>Detalles del cálculo y centroides</summary><p>Semilla {result.configuracion.semilla} · {result.configuracion.inicializaciones} inicializaciones · {result.iteraciones} iteraciones · {result.convergio ? 'Convergencia alcanzada' : 'Límite de iteraciones alcanzado'} · Inercia estandarizada: {decimal(result.inercia)}</p><p>Los centroides se muestran en las unidades originales. Son los promedios de cada grupo.</p><div className="table-scroll"><table><thead><tr><th scope="col">Centroide</th><th scope="col">Gasto (S/)</th><th scope="col">Visitas</th><th scope="col">Antigüedad (meses)</th></tr></thead><tbody>{result.centroides.map((center) => <tr key={center.id}><td>Segmento {center.id}</td>{center.valores.map((value, index) => <td key={index}>{decimal(value)}</td>)}</tr>)}</tbody></table></div></details>
          <div className="table-scroll"><table><caption className="simulation-table-caption">Asignaciones calculadas con K-Means. Los números identifican grupos; no representan categorías comerciales fijas.</caption><thead><tr><th scope="col">Código</th><th scope="col">Cliente</th><th scope="col">Segmento</th></tr></thead><tbody>{result.clientes.map((customer) => <tr key={customer.id}><td><span className="code">{customer.id}</span></td><td>{customer.nombre}</td><td><span className="segment-tag assigned">Segmento {customer.segmento}</span></td></tr>)}</tbody></table></div>
        </> : <div className="segmentation-empty"><span className="empty-illustration"><Icon name="segments" /></span><h3>{ready && !customers.length ? 'No hay clientes para segmentar' : 'Todo listo para configurar tu análisis'}</h3><p>{ready && !customers.length ? 'Registra clientes para comenzar. Necesitas al menos dos para ejecutar.' : 'Selecciona K y ejecuta para descubrir grupos de clientes similares.'}</p>{ready && !customers.length && <button className="primary" onClick={onCustomers}>Registrar clientes</button>}</div>}
      </section>
      {confirm && <ConfirmationDialog title="¿Ejecutar K-Means?" description={`Se analizarán los clientes actuales para formar ${k} segmentos. Las nuevas asignaciones reemplazarán los segmentos anteriores y actualizarán el panel.`} confirmLabel="Sí, ejecutar K-Means" cancelLabel="Volver a configurar" onConfirm={execute} onCancel={() => setConfirm(false)} />}
      {selectedSegment !== null && <SegmentDetail segmentId={selectedSegment} onClose={() => setSelectedSegment(null)} />}
    </>
  );
}
