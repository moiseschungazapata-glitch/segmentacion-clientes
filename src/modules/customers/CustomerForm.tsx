import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Customer } from '../../types/Customer';
import Modal from '../../components/ui/Modal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';

interface Props {
  customer: Customer | null;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
}

export default function CustomerForm({ customer, onSave, onCancel }: Props) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'save' | 'discard' | null>(null);
  const [draft, setDraft] = useState<Customer | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (field: string) => String(values.get(field) ?? '').trim();
    if (['id', 'nombre', 'gastoAcumulado', 'visitas6Meses', 'antiguedadMeses'].some((field) => !text(field))) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setError('');
    setDraft({
        ...customer,
        id: text('id'), nombre: text('nombre'),
        gastoAcumulado: Number(text('gastoAcumulado')),
        visitas6Meses: Number(text('visitas6Meses')),
        antiguedadMeses: Number(text('antiguedadMeses')),
    });
    setPending('save');
  }

  function confirmSave() {
    if (!draft) return;
    try {
      onSave(draft);
    } catch (cause) {
      setPending(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cliente.');
    }
  }

  return (
    <Modal title={customer ? 'Editar cliente' : 'Nuevo cliente'} description={customer ? `Actualiza la información de ${customer.nombre}. Todos los campos son obligatorios.` : 'Completa los datos del cliente. Todos los campos son obligatorios y el código debe ser único.'} onRequestClose={() => setPending('discard')}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Código<input autoFocus name="id" required defaultValue={customer?.id} placeholder="C006" /></label>
          <label>Nombre<input name="nombre" required defaultValue={customer?.nombre} placeholder="Nombre y apellido" /></label>
          <label>Gasto acumulado (S/)<input name="gastoAcumulado" type="number" min="0" step="any" required defaultValue={customer?.gastoAcumulado} /></label>
          <label>Visitas en 6 meses<input name="visitas6Meses" type="number" min="0" step="1" required defaultValue={customer?.visitas6Meses} /></label>
          <label>Antigüedad (meses)<input name="antiguedadMeses" type="number" min="0" step="1" required defaultValue={customer?.antiguedadMeses} /></label>
        </div>
        {error && <p role="alert" className="notice error">{error}</p>}
        <p className="form-hint">El gasto, las visitas y la antigüedad deben ser mayores o iguales a cero.</p>
        <div className="modal-actions"><button type="button" onClick={() => setPending('discard')}>Cancelar</button><button className="primary" type="submit">Guardar cliente</button></div>
      </form>
      {pending === 'save' && <ConfirmationDialog title={customer ? '¿Guardar los cambios?' : '¿Registrar este cliente?'} description={`Se ${customer ? 'actualizarán' : 'guardarán'} los datos de ${draft?.nombre} (${draft?.id}).`} confirmLabel={customer ? 'Sí, guardar cambios' : 'Sí, registrar cliente'} cancelLabel="Seguir editando" onConfirm={confirmSave} onCancel={() => setPending(null)} />}
      {pending === 'discard' && <ConfirmationDialog title="¿Cancelar el formulario?" description="Al salir se descartará lo que hayas escrito sin guardar. Los datos guardados del cliente se conservarán." confirmLabel="Sí, descartar y salir" cancelLabel="Seguir editando" danger onConfirm={onCancel} onCancel={() => setPending(null)} />}
    </Modal>
  );
}
