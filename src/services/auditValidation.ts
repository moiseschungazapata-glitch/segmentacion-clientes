import type { SegmentationAuditRecord } from '../types/SegmentationAudit';

/** Lee la auditoría de resultados K-Means existentes, sin crear una ejecución nueva. */
export function parseSegmentationAudit(value: unknown): SegmentationAuditRecord {
  const invalid = () => new Error('No se pudo leer la auditoría guardada. Sus datos no tienen un formato válido.');
  if (typeof value !== 'object' || value === null) throw invalid();
  const record = value as Record<string, unknown>;
  if (record.modo !== 'kmeans' || typeof record.fechaEjecucion !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(record.fechaEjecucion) || !Number.isFinite(Date.parse(record.fechaEjecucion))) throw invalid();
  if (typeof record.k !== 'number' || !Number.isInteger(record.k) || record.k < 2 || record.k > 5) throw invalid();
  if (typeof record.cantidadProcesada !== 'number' || !Number.isInteger(record.cantidadProcesada) || record.cantidadProcesada < record.k) throw invalid();
  return { fechaEjecucion: record.fechaEjecucion, cantidadProcesada: record.cantidadProcesada, k: record.k };
}
