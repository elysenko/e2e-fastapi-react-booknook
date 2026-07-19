// Self-contained mock backend for the static preview. Persists to localStorage so
// every user journey (auth, shelf CRUD, filters, ratings, admin settings) works even
// when no FastAPI backend is running. The real data layer (lib/data.ts) tries the live
// /api endpoints first and falls back to these functions on network/HTTP failure.
import type { AuthResponse, Book, BookStatus, ServiceSetting, User } from '../types';

const USERS_KEY = 'booknook_mock_users';
const BOOKS_KEY = 'booknook_mock_books';
const SETTINGS_KEY = 'booknook_mock_settings';
const SEED_KEY = 'booknook_mock_seeded';

interface StoredUser extends User {
  password: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(items: { id: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
}

// Seed a demo admin account + a starter shelf on first run so the preview is populated.
function seed(): void {
  if (localStorage.getItem(SEED_KEY)) return;
  const demoUser: StoredUser = {
    id: 1,
    email: 'reader@booknook.app',
    password: 'password',
    is_admin: true,
    role: 'ADMIN',
    created_at: '2026-01-04T09:00:00Z',
  };
  const books: Book[] = [
    { id: 1, title: 'The Name of the Wind', author: 'Patrick Rothfuss', status: 'FINISHED', rating: 5, created_at: '2026-02-01T10:00:00Z' },
    { id: 2, title: 'Project Hail Mary', author: 'Andy Weir', status: 'READING', rating: null, created_at: '2026-03-12T10:00:00Z' },
    { id: 3, title: 'Piranesi', author: 'Susanna Clarke', status: 'FINISHED', rating: 4, created_at: '2026-03-20T10:00:00Z' },
    { id: 4, title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', status: 'WANT_TO_READ', rating: null, created_at: '2026-04-02T10:00:00Z' },
    { id: 5, title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', status: 'WANT_TO_READ', rating: null, created_at: '2026-04-18T10:00:00Z' },
  ];
  write(USERS_KEY, [demoUser]);
  write(BOOKS_KEY, books.map((b) => ({ ...b, owner_id: 1 })));
  write(SETTINGS_KEY, {});
  localStorage.setItem(SEED_KEY, '1');
}

seed();

function tokenFor(userId: number): string {
  return `mock.${userId}.${userId * 7919}`;
}

function userIdFromToken(token: string): number | null {
  const parts = token.split('.');
  if (parts[0] !== 'mock') return null;
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
}

function publicUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

export const mock = {
  register(email: string, password: string): AuthResponse {
    const users = read<StoredUser[]>(USERS_KEY, []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with that email already exists.');
    }
    const isFirst = users.length === 0;
    const user: StoredUser = {
      id: nextId(users),
      email,
      password,
      is_admin: isFirst,
      role: isFirst ? 'ADMIN' : 'USER',
      created_at: '2026-07-19T12:00:00Z',
    };
    users.push(user);
    write(USERS_KEY, users);
    return { token: tokenFor(user.id), user: publicUser(user) };
  },

  login(email: string, password: string): AuthResponse {
    const users = read<StoredUser[]>(USERS_KEY, []);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Incorrect email or password.');
    return { token: tokenFor(user.id), user: publicUser(user) };
  },

  me(token: string): User | null {
    const id = userIdFromToken(token);
    if (id == null) return null;
    const users = read<StoredUser[]>(USERS_KEY, []);
    const u = users.find((x) => x.id === id);
    return u ? publicUser(u) : null;
  },

  listBooks(token: string, status?: BookStatus | null): Book[] {
    const id = userIdFromToken(token);
    const all = read<(Book & { owner_id: number })[]>(BOOKS_KEY, []);
    return all
      .filter((b) => b.owner_id === id && (!status || b.status === status))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(({ owner_id: _o, ...rest }) => rest);
  },

  createBook(token: string, title: string, author: string): Book {
    const id = userIdFromToken(token);
    const all = read<(Book & { owner_id: number })[]>(BOOKS_KEY, []);
    const book = {
      id: nextId(all),
      owner_id: id as number,
      title,
      author,
      status: 'WANT_TO_READ' as BookStatus,
      rating: null,
      created_at: '2026-07-19T12:00:00Z',
    };
    all.push(book);
    write(BOOKS_KEY, all);
    const { owner_id: _o, ...rest } = book;
    return rest;
  },

  updateBook(token: string, bookId: number, patch: { status?: BookStatus; rating?: number | null }): Book {
    const id = userIdFromToken(token);
    const all = read<(Book & { owner_id: number })[]>(BOOKS_KEY, []);
    const book = all.find((b) => b.id === bookId && b.owner_id === id);
    if (!book) throw new Error('Book not found.');
    if (patch.status !== undefined) book.status = patch.status;
    if (patch.rating !== undefined) {
      if (patch.rating !== null) {
        if (book.status !== 'FINISHED') throw new Error('Rating is only allowed on finished books.');
        if (patch.rating < 1 || patch.rating > 5) throw new Error('Rating must be between 1 and 5.');
      }
      book.rating = patch.rating;
    }
    // Clearing status away from FINISHED drops the rating.
    if (patch.status && patch.status !== 'FINISHED') book.rating = null;
    write(BOOKS_KEY, all);
    const { owner_id: _o, ...rest } = book;
    return rest;
  },

  deleteBook(token: string, bookId: number): void {
    const id = userIdFromToken(token);
    const all = read<(Book & { owner_id: number })[]>(BOOKS_KEY, []);
    write(BOOKS_KEY, all.filter((b) => !(b.id === bookId && b.owner_id === id)));
  },

  getSettings(): ServiceSetting[] {
    const stored = read<Record<string, string>>(SETTINGS_KEY, {});
    const mask = (v: string) => (v ? '••••••••' : '');
    const pg = ['pg_host', 'pg_database', 'pg_user', 'pg_password'];
    const minio = ['minio_endpoint', 'minio_bucket', 'minio_access_key', 'minio_secret_key'];
    const svc = (service: string, label: string, keys: string[], labels: string[], secrets: number[]): ServiceSetting => ({
      service,
      label,
      configured: keys.some((k) => stored[k]),
      fields: keys.map((k, i) => ({ key: k, label: labels[i], value: secrets.includes(i) ? mask(stored[k] || '') : stored[k] || '', secret: secrets.includes(i) })),
    });
    return [
      svc('postgresql', 'PostgreSQL', pg, ['Host', 'Database', 'User', 'Password'], [3]),
      svc('minio', 'MinIO Object Storage', minio, ['Endpoint', 'Bucket', 'Access Key', 'Secret Key'], [2, 3]),
    ];
  },

  updateSettings(patch: Record<string, string>): ServiceSetting[] {
    const stored = read<Record<string, string>>(SETTINGS_KEY, {});
    for (const [k, v] of Object.entries(patch)) {
      if (v) stored[k] = v;
    }
    write(SETTINGS_KEY, stored);
    return this.getSettings();
  },
};
