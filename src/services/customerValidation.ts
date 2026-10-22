import type { Customer } from '../types/Customer';

export function validateCustomer(value: unknown): asserts value is Customer {
  if (typeof value !== 'object' || value === null) {
    throw new Error('El cliente no tiene un formato válido.');
  }
  const customer = value as Record<string, unknown>;
  if (typeof customer.id !== 'string' || !customer.id.trim()) {
    throw new Error('El código del cliente es obligatorio.');
  }
  if (typeof customer.nombre !== 'string' || !customer.nombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio.');
  }
  const fields = { gastoAcumulado: 'El gasto acumulado', visitas6Meses: 'Las visitas en 6 meses', antiguedadMeses: 'La antigüedad en meses' };
  for (const [field, label] of Object.entries(fields)) {
    const number = customer[field];
    if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) {
      throw new Error(`${label} debe ser un número válido mayor o igual a cero.`);
    }
  }
  if (customer.segmento !== undefined && (typeof customer.segmento !== 'number' || !Number.isInteger(customer.segmento) || customer.segmento < 0)) {
    throw new Error('El segmento debe ser un número entero mayor o igual a cero.');
  }
}
