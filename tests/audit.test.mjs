import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSegmentationAudit } from '../src/services/auditValidation.ts';

const record = { modo: 'kmeans', fechaEjecucion: '2026-10-22T02:30:12.345Z', cantidadProcesada: 5, k: 3 };

test('auditoría conserva exactamente fecha, cantidad y K de la ejecución guardada', () => {
  assert.deepEqual(parseSegmentationAudit(record), { fechaEjecucion: record.fechaEjecucion, cantidadProcesada: 5, k: 3 });
});

test('auditoría rechaza registros ausentes o de simulaciones anteriores', () => {
  for (const value of [null, undefined, [], {}, 'dato', { ...record, modo: 'simulacion' }]) {
    assert.throws(() => parseSegmentationAudit(value), /auditoría/);
  }
});

test('auditoría exige fecha válida guardada en UTC', () => {
  for (const fechaEjecucion of ['', null, undefined, 123, 'ayer', '2026-10-22', '2026-99-22T02:30:00Z']) {
    assert.throws(() => parseSegmentationAudit({ ...record, fechaEjecucion }));
  }
});

test('auditoría rechaza cantidades y configuraciones inconsistentes', () => {
  for (const cantidadProcesada of [-1, 0, 2, 2.5, '5', NaN, Infinity]) {
    assert.throws(() => parseSegmentationAudit({ ...record, cantidadProcesada }));
  }
  for (const k of [1, 6, 3.5, '3', null]) assert.throws(() => parseSegmentationAudit({ ...record, k }));
});

test('auditoría no modifica el resultado original ni almacena datos de clientes', () => {
  const input = { ...record, clientes: [{ nombre: 'Ana Torres' }] };
  const before = structuredClone(input);
  const audit = parseSegmentationAudit(input);
  assert.deepEqual(input, before);
  assert.equal('clientes' in audit, false);
});
