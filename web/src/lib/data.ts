// Data layer: prefers the live FastAPI backend, falls back to the localStorage mock
// backend when the API is unreachable (e.g. the static preview). Swapping to real-only
// behaviour later just means deleting the mock fallbacks.
import { apiClient, ApiError } from '../api/client';
import { mock } from './mockBackend';
import type { AuthResponse, Book, BookStatus, ServiceSetting, User } from '../types';

// A "hard" error is one the backend deliberately returned (bad creds, validation): we
// surface it. A network/500 error means the backend is absent → use the mock instead.
function shouldFallback(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500;
  return true; // TypeError from fetch = network failure
}

function normalizeAuth(raw: any): AuthResponse {
  const token = raw.token ?? raw.access_token;
  return { token, user: raw.user };
}

export const data = {
  async register(email: string, password: string): Promise<AuthResponse> {
    try {
      const raw = await apiClient<any>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return normalizeAuth(raw);
    } catch (err) {
      if (shouldFallback(err)) return mock.register(email, password);
      throw err;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const raw = await apiClient<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return normalizeAuth(raw);
    } catch (err) {
      if (shouldFallback(err)) return mock.login(email, password);
      throw err;
    }
  },

  async me(token: string): Promise<User | null> {
    try {
      return await apiClient<User>('/api/auth/me');
    } catch (err) {
      if (shouldFallback(err)) return mock.me(token);
      return null;
    }
  },

  async listBooks(token: string, status?: BookStatus | null): Promise<Book[]> {
    const qs = status ? `?status=${status}` : '';
    try {
      return await apiClient<Book[]>(`/api/books${qs}`);
    } catch (err) {
      if (shouldFallback(err)) return mock.listBooks(token, status ?? null);
      throw err;
    }
  },

  async addBook(token: string, title: string, author: string): Promise<Book> {
    try {
      return await apiClient<Book>('/api/books', {
        method: 'POST',
        body: JSON.stringify({ title, author }),
      });
    } catch (err) {
      if (shouldFallback(err)) return mock.createBook(token, title, author);
      throw err;
    }
  },

  async updateBook(
    token: string,
    id: number,
    patch: { status?: BookStatus; rating?: number | null },
  ): Promise<Book> {
    try {
      return await apiClient<Book>(`/api/books/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch (err) {
      if (shouldFallback(err)) return mock.updateBook(token, id, patch);
      throw err;
    }
  },

  async deleteBook(token: string, id: number): Promise<void> {
    try {
      await apiClient<void>(`/api/books/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (shouldFallback(err)) return mock.deleteBook(token, id);
      throw err;
    }
  },

  async getSettings(): Promise<ServiceSetting[]> {
    try {
      return await apiClient<ServiceSetting[]>('/api/admin/settings');
    } catch (err) {
      if (shouldFallback(err)) return mock.getSettings();
      throw err;
    }
  },

  async updateSettings(patch: Record<string, string>): Promise<ServiceSetting[]> {
    try {
      return await apiClient<ServiceSetting[]>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch (err) {
      if (shouldFallback(err)) return mock.updateSettings(patch);
      throw err;
    }
  },
};
