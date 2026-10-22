import type { Customer } from '../types/Customer';
import type { SegmentationResult } from '../types/Segmentation';
import { validateCustomer } from './customerValidation';
export { validateCustomer } from './customerValidation';

const STORAGE_KEY = 'segmentacion-clientes.customers';
const RESULT_KEY = 'segmentacion-clientes.segmentation';
export const SEGMENTATION_STORAGE_KEY = RESULT_KEY;
export const CUSTOMERS_CHANGED_EVENT = 'customers-updated';

/** Carga los datos iniciales solo la primera vez; respeta ediciones y eliminaciones. */
export function initializeCustomers(initialCustomers: Customer[]): void {
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  const customers = initialCustomers.map(normalizeCustomer);
  if (new Set(customers.map((customer) => customer.id)).size !== customers.length) {
    throw new Error('Los clientes iniciales contienen códigos duplicados.');
  }
  saveCustomers(customers);
}

function normalizeCustomer(customer: Customer): Customer {
  validateCustomer(customer);
  return { ...customer, id: customer.id.trim(), nombre: customer.nombre.trim() };
}

/** Consulta los clientes guardados; una instalación nueva empieza sin registros. */
export function getCustomers(): Customer[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return [];

  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    throw new Error('Los clientes guardados no contienen JSON válido.');
  }
  if (!Array.isArray(data)) {
    throw new Error('Los clientes guardados deben ser una lista.');
  }

  const customers = data.map((value: unknown, index: number) => {
    try {
      validateCustomer(value);
    } catch (cause) {
      const id = typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string' ? value.id.trim() : '';
      throw new Error(`Cliente ${id || `en la fila ${index + 1}`}: ${cause instanceof Error ? cause.message : 'Datos inválidos.'}`);
    }
    return normalizeCustomer(value);
  });
  if (new Set(customers.map((customer) => customer.id)).size !== customers.length) {
    throw new Error('Los datos guardados contienen códigos duplicados.');
  }
  return customers;
}

function saveCustomers(customers: Customer[], preserveSegments = false): void {
  // Los errores de almacenamiento se propagan para que la interfaz pueda mostrarlos.
  const records = preserveSegments ? customers : customers.map(({ segmento: _segment, ...customer }) => customer);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CUSTOMERS_CHANGED_EVENT));
  }
}

export const customerFingerprint = (customers: Customer[]) => JSON.stringify(customers.map(({ id, nombre, gastoAcumulado, visitas6Meses, antiguedadMeses }) => ({ id, nombre, gastoAcumulado, visitas6Meses, antiguedadMeses })));

/** Recupera solo resultados que coincidan con los datos y etiquetas actuales. */
export function getLastSegmentation(): SegmentationResult | null {
  const raw = localStorage.getItem(RESULT_KEY);
  if (!raw) return null;
  try {
    const result = JSON.parse(raw) as SegmentationResult;
    if (!result || result.modo !== 'kmeans' || !Array.isArray(result.clientes) || !Array.isArray(result.grupos) || !Array.isArray(result.centroides) || !result.escalado || !result.configuracion || !Number.isFinite(result.inercia) || !Number.isFinite(Date.parse(result.fechaEjecucion))) return null;
    const vector = (value: unknown): value is number[] => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
    if (!Number.isInteger(result.k) || !Number.isInteger(result.iteraciones) || result.iteraciones < 1 || typeof result.convergio !== 'boolean' || result.inercia < 0 || !vector(result.escalado.medias) || !vector(result.escalado.desviaciones)) return null;
    if (result.centroides.some((center, index) => !center || center.id !== index || !vector(center.valores) || !vector(center.estandarizados))) return null;
    if (![result.configuracion.semilla, result.configuracion.inicializaciones, result.configuracion.maxIteraciones].every(Number.isInteger)) return null;
    const customers = getCustomers();
    if (result.k < 2 || result.k > 5 || result.grupos.length !== result.k || result.centroides.length !== result.k || result.cantidadProcesada !== customers.length || customerFingerprint(result.clientes) !== customerFingerprint(customers)) return null;
    if (customers.some((customer, index) => customer.segmento === undefined || customer.segmento !== result.clientes[index].segmento)) return null;
    if (result.grupos.some((group, index) => group.id !== index || group.cantidad !== customers.filter((customer) => customer.segmento === index).length || ![group.gastoPromedio, group.visitasPromedio, group.antiguedadPromedio].every(Number.isFinite))) return null;
    return result;
  } catch { return null; }
}

/** Publica etiquetas y auditoría solo si aún coinciden con el directorio. */
export function saveSegmentationResult(result: SegmentationResult, snapshot: Customer[]): void {
  if (customerFingerprint(getCustomers()) !== customerFingerprint(snapshot) || customerFingerprint(result.clientes) !== customerFingerprint(snapshot)) {
    throw new Error('Los clientes cambiaron durante la ejecución. Vuelve a ejecutar.');
  }
  const previous = localStorage.getItem(RESULT_KEY);
  localStorage.setItem(RESULT_KEY, JSON.stringify(result));
  try { saveCustomers(result.clientes, true); }
  catch (cause) {
    if (previous === null) localStorage.removeItem(RESULT_KEY);
    else localStorage.setItem(RESULT_KEY, previous);
    throw cause;
  }
}

/** Registra un cliente con código único y devuelve el registro guardado. */
export function addCustomer(customer: Customer): Customer {
  const normalized = normalizeCustomer(customer);
  const customers = getCustomers();
  if (customers.some((item) => item.id === normalized.id)) {
    throw new Error('Ya existe un cliente con ese código.');
  }
  saveCustomers([...customers, normalized]);
  return normalized;
}

/** Reemplaza un cliente, permitiendo cambiar su código si el nuevo está disponible. */
export function updateCustomer(id: string, customer: Customer): Customer {
  const normalized = normalizeCustomer(customer);
  const customers = getCustomers();
  const index = customers.findIndex((item) => item.id === id.trim());
  if (index === -1) throw new Error('No se encontró el cliente que deseas actualizar.');
  if (customers.some((item, position) => position !== index && item.id === normalized.id)) {
    throw new Error('Ya existe un cliente con ese código.');
  }
  customers[index] = normalized;
  saveCustomers(customers);
  return normalized;
}

/** Elimina un cliente existente y conserva los demás registros. */
export function deleteCustomer(id: string): void {
  const customers = getCustomers();
  const remaining = customers.filter((customer) => customer.id !== id.trim());
  if (remaining.length === customers.length) {
    throw new Error('No se encontró el cliente que deseas eliminar.');
  }
  saveCustomers(remaining);
}
