import { useEffect, useState } from 'react';
import type { Customer } from '../../types/Customer';
import { addCustomer, deleteCustomer, getCustomers, initializeCustomers, updateCustomer, CUSTOMERS_CHANGED_EVENT } from '../../services/customerService';
import CustomerForm from './CustomerForm';
import { sampleCustomers } from './sampleCustomers';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import './customers.css';

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
type CustomerOrder = 'original' | 'spending-desc' | 'spending-asc' | 'visits-desc' | 'visits-asc';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [order, setOrder] = useState<CustomerOrder>('original');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    function refresh() {
      try {
        const latest = getCustomers();
        setCustomers(latest);
        setSegmentFilter((current) => current !== 'all' && current !== 'unassigned' && !latest.some((customer) => customer.segmento !== undefined && String(customer.segmento) === current) ? 'all' : current);
        setLoaded(true);
        setError('');
      } catch (cause) {
        setLoaded(false);
        setCustomers([]);
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los clientes.');
      }
    }
    try {
      initializeCustomers(sampleCustomers);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los clientes.');
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'segmentacion-clientes.customers') refresh();
    };
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CUSTOMERS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  function openForm(customer: Customer | null) {
    setEditing(customer);
    setFormOpen(true);
    setMessage('');
  }

  function save(customer: Customer) {
    if (editing) updateCustomer(editing.id, customer);
    else addCustomer(customer);
    setCustomers(getCustomers());
    setFormOpen(false);
    setError('');
    setMessage((editing ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.') + (customers.some((item) => item.segmento !== undefined) ? ' Vuelve a ejecutar la segmentación para actualizar los grupos.' : ''));
  }

  function remove(customer: Customer) {
    try {
      deleteCustomer(customer.id);
      setCustomers(getCustomers());
      if (editing?.id === customer.id) setFormOpen(false);
      setError('');
      setMessage('Cliente eliminado correctamente.' + (customers.some((item) => item.segmento !== undefined) ? ' Vuelve a ejecutar la segmentación para actualizar los grupos.' : ''));
      setPendingDelete(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'No se pudo eliminar el cliente.');
    }
  }

  const segments = [...new Set(customers.flatMap((customer) => customer.segmento === undefined ? [] : [customer.segmento]))].sort((a, b) => a - b);
  const filtered = customers.filter((customer) => {
    const matchesQuery = searchable(`${customer.id} ${customer.nombre}`).includes(searchable(query.trim()));
    const matchesSegment = segmentFilter === 'all' || (segmentFilter === 'unassigned' ? customer.segmento === undefined : customer.segmento === Number(segmentFilter));
    return matchesQuery && matchesSegment;
  });
  const sorted = [...filtered];
  if (order !== 'original') {
    const field = order.startsWith('spending') ? 'gastoAcumulado' : 'visitas6Meses';
    const direction = order.endsWith('asc') ? 1 : -1;
    sorted.sort((a, b) => direction * (a[field] - b[field]) || a.id.localeCompare(b.id, 'es', { numeric: true }));
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">DIRECTORIO COMERCIAL</p><h1>Clientes</h1><p>Consulta y administra la información de tus clientes.</p></div>
        <button className="primary" disabled={!loaded} onClick={() => openForm(null)}>+ Nuevo cliente</button>
      </div>
      {error && <p role="alert" className="notice error">{error}</p>}
      {message && <p role="status" className="notice success">{message}</p>}
      {formOpen && <CustomerForm key={editing?.id ?? 'new'} customer={editing} onSave={save} onCancel={() => setFormOpen(false)} />}
      {pendingDelete && <ConfirmationDialog title="¿Eliminar este cliente?" description={`Se eliminará a ${pendingDelete.nombre} (${pendingDelete.id}) de tus registros. Esta acción no se puede deshacer.`} confirmLabel="Sí, eliminar cliente" cancelLabel="Conservar cliente" danger error={deleteError} onConfirm={() => remove(pendingDelete)} onCancel={() => setPendingDelete(null)} />}
      <section className="card" aria-label="Directorio de clientes">
        <div className="table-toolbar">
          <div><h2>Listado de clientes <span className="count">{customers.length}</span></h2><p>Datos guardados en este navegador.</p></div>
          <div className="customer-filters">
            <label className="search">Buscar cliente<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o código…" /></label>
            <label>Filtrar por segmento<select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)} disabled={!loaded}><option value="all">Todos los segmentos</option><option value="unassigned">Sin asignar ({customers.filter((customer) => customer.segmento === undefined).length})</option>{segments.map((segment) => <option key={segment} value={String(segment)}>Segmento {segment} ({customers.filter((customer) => customer.segmento === segment).length})</option>)}</select></label>
            <label>Ordenar por<select value={order} onChange={(event) => setOrder(event.target.value as CustomerOrder)} disabled={!loaded}><option value="original">Orden de registro</option><option value="spending-desc">Gasto: mayor a menor</option><option value="spending-asc">Gasto: menor a mayor</option><option value="visits-desc">Visitas: mayor a menor</option><option value="visits-asc">Visitas: menor a mayor</option></select></label>
            {(query || segmentFilter !== 'all') && <button className="clear-customer-filters" type="button" onClick={() => { setQuery(''); setSegmentFilter('all'); }}>Limpiar filtros</button>}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Código</th><th scope="col">Cliente</th><th scope="col" aria-sort={order.startsWith('spending') ? (order.endsWith('asc') ? 'ascending' : 'descending') : undefined}>Gasto acumulado{order.startsWith('spending') && <span aria-hidden="true"> {order.endsWith('asc') ? '↑' : '↓'}</span>}</th><th scope="col" aria-sort={order.startsWith('visits') ? (order.endsWith('asc') ? 'ascending' : 'descending') : undefined}>Visitas en 6 meses{order.startsWith('visits') && <span aria-hidden="true"> {order.endsWith('asc') ? '↑' : '↓'}</span>}</th><th scope="col">Antigüedad</th><th scope="col">Segmento</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              {sorted.map((customer) => (
                <tr key={customer.id}>
                  <td><span className="code">{customer.id}</span></td><td className="customer-name">{customer.nombre}</td>
                  <td>{currency.format(customer.gastoAcumulado)}</td><td>{customer.visitas6Meses}</td><td>{customer.antiguedadMeses} meses</td>
                  <td><span className={`segment-tag ${customer.segmento !== undefined ? 'assigned' : ''}`}>{customer.segmento !== undefined ? `Segmento ${customer.segmento}` : 'Sin asignar'}</span></td>
                  <td><div className="row-actions"><button aria-label={`Editar a ${customer.nombre}`} onClick={() => openForm(customer)}>Editar</button><button className="danger" aria-label={`Eliminar a ${customer.nombre}`} onClick={() => { setDeleteError(''); setPendingDelete(customer); }}>Eliminar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loaded && filtered.length === 0 && <div className="empty"><h3>{customers.length ? 'Sin coincidencias' : 'Todavía no hay clientes'}</h3><p>{customers.length ? 'Prueba con otro nombre, código o segmento, o limpia los filtros.' : 'Selecciona “Nuevo cliente” para registrar uno.'}</p></div>}
        <p className="table-footer" role="status">{filtered.length} de {customers.length} clientes</p>
      </section>
      <p className="practice-note">La práctica comienza con los primeros 5 clientes del material: C001 a C005.</p>
    </>
  );
}
