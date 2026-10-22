import type { Customer } from '../types/Customer';
import type { SegmentationResult } from '../types/Segmentation';
import { validateSegmentationInput } from './segmentationValidation.ts';

const SEED = 42;
const N_INIT = 10;
const MAX_ITERATIONS = 300;
const distance = (a: number[], b: number[]) => a.reduce((sum, value, j) => sum + (value - b[j]) ** 2, 0);

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Estandarización poblacional (ddof=0); las columnas constantes quedan en cero. */
export function standardize(points: number[][]) {
  const maxima = [0, 1, 2].map((j) => points.reduce((max, row) => Math.max(max, Math.abs(row[j])), 0) || 1);
  const normalized = points.map((row) => row.map((value, j) => value / maxima[j]));
  const means = maxima.map((_, j) => normalized.every((row) => row[j] === normalized[0][j]) ? normalized[0][j] : normalized.reduce((sum, row) => sum + row[j] / points.length, 0));
  const deviations = maxima.map((_, j) => Math.sqrt(normalized.reduce((sum, row) => sum + (row[j] - means[j]) ** 2 / points.length, 0)));
  const scaled = normalized.map((row) => row.map((value, j) => deviations[j] === 0 ? 0 : (value - means[j]) / deviations[j]));
  return { scaled, means: means.map((value, j) => value * maxima[j]), deviations: deviations.map((value, j) => value * maxima[j]) };
}

function initialize(points: number[][], k: number, random: () => number): number[][] {
  const centers = [[...points[Math.floor(random() * points.length)]]];
  // K-Means++: probabilidad proporcional a la distancia cuadrática al centro más cercano.
  while (centers.length < k) {
    const distances = points.map((point) => Math.min(...centers.map((center) => distance(point, center))));
    const total = distances.reduce((sum, value) => sum + value, 0);
    if (total === 0) throw new Error('No hay suficientes perfiles distintos para el K seleccionado. Reduce K.');
    let threshold = random() * total;
    let selected = 0;
    for (let i = 0; i < distances.length; i += 1) if (distances[i] > 0) selected = i;
    for (let i = 0; i < distances.length; i += 1) {
      threshold -= distances[i];
      if (distances[i] > 0 && threshold <= 0) { selected = i; break; }
    }
    centers.push([...points[selected]]);
  }
  return centers;
}

function fit(points: number[][], k: number, random: () => number) {
  let centers = initialize(points, k, random);
  let labels = points.map(() => -1);
  let converged = false;
  let iterations = 0;
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const next = points.map((point) => {
      let closest = 0;
      for (let group = 1; group < k; group += 1) {
        if (distance(point, centers[group]) < distance(point, centers[closest])) closest = group;
      }
      return closest;
    });
    const counts = Array.from({ length: k }, (_, group) => next.filter((label) => label === group).length);
    // Recuperar grupos vacíos con el punto más lejano de un grupo no unitario.
    for (let group = 0; group < k; group += 1) {
      if (counts[group]) continue;
      let candidate = -1;
      let farthest = -1;
      points.forEach((point, i) => {
        const d = distance(point, centers[next[i]]);
        if (counts[next[i]] > 1 && d > farthest) { farthest = d; candidate = i; }
      });
      if (candidate < 0) throw new Error('No fue posible formar los grupos. Reduce el valor de K.');
      counts[next[candidate]] -= 1;
      next[candidate] = group;
      counts[group] += 1;
    }
    centers = Array.from({ length: k }, (_, group) => [0, 1, 2].map((j) => points.reduce((sum, point, i) => sum + (next[i] === group ? point[j] / counts[group] : 0), 0)));
    iterations = iteration + 1;
    converged = next.every((label, i) => label === labels[i]);
    labels = next;
    if (converged) break;
  }
  const inertia = points.reduce((sum, point, i) => sum + distance(point, centers[labels[i]]), 0);
  return { labels, centers, inertia, iterations, converged };
}

/** Lloyd con K-Means++, diez inicializaciones y semilla 42. */
export function calculateKMeans(customers: Customer[], k: number): SegmentationResult {
  validateSegmentationInput(customers, k);
  const points = customers.map((customer) => [customer.gastoAcumulado, customer.visitas6Meses, customer.antiguedadMeses]);
  if (new Set(points.map((row) => JSON.stringify(row))).size < k) {
    throw new Error(`Necesitas al menos ${k} perfiles numéricos distintos para formar ${k} grupos. Reduce K o registra clientes con otros valores.`);
  }
  const scaling = standardize(points);
  const random = randomGenerator(SEED);
  let best = fit(scaling.scaled, k, random);
  for (let initialization = 1; initialization < N_INIT; initialization += 1) {
    const candidate = fit(scaling.scaled, k, random);
    if (candidate.inertia < best.inertia) best = candidate;
  }
  const clientes = customers.map((customer, i) => ({ ...customer, segmento: best.labels[i] }));
  const grupos = Array.from({ length: k }, (_, id) => {
    const members = clientes.filter((customer) => customer.segmento === id);
    return { id, cantidad: members.length,
      gastoPromedio: members.reduce((sum, customer) => sum + customer.gastoAcumulado / members.length, 0),
      visitasPromedio: members.reduce((sum, customer) => sum + customer.visitas6Meses / members.length, 0),
      antiguedadPromedio: members.reduce((sum, customer) => sum + customer.antiguedadMeses / members.length, 0) };
  });
  return {
    modo: 'kmeans', k, fechaEjecucion: new Date().toISOString(), cantidadProcesada: clientes.length, clientes, grupos,
    centroides: grupos.map((group) => ({ id: group.id, valores: [group.gastoPromedio, group.visitasPromedio, group.antiguedadPromedio], estandarizados: best.centers[group.id] })),
    escalado: { medias: scaling.means, desviaciones: scaling.deviations },
    inercia: best.inertia, iteraciones: best.iterations, convergio: best.converged,
    configuracion: { semilla: SEED, inicializaciones: N_INIT, maxIteraciones: MAX_ITERATIONS },
  };
}
