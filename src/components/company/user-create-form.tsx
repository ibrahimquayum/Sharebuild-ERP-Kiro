'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormError, TextField } from '@/components/shared/form-field';
import { Loader2 } from 'lucide-react';

const ROLES = ['COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT', 'SITE_ENGINEER', 'VIEWER'];
const PROJECT_ROLES = ['PROJECT_MANAGER', 'SITE_ENGINEER', 'SITE_SUPERVISOR', 'ACCOUNTS_OFFICER', 'COLLECTION_OFFICER', 'DOCUMENT_OFFICER', 'AUDITOR'];
const NO_PROJECT = '__none';

export function UserCreateForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [password, setPassword] = useState('');
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [projectRole, setProjectRole] = useState('SITE_ENGINEER');
  const [startDate, setStartDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/company/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          role,
          password,
          isActive: true,
          projectId: projectId === NO_PROJECT ? undefined : projectId,
          projectRole,
          assignmentStartDate: startDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.formErrors?.[0] ?? data?.error ?? 'Failed to create user.');
        return;
      }
      router.refresh();
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setProjectId(NO_PROJECT);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2"><FormError message={error} /></div>
      <TextField label="Name" id="userName" required value={name} onChange={e => setName(e.target.value)} />
      <TextField label="Email" id="userEmail" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <TextField label="Phone" id="userPhone" value={phone} onChange={e => setPhone(e.target.value)} />
      <TextField label="Password" id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
      <Field label="Company Role" htmlFor="role"><Select value={role} onValueChange={setRole}><SelectTrigger id="role"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Assign to Project" htmlFor="projectId"><Select value={projectId} onValueChange={setProjectId}><SelectTrigger id="projectId"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NO_PROJECT}>No project assignment</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></Field>
      {projectId !== NO_PROJECT && (
        <>
          <Field label="Project Role" htmlFor="projectRole"><Select value={projectRole} onValueChange={setProjectRole}><SelectTrigger id="projectRole"><SelectValue /></SelectTrigger><SelectContent>{PROJECT_ROLES.map(r => <SelectItem key={r} value={r}>{r.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></Field>
          <TextField label="Assignment Start Date" id="assignmentStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </>
      )}
      <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Create User'}</Button></div>
    </form>
  );
}
