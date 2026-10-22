import type { Customer } from '../types/Customer';
import type { SegmentationResult } from '../types/Segmentation';
import { calculateKMeans } from './kmeans';
import { validateSegmentationInput } from './segmentationValidation';
export { validateSegmentationInput } from './segmentationValidation';

export async function runSegmentation(customers: Customer[], k: number, options: { signal?: AbortSignal } = {}): Promise<SegmentationResult> {
  validateSegmentationInput(customers, k);
  const snapshot = customers.map((customer) => ({ ...customer }));
  // Ceder al navegador permite mostrar la carga antes del cálculo local.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (options.signal?.aborted) throw new DOMException('La ejecución se canceló.', 'AbortError');
  const result = calculateKMeans(snapshot, k);
  if (options.signal?.aborted) throw new DOMException('La ejecución se canceló.', 'AbortError');
  return result;
}
