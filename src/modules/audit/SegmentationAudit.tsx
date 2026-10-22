import { useEffect, useId, useState } from 'react';
import type { SegmentationAudit as Audit } from '../../types/SegmentationAudit';
import { getSegmentationAudit } from '../../services/auditService';
import { CUSTOMERS_CHANGED_EVENT, SEGMENTATION_STORAGE_KEY } from '../../services/customerService';
import './audit.css';

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' });
const timeFormat = new Intl.DateTimeFormat('es-CO', { timeStyle: 'medium', timeZone: 'America/Bogota' });

export default function SegmentationAudit() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState('');
  const titleId = useId();

  function refresh() {
    try { setAudit(getSegmentationAudit()); setError(''); }
    catch (cause) {
      setAudit(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar la auditoría.');
    }
  }

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SEGMENTATION_STORAGE_KEY || event.key === 'segmentacion-clientes.customers') refresh();
    };
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <section className="card audit-card" aria-labelledby={titleId}>
      <div className="audit-heading"><div><h2 id={titleId}>Auditoría de segmentación</h2><p>Última ejecución exitosa guardada.</p></div>{audit && <span className={`audit-state ${audit.vigente ? 'audit-current' : 'audit-outdated'}`}>{audit.vigente ? 'Resultado vigente' : 'Requiere recalcular'}</span>}</div>
      {error ? <div className="audit-error" role="alert"><p>{error}</p><button onClick={refresh}>Volver a consultar auditoría</button></div> : audit ? <>
        <dl className="audit-fields"><div><dt>Fecha de ejecución</dt><dd><time dateTime={audit.fechaEjecucion}>{dateFormat.format(new Date(audit.fechaEjecucion))}</time></dd></div><div><dt>Hora (Bogotá, UTC−5)</dt><dd><time dateTime={audit.fechaEjecucion}>{timeFormat.format(new Date(audit.fechaEjecucion))}</time></dd></div><div><dt>Registros procesados</dt><dd>{audit.cantidadProcesada} clientes</dd></div><div><dt>K utilizado</dt><dd>{audit.k} segmentos</dd></div></dl>
        {!audit.vigente && <p className="audit-note">Se conserva el registro de la ejecución anterior. Vuelve a ejecutar K-Means para obtener un resultado vigente con los datos actuales.</p>}
      </> : <p className="audit-empty">Aún no hay ejecuciones guardadas. La fecha, la hora y la cantidad procesada aparecerán al completar la primera segmentación.</p>}
    </section>
  );
}
