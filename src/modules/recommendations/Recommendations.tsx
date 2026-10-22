import { useEffect, useState } from 'react';
import type { SegmentationResult } from '../../types/Segmentation';
import { CUSTOMERS_CHANGED_EVENT, getLastSegmentation, SEGMENTATION_STORAGE_KEY } from '../../services/customerService';
import Icon from '../../components/ui/Icon';
import { getRecommendations } from './recommendationRules';
import './recommendations.css';
import ValueLevelBadge from '../../components/ui/ValueLevelBadge';

const number = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const comparisons = { superior: 'Por encima del promedio', inferior: 'Por debajo del promedio', similar: 'Cerca del promedio' };

export default function Recommendations({ onSegmentation }: { onSegmentation: () => void }) {
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [error, setError] = useState('');
  function refresh() {
    try { setResult(getLastSegmentation()); setError(''); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los segmentos.'); }
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

  const recommendations = result ? getRecommendations(result.grupos) : [];
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">OPORTUNIDADES COMERCIALES</p><h1>Recomendaciones comerciales</h1><p>Propuestas basadas en los promedios de cada segmento.</p></div><button className="primary icon-button" onClick={onSegmentation}>Ir a segmentación <Icon name="arrow" /></button></div>
      {error ? <div className="notice error" role="alert">{error} <button onClick={refresh}>Volver a consultar</button></div> : !result ? <section className="card empty recommendations-empty"><span className="empty-illustration"><Icon name="ideas" /></span><h2>Primero necesitas una segmentación vigente</h2><p>Ejecuta K-Means con los clientes actuales para obtener propuestas por grupo. Si modificaste sus datos, vuelve a segmentarlos.</p><button className="primary" onClick={onSegmentation}>Ejecutar segmentación</button></section> : <>
        <div className="recommendations-context"><span>{recommendations.length} segmentos · {result.cantidadProcesada} clientes analizados</span><span>Última ejecución: {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(result.fechaEjecucion))}</span></div>
        <div className="recommendations-grid">{recommendations.map((recommendation) => <article className="card recommendation-card" key={recommendation.segmentId} aria-label={`Recomendación del segmento ${recommendation.segmentId}`}>
          <div className="recommendation-heading"><span className="recommendation-segment">Segmento {recommendation.segmentId}</span><span>{recommendation.quantity} {recommendation.quantity === 1 ? 'cliente' : 'clientes'}</span></div>
          <h2>{recommendation.title}</h2><p className="recommendation-proposal">{recommendation.proposal}</p>
          <div className="recommendation-evidence"><h3>¿En qué se basa?</h3><dl>{recommendation.metrics.map((metric) => <div key={metric.key}><dt>{metric.label}</dt><dd><strong>{metric.key === 'spending' ? 'S/ ' : ''}{number(metric.average)}</strong><ValueLevelBadge value={metric.average} baseline={metric.baseline} /><span>{comparisons[metric.level]}</span><small>Promedio general: {metric.key === 'spending' ? 'S/ ' : ''}{number(metric.baseline)}</small></dd></div>)}</dl></div>
          <p className="recommendation-tenure">{recommendation.tenureAction}</p>
        </article>)}</div>
        <p className="recommendation-disclaimer">Alto: más del 15 % sobre el promedio general. Medio: dentro del ±15 %. Bajo: más del 15 % por debajo. Estas etiquetas describen las variables del grupo, no el valor de una persona. Las propuestas comerciales son orientativas.</p>
      </>}
    </>
  );
}
