import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password);
      navigate('/shelf', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card" data-testid="signup-page">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">📚</span>
          <h1 className="auth-title">Create your shelf</h1>
          <p className="auth-sub">Track what you read, all in one place.</p>
        </div>
        <form onSubmit={submit} data-testid="signup-form" className="auth-form">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              data-testid="signup-email"
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
              data-testid="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              data-testid="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </label>
          {error && <p className="form-error" data-testid="signup-error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login" data-testid="link-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
