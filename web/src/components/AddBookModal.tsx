import { useState } from 'react';
import Modal from './Modal';

export default function AddBookModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (title: string, author: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('Please enter both a title and an author.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onAdd(title.trim(), author.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add book.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add a book" onClose={onClose} testid="add-book-modal">
      <form onSubmit={submit} className="modal-form" data-testid="add-book-form">
        <label className="field">
          <span className="field-label">Title</span>
          <input data-testid="add-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dune" autoFocus required />
        </label>
        <label className="field">
          <span className="field-label">Author</span>
          <input data-testid="add-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Frank Herbert" required />
        </label>
        <p className="field-note">New books start in <strong>Want to Read</strong>.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy} data-testid="add-submit">
            {busy ? 'Adding…' : 'Add to shelf'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
