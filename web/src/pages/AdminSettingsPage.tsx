// Admin-only service configuration: PostgreSQL and MinIO, each with a configured /
// unconfigured badge and a credential form (values are masked when read back).
import { useEffect, useState } from 'react';
import { data } from '../lib/data';
import type { ServiceSetting } from '../types';

function ServiceCard({ svc, onSave }: { svc: ServiceSetting; onSave: (patch: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const patch = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim() !== ''));
    if (Object.keys(patch).length === 0) return;
    setBusy(true);
    setError('');
    try {
      await onSave(patch);
      setSaved(true);
      setValues({});
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" data-testid={`service-${svc.service}`}>
      <div className="settings-card-head">
        <h2>{svc.label}</h2>
        <span className={`badge ${svc.configured ? 'badge-ok' : 'badge-muted'}`} data-testid={`badge-${svc.service}`}>
          {svc.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>
      <form onSubmit={submit} className="settings-form">
        {svc.fields.map((f) => (
          <label className="field" key={f.key}>
            <span className="field-label">{f.label}</span>
            <input
              type={f.secret ? 'password' : 'text'}
              value={values[f.key] ?? ''}
              placeholder={f.value ? f.value : `Enter ${f.label.toLowerCase()}`}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              data-testid={`input-${f.key}`}
            />
          </label>
        ))}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="settings-actions">
          {saved && <span className="save-note" data-testid={`saved-${svc.service}`}>Saved ✓</span>}
          <button type="submit" className="btn-primary" disabled={busy} data-testid={`save-${svc.service}`}>
            {busy ? 'Saving…' : 'Save credentials'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminSettingsPage() {
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setServices(await data.getSettings());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(patch: Record<string, string>) {
    const updated = await data.updateSettings(patch);
    setServices(updated);
  }

  return (
    <div className="settings-page">
      <div className="shelf-header">
        <div>
          <h1 className="page-title" data-testid="admin-title">Service Settings</h1>
          <p className="page-sub">Manage connection credentials for provisioned services.</p>
        </div>
      </div>

      {loading ? (
        <div className="state-panel"><p>Loading settings…</p></div>
      ) : (
        <div className="settings-grid" data-testid="settings-list">
          {services.map((svc) => (
            <ServiceCard key={svc.service} svc={svc} onSave={save} />
          ))}
        </div>
      )}
    </div>
  );
}
