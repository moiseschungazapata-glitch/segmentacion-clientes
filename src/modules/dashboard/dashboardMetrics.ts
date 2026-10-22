import type { Customer } from '../../types/Customer';

export function getDashboardMetrics(customers: Customer[]) {
  const total = customers.length;
  const groups = new Map<number, Customer[]>();
  for (const customer of customers) {
    if (customer.segmento !== undefined) {
      const members = groups.get(customer.segmento) ?? [];
      members.push(customer);
      groups.set(customer.segmento, members);
    }
  }
  return {
    total,
    gastoPromedio: total ? customers.reduce((sum, customer) => sum + customer.gastoAcumulado, 0) / total : 0,
    visitasPromedio: total ? customers.reduce((sum, customer) => sum + customer.visitas6Meses, 0) / total : 0,
    sinSegmento: customers.filter((customer) => customer.segmento === undefined).length,
    groups: [...groups.entries()].sort(([a], [b]) => a - b).map(([id, members]) => ({
      id,
      cantidad: members.length,
      gastoPromedio: members.reduce((sum, customer) => sum + customer.gastoAcumulado, 0) / members.length,
      visitasPromedio: members.reduce((sum, customer) => sum + customer.visitas6Meses, 0) / members.length,
      antiguedadPromedio: members.reduce((sum, customer) => sum + customer.antiguedadMeses, 0) / members.length,
    })),
  };
}
