import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateKMeans, standardize } from '../src/services/kmeans.ts';
import { sampleCustomers } from '../src/modules/customers/sampleCustomers.ts';

const points = sampleCustomers.map(c => [c.gastoAcumulado, c.visitas6Meses, c.antiguedadMeses]);
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const squaredDistance = (a, b) => a.reduce((sum, value, j) => sum + (value - b[j]) ** 2, 0);

test('estandariza a media cero y varianza poblacional uno', () => {
  const { scaled, means } = standardize(points);
  close(means[0], 1206);
  close(means[1], 8.4);
  for (let j = 0; j < 3; j++) {
    close(scaled.reduce((sum, row) => sum + row[j], 0) / 5, 0);
    close(scaled.reduce((sum, row) => sum + row[j] ** 2, 0) / 5, 1);
  }
});

test('K=3 alcanza el óptimo global de los cinco clientes, comprobado enumerando particiones', () => {
  // Referencia independiente: estandarización directa y todas las asignaciones 3^5.
  const means = [0, 1, 2].map(j => points.reduce((s, p) => s + p[j], 0) / 5);
  const std = means.map((mean, j) => Math.sqrt(points.reduce((s, p) => s + (p[j] - mean) ** 2, 0) / 5));
  const x = points.map(p => p.map((value, j) => (value - means[j]) / std[j]));
  let optimum = Infinity;
  for (let assignment = 0; assignment < 3 ** 5; assignment++) {
    const labels = x.map((_, i) => Math.floor(assignment / 3 ** i) % 3);
    if (new Set(labels).size < 3) continue;
    const centers = [0, 1, 2].map(group => {
      const members = x.filter((_, i) => labels[i] === group);
      return [0, 1, 2].map(j => members.reduce((sum, p) => sum + p[j], 0) / members.length);
    });
    optimum = Math.min(optimum, x.reduce((sum, p, i) => sum + squaredDistance(p, centers[labels[i]]), 0));
  }
  const result = calculateKMeans(sampleCustomers, 3);
  close(result.inercia, optimum);
  assert.equal(result.convergio, true);
  assert.equal(result.clientes[3].segmento, result.clientes[4].segmento);
});

test('cada cliente está en el centro más cercano y cada centro es la media de su grupo', () => {
  const result = calculateKMeans(sampleCustomers, 3);
  const { scaled } = standardize(points);
  result.clientes.forEach((customer, i) => {
    const distances = result.centroides.map(center => squaredDistance(scaled[i], center.estandarizados));
    close(distances[customer.segmento], Math.min(...distances));
  });
  result.grupos.forEach(group => {
    const members = result.clientes.filter(c => c.segmento === group.id);
    close(group.gastoPromedio, members.reduce((s, c) => s + c.gastoAcumulado, 0) / members.length);
    assert.equal(group.cantidad, members.length);
    close(result.centroides[group.id].valores[0], group.gastoPromedio);
  });
});

test('K entre 2 y 5 produce exactamente K grupos no vacíos, K=5 tiene inercia cero', () => {
  for (const k of [2, 3, 4, 5]) {
    const result = calculateKMeans(sampleCustomers, k);
    assert.equal(new Set(result.clientes.map(c => c.segmento)).size, k);
    assert.equal(result.grupos.reduce((s, g) => s + g.cantidad, 0), 5);
    assert.ok(result.grupos.every(g => g.cantidad > 0));
    assert.ok(result.iteraciones <= 300);
    assert.ok(result.inercia >= 0);
    if (k === 5) close(result.inercia, 0);
  }
});

test('es reproducible y no altera los registros de entrada', () => {
  const before = structuredClone(sampleCustomers);
  const first = calculateKMeans(sampleCustomers, 3);
  const second = calculateKMeans(sampleCustomers, 3);
  assert.deepEqual(first.clientes, second.clientes);
  assert.deepEqual(first.centroides, second.centroides);
  assert.deepEqual(first.configuracion, { semilla: 42, inicializaciones: 10, maxIteraciones: 300 });
  assert.deepEqual(sampleCustomers, before);
});

test('nombres y códigos no influyen en las agrupaciones', () => {
  const changed = sampleCustomers.map((c, i) => ({ ...c, id: `X${i}`, nombre: `Otro nombre ${i}` }));
  assert.deepEqual(calculateKMeans(changed, 3).clientes.map(c => c.segmento), calculateKMeans(sampleCustomers, 3).clientes.map(c => c.segmento));
});

test('cambiar la unidad del gasto no cambia las agrupaciones estandarizadas', () => {
  const changed = sampleCustomers.map(c => ({ ...c, gastoAcumulado: c.gastoAcumulado * 100000 }));
  const first = calculateKMeans(sampleCustomers, 3);
  const second = calculateKMeans(changed, 3);
  close(first.inercia, second.inercia);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    assert.equal(first.clientes[i].segmento === first.clientes[j].segmento, second.clientes[i].segmento === second.clientes[j].segmento);
  }
});

test('columnas constantes, incluso siete repeticiones, quedan en cero', () => {
  const x = Array.from({ length: 7 }, (_, i) => [i, 1, 0]);
  const { scaled, deviations } = standardize(x);
  assert.ok(scaled.every(row => row[1] === 0 && row[2] === 0));
  assert.equal(deviations[1], 0);
  const customers = x.map((row, i) => ({ id: String(i), nombre: `Cliente ${i}`, gastoAcumulado: row[0], visitas6Meses: 1, antiguedadMeses: 0 }));
  assert.ok(Number.isFinite(calculateKMeans(customers, 3).inercia));
});

test('perfiles repetidos admiten K si hay suficientes perfiles distintos', () => {
  const input = [...sampleCustomers, { ...sampleCustomers[0], id: 'C006' }];
  assert.equal(calculateKMeans(input, 5).grupos.length, 5);
  const repeated = sampleCustomers.map(c => ({ ...c, gastoAcumulado: 1, visitas6Meses: 1, antiguedadMeses: 1 }));
  assert.throws(() => calculateKMeans(repeated, 3), /perfiles numéricos distintos/);
});

test('datos inválidos y K superior al número de clientes se rechazan antes del cálculo', () => {
  assert.throws(() => calculateKMeans(sampleCustomers.slice(0, 2), 3));
  assert.throws(() => calculateKMeans([{ ...sampleCustomers[0], gastoAcumulado: NaN }, ...sampleCustomers.slice(1)], 3));
});
