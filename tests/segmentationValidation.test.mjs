import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSegmentationInput, validateSegmentationInput } from '../src/services/segmentationValidation.ts';

const customers = [
  { id: 'C001', nombre: 'Ana Torres', gastoAcumulado: 1800, visitas6Meses: 12, antiguedadMeses: 24 },
  { id: 'C002', nombre: 'Luis Rojas', gastoAcumulado: 2200, visitas6Meses: 15, antiguedadMeses: 30 },
  { id: 'C003', nombre: 'Marta Díaz', gastoAcumulado: 1600, visitas6Meses: 10, antiguedadMeses: 18 },
  { id: 'C004', nombre: 'José Vega', gastoAcumulado: 180, visitas6Meses: 2, antiguedadMeses: 3 },
  { id: 'C005', nombre: 'Rosa León', gastoAcumulado: 250, visitas6Meses: 3, antiguedadMeses: 5 },
];

test('los cinco clientes permiten todos los valores de K autorizados', () => {
  for (const k of [2, 3, 4, 5]) {
    const report = inspectSegmentationInput(customers, k);
    assert.equal(report.isValid, true);
    assert.equal(report.validCustomers, 5);
    assert.doesNotThrow(() => validateSegmentationInput(customers, k));
  }
});

test('K debe ser un número entero, sin convertir cadenas', () => {
  for (const k of [1, 6, 2.5, '3', null, undefined, NaN, Infinity]) {
    assert.throws(() => validateSegmentationInput(customers, k), /K entre 2 y 5/);
  }
});

test('dos clientes bloquean K=3 y permiten K=2', () => {
  assert.throws(() => validateSegmentationInput(customers.slice(0, 2), 3), /Actualmente tienes 2/);
  assert.doesNotThrow(() => validateSegmentationInput(customers.slice(0, 2), 2));
});

test('lista vacía, estructura incorrecta y huecos no se consideran clientes válidos', () => {
  for (const value of [[], null, undefined, {}, 'clientes', [null, null], Array(3)]) {
    const report = inspectSegmentationInput(value, 2);
    assert.equal(report.isValid, false);
    assert.equal(report.validCustomers, 0);
    assert.throws(() => validateSegmentationInput(value, 2));
  }
});

test('todos los campos son obligatorios', () => {
  for (const field of ['id', 'nombre', 'gastoAcumulado', 'visitas6Meses', 'antiguedadMeses']) {
    const invalid = { ...customers[0] };
    delete invalid[field];
    assert.throws(() => validateSegmentationInput([invalid, ...customers.slice(1)], 3));
  }
  for (const field of ['id', 'nombre']) {
    assert.throws(() => validateSegmentationInput([{ ...customers[0], [field]: '   ' }, ...customers.slice(1)], 3));
  }
});

test('cada variable rechaza negativos, texto, nulos y valores no finitos', () => {
  for (const field of ['gastoAcumulado', 'visitas6Meses', 'antiguedadMeses']) {
    for (const value of [-1, '', '12', null, undefined, NaN, Infinity, -Infinity]) {
      const input = [{ ...customers[0], [field]: value }, ...customers.slice(1)];
      const report = inspectSegmentationInput(input, 3);
      assert.equal(report.isValid, false);
      assert.equal(report.validCustomers, 4);
      assert.match(report.issues.join(' '), /C001/);
    }
  }
});

test('los valores cero son válidos y no se confunden con datos faltantes', () => {
  const input = customers.map(customer => ({ ...customer, gastoAcumulado: 0, visitas6Meses: 0, antiguedadMeses: 0 }));
  assert.doesNotThrow(() => validateSegmentationInput(input, 5));
});

test('los códigos duplicados se detectan también con espacios', () => {
  const input = [{ ...customers[0] }, { ...customers[1], id: ' C001 ' }, ...customers.slice(2)];
  const report = inspectSegmentationInput(input, 3);
  assert.equal(report.uniqueCodes, false);
  assert.equal(report.validCustomers, 3);
  assert.match(report.issues.join(' '), /duplicados: C001/);
  assert.throws(() => validateSegmentationInput(input, 3));
});

test('no se ignoran clientes inválidos aunque queden al menos K válidos', () => {
  const input = [{ ...customers[0], gastoAcumulado: -1 }, ...customers.slice(1)];
  const report = inspectSegmentationInput(input, 3);
  assert.equal(report.enoughCustomers, true);
  assert.equal(report.isValid, false);
  assert.throws(() => validateSegmentationInput(input, 3));
});

test('reporta varios clientes incorrectos y no modifica sus datos', () => {
  const input = [{ ...customers[0], gastoAcumulado: -1 }, { ...customers[1], nombre: '' }, ...customers.slice(2)];
  const before = structuredClone(input);
  const report = inspectSegmentationInput(input, 3);
  assert.match(report.issues.join(' '), /C001/);
  assert.match(report.issues.join(' '), /C002/);
  assert.deepEqual(input, before);
});
