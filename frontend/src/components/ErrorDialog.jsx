import { AlertTriangle, X } from 'lucide-react';

export function ErrorDialog({ title = 'Recipe could not be saved', message, onClose }) {
  if (!message) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="error-dialog-title">
        <header>
          <AlertTriangle size={22} />
          <h2 id="error-dialog-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close error">
            <X size={18} />
          </button>
        </header>
        <p>{message}</p>
        <button type="button" className="primary-action" onClick={onClose}>Review recipe</button>
      </section>
    </div>
  );
}
