import { useState } from 'react';
import Modal from './Modal';
import StarRating from './StarRating';
import type { Book } from '../types';

// Rating a book marks it FINISHED (ratings are only allowed on finished books) and
// records a 1–5 score.
export default function RateBookModal({
  book,
  onClose,
  onRate,
}: {
  book: Book;
  onClose: () => void;
  onRate: (rating: number) => Promise<void>;
}) {
  const [rating, setRating] = useState<number>(book.rating ?? 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please choose between 1 and 5 stars.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onRate(rating);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rating.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Rate this book" onClose={onClose} testid="rate-book-modal">
      <form onSubmit={submit} className="modal-form" data-testid="rate-book-form">
        <div className="rate-book-head">
          <p className="rate-book-title">{book.title}</p>
          <p className="rate-book-author">{book.author}</p>
        </div>
        {book.status !== 'FINISHED' && (
          <p className="field-note">Rating will mark this book as <strong>Finished</strong>.</p>
        )}
        <div className="rate-stars" data-testid="rate-stars">
          <StarRating value={rating || null} onChange={setRating} size={40} label="Choose a rating" />
          <span className="rate-value">{rating ? `${rating} / 5` : 'Tap a star'}</span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy} data-testid="rate-submit">
            {busy ? 'Saving…' : 'Save rating'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
