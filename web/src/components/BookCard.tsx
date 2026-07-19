// A single book on the shelf: cover spine, title, author, status control, rating
// display, and delete. Status changes call PATCH; finishing a book opens the rate flow.
import StarRating from './StarRating';
import { STATUS_META } from '../types';
import type { Book, BookStatus } from '../types';

const SPINE_COLORS = ['#8b5e34', '#5a7d6f', '#9c6b4f', '#4f6d8b', '#8b5170', '#6b6f3f'];

export default function BookCard({
  book,
  onStatusChange,
  onRate,
  onDelete,
  busy,
}: {
  book: Book;
  onStatusChange: (status: BookStatus) => void;
  onRate: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  const spine = SPINE_COLORS[book.id % SPINE_COLORS.length];
  return (
    <article className="book-card" data-testid="book-card" data-status={book.status}>
      <div className="book-cover" style={{ background: `linear-gradient(135deg, ${spine}, ${spine}cc)` }} aria-hidden="true">
        <span className="book-cover-title">{book.title}</span>
      </div>
      <div className="book-body">
        <div className="book-head">
          <h3 className="book-title" data-testid="book-title">{book.title}</h3>
          <p className="book-author">{book.author}</p>
        </div>

        <div className="book-rating-row">
          {book.status === 'FINISHED' ? (
            <button type="button" className="rating-trigger" onClick={onRate} data-testid="book-rate">
              <StarRating value={book.rating} size={18} />
              <span className="rating-hint">{book.rating ? 'Edit rating' : 'Rate this'}</span>
            </button>
          ) : (
            <span className="rating-locked">Rate once finished</span>
          )}
        </div>

        <div className="book-actions">
          <label className="status-select">
            <span className="visually-hidden">Status</span>
            <select
              value={book.status}
              disabled={busy}
              data-testid="book-status"
              onChange={(e) => onStatusChange(e.target.value as BookStatus)}
            >
              {(Object.keys(STATUS_META) as BookStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-icon-danger" onClick={onDelete} disabled={busy} data-testid="book-delete" aria-label={`Delete ${book.title}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
