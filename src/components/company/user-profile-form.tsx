'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROJECT_STAFF_ROLES = [
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'SITE_SUPERVISOR',
  'ACCOUNTS_OFFICER',
  'COLLECTION_OFFICER',
  'DOCUMENT_OFFICER',
  'AUDITOR',
] as const;

export function UserProfileForm({
  mode,
  actionUrl,
  roles,
  projects,
  initialValue,
}: {
  mode: 'create' | 'edit';
  actionUrl: string;
  roles: Array<{ id: string; name: string; code: string | null }>;
  projects: Array<{ id: string; name: string }>;
  initialValue?: {
    name: string;
    email: string;
    phone?: string | null;
    roleId?: string | null;
    isActive: boolean;
    assignedProjectIds: string[];
    projectRole: string;
  };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(initialValue?.name ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [phone, setPhone] = useState(initialValue?.phone ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(initialValue?.roleId ?? '');
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [projectRole, setProjectRole] = useState(initialValue?.projectRole ?? 'SITE_ENGINEER');
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>(initialValue?.assignedProjectIds ?? []);

  function toggleProject(projectId: string) {
    setAssignedProjectIds((current) =>
      current.includes(projectId) ? current.filter((item) => item !== projectId) : [...current, projectId],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(actionUrl, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
          roleId: roleId || undefined,
          isActive,
          projectRole,
          projectIds: assignedProjectIds,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to save user.');
        return;
      }
      router.push(mode === 'create' ? `/company/users/${json.id}` : window.location.pathname.replace(/\/edit$/, ''));
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={error} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Name" id="userName" required value={name} onChange={(event) => setName(event.target.value)} />
        <TextField label="Email" id="userEmail" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField label="Phone" id="userPhone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <TextField
          label={mode === 'create' ? 'Password' : 'Password (leave blank to keep unchanged)'}
          id="userPassword"
          type="password"
          required={mode === 'create'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Company Role" htmlFor="roleId" required>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger id="roleId">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Project Staff Role" htmlFor="projectRole">
          <Select value={projectRole} onValueChange={setProjectRole}>
            <SelectTrigger id="projectRole">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STAFF_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Active user
      </label>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Allowed Projects</h3>
          <p className="text-xs text-muted-foreground">Only assigned projects should open for project-scoped users.</p>
        </div>
        <div className="rounded-lg border divide-y">
          {projects.map((project) => (
            <label key={project.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30">
              <input
                type="checkbox"
                checked={assignedProjectIds.includes(project.id)}
                onChange={() => toggleProject(project.id)}
              />
              <span>{project.name}</span>
            </label>
          ))}
          {projects.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No projects available yet.</div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : mode === 'create' ? 'Create User' : 'Save User'}
        </Button>
      </div>
    </form>
  );
}
