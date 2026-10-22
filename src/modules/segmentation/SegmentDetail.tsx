import { useEffect, useState } from 'react';
import type { SegmentationResult } from '../../types/Segmentation';
import { CUSTOMERS_CHANGED_EVENT, getLastSegmentation, SEGMENTATION_STORAGE_KEY } from '../../services/customerService';
import Modal from '../../components/ui/Modal';
import './segmentDetail.css';
import ValueLevelBadge from '../../components/ui/ValueLevelBadge';

const number = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function SegmentDetail({ segmentId, onClose }: { segmentId: number; onClose: () => void }) {
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function refresh() {
    try { setResult(getLastSegmentation()); setError(''); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'No se pudo consultar el segmento.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SEGMENTATION_STORAGE_KEY || event.key === 'segmentacion-clientes.customers') refresh();
    };
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(CUSTOMERS_CHANGED_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, []);

  const group = result?.grupos.find((item) => item.id === segmentId);
  const members = result?.clientes.filter((customer) => customer.segmento === segmentId) ?? [];
  return (
    <Modal title={`Detalle del segmento ${segmentId}`} description="Clientes y estadísticas del grupo en la segmentación vigente." eyebrow="RESULTADOS DE K-MEANS" closeLabel="Cerrar detalle" className="segment-detail-modal" onRequestClose={onClose}>
      {loading ? <p role="status">Consultando el segmento…</p> : error ? <div className="notice error" role="alert">{error} <button onClick={refresh}>Volver a consultar</button></div> : !group || !result ? <div className="segment-detail-empty" role="status"><h3>Este segmento ya no tiene un resultado vigente</h3><p>Los clientes o la segmentación cambiaron. Cierra este detalle y vuelve a ejecutar o consulta los grupos actuales.</p></div> : <>
        <dl className="segment-detail-stats"><div><dt>Clientes</dt><dd>{group.cantidad}</dd></div><div><dt>Gasto promedio</dt><dd>S/ {number(group.gastoPromedio)}<ValueLevelBadge value={group.gastoPromedio} baseline={result.escalado.medias[0]} /></dd></div><div><dt>Visitas promedio</dt><dd>{number(group.visitasPromedio)}<ValueLevelBadge value={group.visitasPromedio} baseline={result.escalado.medias[1]} /></dd></div><div><dt>Antigüedad promedio</dt><dd>{number(group.antiguedadPromedio)} <small>meses</small><ValueLevelBadge value={group.antiguedadPromedio} baseline={result.escalado.medias[2]} /></dd></div></dl>
        <div className="segment-members-heading"><h3>Clientes del segmento</h3><span>{group.cantidad} de {result.cantidadProcesada} clientes analizados</span></div>
        <div className="table-scroll"><table><caption className="sr-only">Clientes asignados al segmento {segmentId}</caption><thead><tr><th scope="col">Código</th><th scope="col">Cliente</th><th scope="col">Gasto acumulado</th><th scope="col">Visitas en 6 meses</th><th scope="col">Antigüedad</th></tr></thead><tbody>{members.map((customer) => <tr key={customer.id}><td><span className="code">{customer.id}</span></td><td className="customer-name">{customer.nombre}</td><td>S/ {number(customer.gastoAcumulado)}</td><td>{customer.visitas6Meses}</td><td>{customer.antiguedadMeses} meses</td></tr>)}</tbody></table></div>
        <p className="segment-detail-note">Alto: más del 15 % sobre el promedio general; Medio: dentro del ±15 %; Bajo: más del 15 % por debajo. El número de segmento es un identificador, no una categoría comercial fija.</p>
      </>}
      <div className="modal-actions"><button type="button" className="primary" onClick={onClose}>Cerrar detalle</button></div>
    </Modal>
  );
}
