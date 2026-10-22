import Modal from './Modal';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({ title, description, confirmLabel, cancelLabel = 'Volver', danger = false, error, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} description={description} onRequestClose={onCancel} confirmation>
      <div className={`confirmation-notice ${danger ? 'confirmation-danger' : ''}`}><span aria-hidden="true">{danger ? '!' : '?'}</span><p>{danger ? 'Confirma solo si deseas continuar con esta acción.' : 'Revisa tu decisión antes de continuar.'}</p></div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" autoFocus onClick={onCancel}>{cancelLabel}</button><button type="button" className={danger ? 'danger-solid' : 'primary'} onClick={onConfirm}>{confirmLabel}</button></div>
    </Modal>
  );
}
