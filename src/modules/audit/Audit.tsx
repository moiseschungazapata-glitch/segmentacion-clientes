import Icon from '../../components/ui/Icon';
import SegmentationAudit from './SegmentationAudit';

export default function Audit({ onSegmentation }: { onSegmentation: () => void }) {
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">CONTROL DE EJECUCIONES</p><h1>Auditoría</h1><p>Consulta los datos de la última segmentación exitosa.</p></div>
        <button className="primary icon-button" onClick={onSegmentation}>Ir a segmentación <Icon name="arrow" /></button>
      </div>
      <SegmentationAudit />
    </>
  );
}
