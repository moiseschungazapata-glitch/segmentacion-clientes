export interface SegmentationAuditRecord {
  fechaEjecucion: string;
  cantidadProcesada: number;
  k: number;
}

export interface SegmentationAudit extends SegmentationAuditRecord {
  vigente: boolean;
}
