import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecommendations } from '../src/modules/recommendations/recommendationRules.ts';
import { calculateKMeans } from '../src/services/kmeans.ts';
import { sampleCustomers } from '../src/modules/customers/sampleCustomers.ts';

const group = (id, cantidad, gastoPromedio, visitasPromedio, antiguedadPromedio = 12) => ({ id, cantidad, gastoPromedio, visitasPromedio, antiguedadPromedio });

test('cada segmento real obtiene una propuesta sustentada en los tres promedios', () => {
  const result = calculateKMeans(sampleCustomers, 3);
  const recommendations = getRecommendations(result.grupos);
  assert.equal(recommendations.length, 3);
  assert.ok(recommendations.every(r => r.title && r.proposal && r.tenureAction && r.metrics.length === 3));
  assert.equal(recommendations.find(r => r.segmentId === 0).title, 'Incentivar la frecuencia de visita');
  assert.ok(Math.abs(recommendations[0].metrics[0].baseline - 1206) < 1e-9);
});

test('la comparación general pondera por clientes y no por número de grupos', () => {
  const result = getRecommendations([group(0, 9, 100, 1), group(1, 1, 1000, 10)]);
  assert.equal(result[0].metrics[0].baseline, 190);
  assert.equal(result[0].metrics[1].baseline, 1.9);
});

test('cambiar los números de los segmentos no modifica las propuestas', () => {
  const groups = [group(0, 2, 200, 2, 4), group(1, 3, 2000, 12, 24)];
  const first = getRecommendations(groups);
  const second = getRecommendations(groups.map(g => ({ ...g, id: g.id + 7 })));
  assert.deepEqual(first.map(({ segmentId, ...r }) => r), second.map(({ segmentId, ...r }) => r));
});

test('cero gasto y cero visitas llevan a revisar información sin atribuir hábitos', () => {
  const result = getRecommendations([group(0, 2, 0, 0, 0), group(1, 3, 0, 0, 0)]);
  assert.ok(result.every(r => r.title === 'Conocer mejor los hábitos de compra'));
  assert.ok(result.every(r => r.metrics.every(m => Number.isFinite(m.baseline) && m.level === 'similar')));
  assert.deepEqual(getRecommendations([]), []);
});

test('exactamente el 15% se mantiene en el intervalo comparable', () => {
  const result = getRecommendations([group(0, 1, 115, 1), group(1, 1, 85, 1)]);
  assert.equal(result[0].metrics[0].level, 'similar');
  assert.equal(result[1].metrics[0].level, 'similar');
});

test('gasto alto con pocas visitas y gasto bajo con visitas altas generan acciones distintas', () => {
  const result = getRecommendations([group(0, 1, 2000, 1), group(1, 1, 100, 20)]);
  assert.equal(result[0].title, 'Estimular una próxima visita');
  assert.equal(result[1].title, 'Explorar compras complementarias');
});

test('las reglas no modifican los grupos ni sus estadísticas', () => {
  const groups = [group(0, 2, 200, 2, 4), group(1, 3, 2000, 12, 24)];
  const before = structuredClone(groups);
  getRecommendations(groups);
  assert.deepEqual(groups, before);
});
