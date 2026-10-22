import type { SegmentationAudit } from '../types/SegmentationAudit';
import { getLastSegmentation, SEGMENTATION_STORAGE_KEY } from './customerService';
import { parseSegmentationAudit } from './auditValidation';

/** Conserva la auditoría histórica aunque la edición de clientes invalide las etiquetas. */
export function getSegmentationAudit(): SegmentationAudit | null {
  const raw = localStorage.getItem(SEGMENTATION_STORAGE_KEY);
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('No se pudo leer la auditoría guardada. El contenido no es JSON válido.'); }
  const audit = parseSegmentationAudit(value);
  return { ...audit, vigente: getLastSegmentation() !== null };
}
