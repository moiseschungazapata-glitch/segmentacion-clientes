import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import Icon from './Icon';

let openModals = 0;
let previousOverflow = '';

interface Props {
  title: string;
  description: string;
  children: ReactNode;
  onRequestClose: () => void;
  confirmation?: boolean;
  eyebrow?: string;
  closeLabel?: string;
  className?: string;
}

export default function Modal({ title, description, children, onRequestClose, confirmation = false, eyebrow, closeLabel, className = '' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement;
    if (openModals === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModals += 1;
    dialog.showModal();
    return () => {
      dialog.close();
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={`nova-modal ${confirmation ? 'confirmation-modal' : 'customer-modal'} ${className}`} role={confirmation ? 'alertdialog' : 'dialog'} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onRequestClose(); }}>
      <div className="modal-heading">
        <div><p className="modal-eyebrow">{eyebrow ?? (confirmation ? 'CONFIRMAR ACCIÓN' : 'DIRECTORIO DE CLIENTES')}</p><h2 id={titleId}>{title}</h2></div>
        <button type="button" className="modal-close" aria-label={closeLabel ?? (confirmation ? 'Cerrar confirmación' : 'Cerrar formulario')} onClick={onRequestClose}><Icon name="close" /></button>
      </div>
      <p className="modal-description" id={descriptionId}>{description}</p>
      {children}
    </dialog>
  );
}
