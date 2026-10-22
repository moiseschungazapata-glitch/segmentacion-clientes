import { validateCustomer } from './customerValidation.ts';

export interface SegmentationValidation {
  isValid: boolean;
  total: number;
  validCustomers: number;
  kValid: boolean;
  recordsValid: boolean;
  uniqueCodes: boolean;
  enoughCustomers: boolean;
  issues: string[];
}

/** Inspecciona datos externos sin convertir cadenas ni descartar registros inválidos. */
export function inspectSegmentationInput(input: unknown, k: unknown): SegmentationValidation {
  const issues: string[] = [];
  const kValid = typeof k === 'number' && Number.isInteger(k) && k >= 2 && k <= 5;
  if (!kValid) issues.push('Selecciona un valor entero de K entre 2 y 5.');
  const customers = Array.isArray(input) ? Array.from(input) : [];
  if (!Array.isArray(input)) issues.push('Los datos de clientes deben ser una lista.');
  else if (!customers.length) issues.push('No hay clientes para analizar. Registra clientes antes de ejecutar.');

  const occurrences = new Map<string, number>();
  const validCodes: string[] = [];
  let validRecords = 0;
  customers.forEach((value: unknown, index: number) => {
    const id = typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string' ? value.id.trim() : '';
    if (id) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
    try {
      validateCustomer(value);
      validRecords += 1;
      validCodes.push(value.id.trim());
    } catch (cause) {
      issues.push(`Cliente ${id || `en la fila ${index + 1}`}: ${cause instanceof Error ? cause.message : 'Datos inválidos.'}`);
    }
  });
  const duplicates = [...occurrences].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicates.length) issues.push(`Existen códigos de cliente duplicados: ${duplicates.join(', ')}. Cada cliente debe tener un código único.`);
  const validCustomers = validCodes.filter((id) => !duplicates.includes(id)).length;
  const enoughCustomers = kValid && validCustomers >= k;
  if (kValid && customers.length > 0 && !enoughCustomers) {
    issues.push(`Necesitas al menos ${k} clientes válidos para K=${k}. Actualmente tienes ${validCustomers}.`);
  }
  return {
    isValid: issues.length === 0,
    total: customers.length, validCustomers, kValid,
    recordsValid: customers.length > 0 && validRecords === customers.length,
    uniqueCodes: customers.length > 0 && occurrences.size === customers.length && duplicates.length === 0,
    enoughCustomers, issues,
  };
}

export function validateSegmentationInput(customers: unknown, k: unknown): void {
  const validation = inspectSegmentationInput(customers, k);
  if (!validation.isValid) throw new Error(validation.issues.join('\n'));
}
