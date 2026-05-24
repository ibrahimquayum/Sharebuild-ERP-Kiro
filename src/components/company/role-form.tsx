'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError, TextField, TextareaField } from '@/components/shared/form-field';
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  permissionLabelFromCode,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/permissions';

type PermissionMatrix = Record<PermissionModule, Record<PermissionAction, boolean>>;

function createBlankMatrix(): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module,
      Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, false])),
    ]),
  ) as PermissionMatrix;
}

export function RoleForm({
  mode,
  actionUrl,
  initialValue,
}: {
  mode: 'create' | 'edit';
  actionUrl: string;
  initialValue?: {
    name: string;
    code?: string | null;
    description?: string | null;
    isActive: boolean;
    permissions: PermissionMatrix;
  };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(initialValue?.name ?? '');
  const [code, setCode] = useState(initialValue?.code ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [permissions, setPermissions] = useState<PermissionMatrix>(initialValue?.permissions ?? createBlankMatrix());

  const groupedModules = useMemo(
    () => ({
      Core: ['dashboard', 'projects', 'reports', 'audit'] as PermissionModule[],
      Project: ['units', 'buyers', 'documents', 'phases', 'demands', 'collections', 'expenses'] as PermissionModule[],
      Vendors: ['suppliers', 'subcontractors'] as PermissionModule[],
      Treasury: ['accounts', 'cheques', 'serviceCharge', 'finalReconciliation'] as PermissionModule[],
      Admin: ['settings', 'users'] as PermissionModule[],
    }),
    [],
  );

  function toggleAction(module: PermissionModule, action: PermissionAction) {
    setPermissions((current) => ({
      ...current,
      [module]: {
        ...current[module],
        [action]: !current[module][action],
      },
    }));
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
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          isActive,
          permissions,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to save role.');
        return;
      }
      router.push(mode === 'create' ? `/company/roles/${json.id}` : window.location.pathname.replace(/\/edit$/, ''));
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
        <TextField label="Role Name" id="roleName" required value={name} onChange={(event) => setName(event.target.value)} />
        <TextField label="Role Code" id="roleCode" value={code} onChange={(event) => setCode(event.target.value)} placeholder="CUSTOM_ACCOUNTS_REVIEWER" />
      </div>

      <TextareaField
        label="Description"
        id="roleDescription"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Short explanation of who should use this role."
      />

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Active role
      </label>

      <div className="space-y-5">
        {Object.entries(groupedModules).map(([group, modules]) => (
          <div key={group} className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{group}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2 text-left min-w-[180px]">Module</th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th key={action} className="px-2 py-2 text-center whitespace-nowrap">
                        {permissionLabelFromCode(action)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{permissionLabelFromCode(module)}</td>
                      {PERMISSION_ACTIONS.map((action) => (
                        <td key={action} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={permissions[module][action]}
                            onChange={() => toggleAction(module, action)}
                            aria-label={`${module}-${action}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : mode === 'create' ? 'Create Role' : 'Save Role'}
        </Button>
      </div>
    </form>
  );
}
