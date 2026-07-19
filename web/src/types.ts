// Shared TS types mirroring backend schemas (backend/app/schemas.py).
export type BookStatus = 'WANT_TO_READ' | 'READING' | 'FINISHED';

export interface Book {
  id: number;
  title: string;
  author: string;
  status: BookStatus;
  rating: number | null;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  role: 'ADMIN' | 'USER';
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface BookCreate {
  title: string;
  author: string;
}

export interface BookUpdate {
  status?: BookStatus;
  rating?: number | null;
}

export interface ServiceSetting {
  service: string;
  label: string;
  configured: boolean;
  fields: { key: string; label: string; value: string; secret: boolean }[];
}

export const STATUS_META: Record<BookStatus, { label: string; short: string }> = {
  WANT_TO_READ: { label: 'Want to Read', short: 'Want' },
  READING: { label: 'Reading', short: 'Reading' },
  FINISHED: { label: 'Finished', short: 'Finished' },
};
