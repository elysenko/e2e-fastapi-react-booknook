// Route-verifiability contract (Colossus): every navigable UI state MUST be reachable
// from a URL alone (deep-linkable BrowserRouter routes; nginx serves try_files fallback).
// Keep data-testid="app-ready" on the shell root — the mockup gate waits for it.
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './components/RequireAuth';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ShelfPage from './pages/ShelfPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <div data-testid="app-ready" className="app-root">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Guarded app routes */}
        <Route
          path="/shelf"
          element={
            <RequireAuth>
              <AppLayout>
                <ShelfPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAuth requireAdmin>
              <AppLayout>
                <AdminSettingsPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route path="/" element={<Navigate to="/shelf" replace />} />
        <Route path="*" element={<Navigate to="/shelf" replace />} />
      </Routes>
      </div>
    </AuthProvider>
  );
}
