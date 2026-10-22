import { useState } from 'react';
import type { Customer } from '../../types/Customer';

const options = [
  { key: 'gastoAcumulado', label: 'Gasto', unit: 'S/', description: 'Gasto acumulado en soles' },
  { key: 'visitas6Meses', label: 'Visitas', unit: 'visitas', description: 'Visitas durante los últimos 6 meses' },
  { key: 'antiguedadMeses', label: 'Antigüedad', unit: 'meses', description: 'Antigüedad como cliente en meses' },
] as const;

export default function CustomerChart({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<(typeof options)[number]['key']>('gastoAcumulado');
  const option = options.find((item) => item.key === selected)!;
  const shown = customers.slice(0, 5);
  const maximum = Math.max(1, ...shown.map((customer) => customer[selected]));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const ceiling = step * 4;
  const format = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
  const valueLabel = (value: number) => selected === 'gastoAcumulado' ? `S/ ${format(value)}` : `${format(value)} ${option.unit}`;
  const ranked = [...customers].sort((a, b) => b[selected] - a[selected] || a.id.localeCompare(b.id)).slice(0, 5);

  return (
    <section className="card analysis-card" aria-labelledby="analysis-title">
      <div className="analysis-toolbar"><div><span className="section-overline">COMPORTAMIENTO DE COMPRA</span><h2 id="analysis-title">Análisis de clientes</h2></div><div className="chart-switch" role="group" aria-label="Variable del gráfico">{options.map((item) => <button key={item.key} aria-pressed={selected === item.key} onClick={() => setSelected(item.key)}>{item.label}</button>)}</div></div>
      {customers.length ? <div className="analysis-content">
        <figure className="customer-chart"><figcaption>{option.description}<span><i />{option.label} por cliente</span></figcaption>
          <div className="column-chart" role="img" aria-label={`${option.description}. ${shown.map((customer) => `${customer.nombre}: ${valueLabel(customer[selected])}`).join('; ')}`}>
            <div className="chart-grid" aria-hidden="true">{[4, 3, 2, 1, 0].map((tick) => <div key={tick}><span>{format(step * tick)}</span><i /></div>)}</div>
            <div className="chart-columns" aria-hidden="true">{shown.map((customer, index) => <div className="chart-column" key={customer.id}><div className="column-space"><div className={`column-bar bar-${index % 2}`} style={{ height: `${customer[selected] / ceiling * 100}%` }}><span>{format(customer[selected])}</span></div></div><strong>{customer.id}</strong><small>{customer.nombre.split(' ')[0]}</small></div>)}</div>
          </div>
          <p className="chart-note">Comparación de los primeros {shown.length} clientes · {option.unit}</p>
        </figure>
        <div className="customer-ranking"><h3>Mayor {option.label.toLowerCase()}</h3><p>Clientes ordenados por {option.label.toLowerCase()}.</p><ol>{ranked.map((customer, index) => <li key={customer.id}><span className={`rank-number ${index === 0 ? 'rank-first' : ''}`}>{index + 1}</span><div><strong>{customer.nombre}</strong><small>{customer.id}</small></div><span className="ranking-value">{valueLabel(customer[selected])}</span></li>)}</ol></div>
      </div> : <div className="empty"><h3>No hay datos para comparar</h3><p>Registra tus clientes para visualizar sus hábitos de compra.</p></div>}
    </section>
  );
}
