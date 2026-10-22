import type { SegmentationGroup } from '../../types/Segmentation';

type Level = 'superior' | 'similar' | 'inferior';
const level = (value: number, baseline: number): Level => {
  const tolerance = Math.max(1, Math.abs(value), Math.abs(baseline)) * Number.EPSILON * 4;
  return value > baseline * 1.15 + tolerance ? 'superior' : value < baseline * 0.85 - tolerance ? 'inferior' : 'similar';
};

/** Reglas orientativas relativas al conjunto actual; el número del grupo no define el perfil. */
export function getRecommendations(groups: SegmentationGroup[]) {
  const total = groups.reduce((sum, group) => sum + group.cantidad, 0);
  if (!total) return [];
  const baseline = {
    gastoPromedio: groups.reduce((sum, group) => sum + group.gastoPromedio * (group.cantidad / total), 0),
    visitasPromedio: groups.reduce((sum, group) => sum + group.visitasPromedio * (group.cantidad / total), 0),
    antiguedadPromedio: groups.reduce((sum, group) => sum + group.antiguedadPromedio * (group.cantidad / total), 0),
  };
  return groups.map((group) => {
    const spending = level(group.gastoPromedio, baseline.gastoPromedio);
    const visits = level(group.visitasPromedio, baseline.visitasPromedio);
    const tenure = level(group.antiguedadPromedio, baseline.antiguedadPromedio);
    let title = 'Fortalecer la relación comercial';
    let proposal = 'Probar una campaña de beneficios por continuidad de compra y revisar si aumenta la participación del grupo.';
    if (group.gastoPromedio === 0 && group.visitasPromedio === 0) {
      title = 'Conocer mejor los hábitos de compra';
      proposal = 'Revisar la información registrada y ofrecer una invitación general a conocer el catálogo antes de definir una campaña específica.';
    } else if (spending === 'superior' && visits === 'superior') {
      title = 'Fidelización y reconocimiento';
      proposal = 'Proponer un programa de beneficios por compras recurrentes y acceso anticipado a novedades. Evaluar la respuesta antes de ampliar la campaña.';
    } else if (spending === 'superior' && visits !== 'superior') {
      title = 'Estimular una próxima visita';
      proposal = 'Probar una invitación a una próxima compra con beneficios de continuidad, manteniendo una propuesta acorde con el gasto acumulado del grupo.';
    } else if (spending === 'inferior' && visits !== 'inferior') {
      title = 'Explorar compras complementarias';
      proposal = 'Presentar combinaciones de productos y opciones complementarias que puedan aumentar el valor de compra, sin asumir preferencias individuales.';
    } else if (visits === 'inferior') {
      title = 'Incentivar la frecuencia de visita';
      proposal = 'Probar una campaña sencilla para motivar una nueva visita y comunicar beneficios de compra recurrente. La frecuencia baja no demuestra que el cliente esté inactivo.';
    }
    const tenureAction = tenure === 'inferior'
      ? 'La antigüedad media es menor que la del conjunto: reforzar la información sobre servicios y beneficios disponibles.'
      : tenure === 'superior'
        ? 'La antigüedad media es mayor que la del conjunto: reconocer la continuidad de la relación comercial.'
        : 'La antigüedad media es comparable a la del conjunto: mantener una comunicación de continuidad.';
    return {
      segmentId: group.id, quantity: group.cantidad, title, proposal, tenureAction,
      metrics: [
        { key: 'spending', label: 'Gasto acumulado', average: group.gastoPromedio, baseline: baseline.gastoPromedio, level: spending },
        { key: 'visits', label: 'Visitas en 6 meses', average: group.visitasPromedio, baseline: baseline.visitasPromedio, level: visits },
        { key: 'tenure', label: 'Antigüedad (meses)', average: group.antiguedadPromedio, baseline: baseline.antiguedadPromedio, level: tenure },
      ],
    };
  });
}
