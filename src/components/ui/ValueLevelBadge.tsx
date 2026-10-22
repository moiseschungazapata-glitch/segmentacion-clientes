import { classifyValue } from '../../modules/recommendations/recommendationRules';
import './valueLevel.css';

export default function ValueLevelBadge({ value, baseline }: { value: number; baseline: number }) {
  const level = classifyValue(value, baseline);
  const labels = { superior: 'Alto', similar: 'Medio', inferior: 'Bajo' };
  const descriptions = { superior: 'Más del 15 % por encima del promedio general', similar: 'Dentro del 15 % por encima o por debajo del promedio general', inferior: 'Más del 15 % por debajo del promedio general' };
  return <em className={`value-level value-level-${level}`} title={descriptions[level]}>{labels[level]}</em>;
}
