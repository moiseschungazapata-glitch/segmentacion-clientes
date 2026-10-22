import { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { CUSTOMERS_CHANGED_EVENT, getCustomers, initializeCustomers } from '../../services/customerService';
import type { Customer } from '../../types/Customer';
import { sampleCustomers } from '../customers/sampleCustomers';
import { getDashboardMetrics } from './dashboardMetrics';
import CustomerChart from './CustomerChart';

const money = (value: number) => `S/ ${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
const decimal = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function Dashboard({ onCustomers }: { onCustomers: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function readCustomers() {
      try {
        setCustomers(getCustomers());
        setError('');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los clientes.');
      } finally {
        setLoading(false);
      }
    }
    try {
      initializeCustomers(sampleCustomers);
      readCustomers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos iniciales.');
      setLoading(false);
    }
    window.addEventListener('storage', readCustomers);
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, readCustomers);
    return () => {
      window.removeEventListener('storage', readCustomers);
      window.removeEventListener(CUSTOMERS_CHANGED_EVENT, readCustomers);
    };
  }, []);

  const metrics = getDashboardMetrics(customers);
  const indicators = [
    { label: 'Total de clientes', value: String(metrics.total), note: 'Clientes registrados', icon: 'customers' as const, tone: 'blue' },
    { label: 'Gasto promedio', value: money(metrics.gastoPromedio), note: 'Gasto acumulado por cliente', icon: 'wallet' as const, tone: 'cyan' },
    { label: 'Visitas promedio', value: decimal(metrics.visitasPromedio), note: 'Por cliente · últimos 6 meses', icon: 'visits' as const, tone: 'purple' },
    { label: 'Segmentos detectados', value: String(metrics.groups.length), note: metrics.groups.length ? 'Grupos con clientes asignados' : 'Pendiente de segmentación', icon: 'segments' as const, tone: 'amber' },
  ];

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">VISIÓN GENERAL</p><h1>Panel principal</h1><p>Una mirada a tus clientes y sus hábitos de compra.</p></div>
        <button className="primary icon-button" onClick={onCustomers}>Gestionar clientes <Icon name="arrow" /></button>
      </div>
      {error && <p role="alert" className="notice error">No se pudo actualizar el panel. {error}</p>}
      {loading ? <p role="status" className="notice">Cargando indicadores…</p> : !error && (
        <>
          <section className="kpi-grid" aria-label="Indicadores principales">
            {indicators.map((indicator) => (
              <article className="card kpi-card" key={indicator.label} aria-label={indicator.label}>
                <div className="kpi-top"><h2>{indicator.label}</h2><span className={`metric-icon ${indicator.tone}`}><Icon name={indicator.icon} /></span></div>
                <p className="kpi-value">{indicator.value}</p><p className="kpi-note">{indicator.note}</p>
              </article>
            ))}
          </section>

          <CustomerChart customers={customers} />
          <div className="dashboard-grid dashboard-details">
            <section className="card dashboard-section" aria-labelledby="segments-title">
              <div className="section-heading"><div><h2 id="segments-title">Resumen de segmentos</h2><p>Distribución de clientes por grupo.</p></div><span className={`status-badge ${metrics.groups.length ? 'ready' : ''}`}>{metrics.groups.length ? 'Con resultados' : 'Sin resultados'}</span></div>
              {metrics.groups.length === 0 ? (
                <div className="segments-empty">
                  <span className="empty-illustration"><Icon name="segments" /></span>
                  <h3>{metrics.total ? 'Todavía no hay segmentos' : 'Primero registra tus clientes'}</h3>
                  <p>{metrics.total ? 'Cuando ejecutes la segmentación, aquí verás los grupos encontrados y sus promedios.' : 'Necesitas clientes para calcular indicadores y encontrar grupos con hábitos similares.'}</p>
                  <span className="empty-hint">{metrics.total ? `${metrics.total} clientes disponibles para analizar` : 'Tu directorio está vacío'}</span>
                </div>
              ) : (
                <div className="segment-results">
                  {metrics.groups.map((group) => (
                    <article className="segment-summary" key={group.id}>
                      <div className="bar-heading"><h3>Segmento {group.id}</h3><span>{group.cantidad} {group.cantidad === 1 ? 'cliente' : 'clientes'} · {Math.round(group.cantidad / metrics.total * 100)}%</span></div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${group.cantidad / metrics.total * 100}%` }} /></div>
                      <p>Gasto: {money(group.gastoPromedio)} · Visitas: {decimal(group.visitasPromedio)} · Antigüedad: {decimal(group.antiguedadPromedio)} meses</p>
                    </article>
                  ))}
                  {metrics.sinSegmento > 0 && <p className="unassigned">{metrics.sinSegmento} clientes aún no tienen un segmento asignado.</p>}
                </div>
              )}
            </section>

          <section className="card dashboard-section overview-section" aria-labelledby="overview-title">
            <div className="section-heading"><div><h2 id="overview-title">Tus clientes de un vistazo</h2><p>Datos que se utilizan para la segmentación.</p></div><button className="text-button icon-button" onClick={onCustomers}>Ver clientes <Icon name="arrow" /></button></div>
            {customers.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Código</th><th scope="col">Cliente</th><th scope="col">Gasto acumulado</th><th scope="col">Visitas en 6 meses</th><th scope="col">Antigüedad</th><th scope="col">Segmento</th></tr></thead><tbody>{customers.slice(0, 5).map((customer) => <tr key={customer.id}><td><span className="code">{customer.id}</span></td><td className="customer-name">{customer.nombre}</td><td>{money(customer.gastoAcumulado)}</td><td>{customer.visitas6Meses}</td><td>{customer.antiguedadMeses} meses</td><td><span className={`segment-tag ${customer.segmento !== undefined ? 'assigned' : ''}`}>{customer.segmento !== undefined ? `Segmento ${customer.segmento}` : 'Sin asignar'}</span></td></tr>)}</tbody></table></div> : <div className="empty"><p>Agrega un cliente para comenzar.</p><button className="primary" onClick={onCustomers}>Registrar cliente</button></div>}
            <p className="table-footer">{Math.min(customers.length, 5)} de {customers.length} clientes · Los indicadores incluyen todos los registros.</p>
          </section>
          </div>
          <p className="dashboard-footnote"><span className="live-dot" /> Indicadores calculados a partir de los clientes guardados. Se actualizan al modificar sus datos.</p>
        </>
      )}
    </>
  );
}
