// The shelf: book list + status filter tabs bound to ?status=, add flow via
// ?modal=add-book, rate flow via ?modal=rate&bookId=. All navigable state lives in the
// URL so filters and modals are deep-linkable / restorable on load.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { data } from '../lib/data';
import BookCard from '../components/BookCard';
import AddBookModal from '../components/AddBookModal';
import RateBookModal from '../components/RateBookModal';
import { STATUS_META } from '../types';
import type { Book, BookStatus } from '../types';

const FILTERS: { key: '' | BookStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'WANT_TO_READ', label: 'Want to Read' },
  { key: 'READING', label: 'Reading' },
  { key: 'FINISHED', label: 'Finished' },
];

function isStatus(v: string | null): v is BookStatus {
  return v === 'WANT_TO_READ' || v === 'READING' || v === 'FINISHED';
}

export default function ShelfPage() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();

  const statusParam = params.get('status');
  const activeStatus: BookStatus | null = isStatus(statusParam) ? statusParam : null;
  const modal = params.get('modal');
  const modalBookId = Number(params.get('bookId'));

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const list = await data.listBooks(token, activeStatus);
      setBooks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your shelf.');
    } finally {
      setLoading(false);
    }
  }, [token, activeStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter(next: '' | BookStatus) {
    const p = new URLSearchParams(params);
    if (next) p.set('status', next);
    else p.delete('status');
    setParams(p, { replace: true });
  }

  function openModal(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => p.set(k, v));
    setParams(p);
  }

  function closeModal() {
    const p = new URLSearchParams(params);
    p.delete('modal');
    p.delete('bookId');
    setParams(p);
  }

  async function addBook(title: string, author: string) {
    if (!token) return;
    await data.addBook(token, title, author);
    await load();
  }

  async function changeStatus(book: Book, status: BookStatus) {
    if (!token) return;
    setBusyId(book.id);
    try {
      // Moving a book to Finished routes into the rate flow.
      await data.updateBook(token, book.id, { status });
      if (status === 'FINISHED' && !book.rating) {
        openModal({ modal: 'rate', bookId: String(book.id) });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update book.');
    } finally {
      setBusyId(null);
    }
  }

  async function rateBook(book: Book, rating: number) {
    if (!token) return;
    await data.updateBook(token, book.id, { status: 'FINISHED', rating });
    await load();
  }

  async function removeBook(book: Book) {
    if (!token) return;
    setBusyId(book.id);
    try {
      await data.deleteBook(token, book.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const rateTarget = useMemo(
    () => books.find((b) => b.id === modalBookId),
    [books, modalBookId],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    books.forEach((b) => (c[b.status] = (c[b.status] || 0) + 1));
    return c;
  }, [books]);

  return (
    <div className="shelf-page">
      <div className="shelf-header">
        <div>
          <h1 className="page-title" data-testid="shelf-title">My Shelf</h1>
          <p className="page-sub">{books.length} book{books.length === 1 ? '' : 's'}{activeStatus ? ` · ${STATUS_META[activeStatus].label}` : ''}</p>
        </div>
        <button className="btn-primary btn-add-desktop" onClick={() => openModal({ modal: 'add-book' })} data-testid="add-book-open">
          + Add book
        </button>
      </div>

      <div className="filter-tabs" role="tablist" aria-label="Filter by status" data-testid="status-filter">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            role="tab"
            aria-selected={activeStatus === (f.key || null)}
            className={`filter-tab ${activeStatus === (f.key || null) ? 'is-active' : ''}`}
            onClick={() => setFilter(f.key)}
            data-testid={`filter-${f.key || 'all'}`}
          >
            {f.label}
            {f.key && counts[f.key] ? <span className="filter-count">{counts[f.key]}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="book-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="book-card skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="state-panel state-error" data-testid="shelf-error">
          <p>{error}</p>
          <button className="btn-ghost" onClick={load}>Try again</button>
        </div>
      ) : books.length === 0 ? (
        <div className="state-panel" data-testid="shelf-empty">
          <div className="empty-mark" aria-hidden="true">📖</div>
          <h2>{activeStatus ? `No ${STATUS_META[activeStatus].label.toLowerCase()} books` : 'Your shelf is empty'}</h2>
          <p>{activeStatus ? 'Try a different filter, or add a new book.' : 'Add your first book to start tracking your reading.'}</p>
          <button className="btn-primary" onClick={() => openModal({ modal: 'add-book' })}>+ Add a book</button>
        </div>
      ) : (
        <div className="book-grid" data-testid="book-list">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              busy={busyId === book.id}
              onStatusChange={(s) => changeStatus(book, s)}
              onRate={() => openModal({ modal: 'rate', bookId: String(book.id) })}
              onDelete={() => removeBook(book)}
            />
          ))}
        </div>
      )}

      {/* Floating add button for one-handed mobile use */}
      <button className="fab" onClick={() => openModal({ modal: 'add-book' })} data-testid="fab-add" aria-label="Add book">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {modal === 'add-book' && <AddBookModal onClose={closeModal} onAdd={addBook} />}
      {modal === 'rate' && rateTarget && (
        <RateBookModal book={rateTarget} onClose={closeModal} onRate={(r) => rateBook(rateTarget, r)} />
      )}
    </div>
  );
}
