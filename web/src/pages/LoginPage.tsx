import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/shelf';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card" data-testid="login-page">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">📚</span>
          <h1 className="auth-title">BookNook</h1>
          <p className="auth-sub">Welcome back to your shelf.</p>
        </div>
        <form onSubmit={submit} data-testid="login-form" className="auth-form">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              data-testid="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p className="form-error" data-testid="login-error" role="alert">{error}</p>}
          <label className="remember-me" data-testid="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button type="submit" className="btn-primary btn-teal btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          New to BookNook? <Link to="/signup" data-testid="link-signup">Create an account</Link>
        </p>
        <p className="auth-demo">Demo: <code>reader@booknook.app</code> / <code>password</code></p>
      </div>
    </div>
  );
}
