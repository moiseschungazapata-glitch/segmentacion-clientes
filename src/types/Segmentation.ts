import type { Customer } from './Customer';

export interface SegmentationGroup {
  id: number;
  cantidad: number;
  gastoPromedio: number;
  visitasPromedio: number;
  antiguedadPromedio: number;
}

export interface SegmentationSummary {
  k: number;
  fechaEjecucion: string;
  cantidadProcesada: number;
  grupos: SegmentationGroup[];
}

export interface SegmentationResult extends SegmentationSummary {
  modo: 'kmeans';
  clientes: Customer[];
  centroides: { id: number; valores: number[]; estandarizados: number[] }[];
  escalado: { medias: number[]; desviaciones: number[] };
  inercia: number;
  iteraciones: number;
  convergio: boolean;
  configuracion: { semilla: number; inicializaciones: number; maxIteraciones: number };
}
