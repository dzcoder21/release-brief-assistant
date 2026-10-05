import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Field, Input } from '../components/ui/Inputs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { dashboardService } from '../services/releaseService';
import { errorMessage } from '../services/api';
import { cn } from '../utils/format';

const THEMES = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]];

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const ai = useFetch(dashboardService.aiSettings, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-5">
        <Card>
          <CardHeader title="Account" />
          <CardBody className="space-y-4">
            <Field label="Name" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email" htmlFor="email" hint="Email cannot be changed."><Input id="email" value={user.email} disabled /></Field>
            <div className="flex items-center gap-3">
              <Button onClick={save} loading={saving} disabled={name.trim().length < 2 || name === user.name}>Save changes</Button>
              <Badge>{user.role}</Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <CardBody>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
              {THEMES.map(([key, label, Icon]) => (
                <button key={key} role="radio" aria-checked={theme === key} onClick={() => setTheme(key)} className={cn('flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium', theme === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-fg')}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI" description="Configured on the server. API keys are never sent to the browser." />
          <CardBody>
            {ai.loading ? <p className="text-sm text-muted">Loading…</p> : ai.error ? <p className="text-sm text-danger">{ai.error}</p> : (
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Status</dt><dd className="mt-0.5">{ai.data.configured ? <Badge tone="success">Configured</Badge> : <Badge tone="warning">Not configured</Badge>}</dd></div>
                <div><dt className="text-muted">Provider</dt><dd className="mt-0.5 font-mono text-xs">{ai.data.provider}</dd></div>
                <div><dt className="text-muted">Model</dt><dd className="mt-0.5 font-mono text-xs">{ai.data.model || '—'}</dd></div>
              </dl>
            )}
            {ai.data && !ai.data.configured && <p className="mt-3 text-xs text-muted">Set AI_API_KEY and AI_MODEL in server/.env, then restart the server.</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
