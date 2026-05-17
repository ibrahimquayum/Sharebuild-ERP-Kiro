'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Loader2 } from 'lucide-react';

type ProjectFormData = {
  id?: string;
  name?: string | null;
  nameBn?: string | null;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  landSize?: string | null;
  totalFloors?: number | null;
  residentialFloors?: number | null;
  unitsPerFloor?: number | null;
  totalPlannedUnits?: number | null;
  parkingUtilityNote?: string | null;
  defaultServiceChargePct?: number | string | null;
  notes?: string | null;
  status?: string | null;
  startDate?: Date | string | null;
  description?: string | null;
};

const PROJECT_STATUSES = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function dateValue(value?: Date | string | null) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function optionalValue(value: string, editing: boolean) {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return editing ? null : undefined;
}

function optionalNumber(value: string, editing: boolean, integer = false) {
  if (!value.trim()) return editing ? null : undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return integer ? Math.trunc(n) : n;
}

function getResponseError(data: any, fallback: string) {
  if (!data?.error) return fallback;
  if (typeof data.error === 'string') return data.error;
  const formError = data.error.formErrors?.[0];
  if (formError) return formError;
  const fieldErrors = data.error.fieldErrors ?? data.error;
  const firstField = Object.keys(fieldErrors)[0];
  const firstMessage = firstField ? fieldErrors[firstField]?.[0] : undefined;
  return firstMessage ? `${firstField}: ${firstMessage}` : fallback;
}

export function ProjectForm({ project }: { project?: ProjectFormData }) {
  const router = useRouter();
  const editing = Boolean(project?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(project?.name ?? '');
  const [nameBn, setNameBn] = useState(project?.nameBn ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [address, setAddress] = useState(project?.address ?? '');
  const [phone, setPhone] = useState(project?.phone ?? '');
  const [landSize, setLandSize] = useState(project?.landSize ?? '');
  const [totalFloors, setTotalFloors] = useState(project?.totalFloors?.toString() ?? '');
  const [residentialFloors, setResidentialFloors] = useState(project?.residentialFloors?.toString() ?? '');
  const [unitsPerFloor, setUnitsPerFloor] = useState(project?.unitsPerFloor?.toString() ?? '');
  const [totalPlannedUnits, setTotalPlannedUnits] = useState(project?.totalPlannedUnits?.toString() ?? '');
  const [parkingUtilityNote, setParkingUtilityNote] = useState(project?.parkingUtilityNote ?? '');
  const [defaultServiceChargePct, setDefaultServiceChargePct] = useState(project?.defaultServiceChargePct?.toString() ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [status, setStatus] = useState(project?.status ?? 'ACTIVE');
  const [startDate, setStartDate] = useState(dateValue(project?.startDate));
  const [description, setDescription] = useState(project?.description ?? '');

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Project name is required.';
    for (const [key, value] of Object.entries({ totalFloors, residentialFloors, unitsPerFloor, totalPlannedUnits })) {
      if (value && Number(value) < 0) nextErrors[key] = 'Enter a positive number.';
      if (value && !Number.isFinite(Number(value))) nextErrors[key] = 'Enter a valid number.';
    }
    if (defaultServiceChargePct && Number(defaultServiceChargePct) < 0) {
      nextErrors.defaultServiceChargePct = 'Service charge cannot be negative.';
    }
    if (defaultServiceChargePct && !Number.isFinite(Number(defaultServiceChargePct))) {
      nextErrors.defaultServiceChargePct = 'Enter a valid service charge percentage.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nameBn: optionalValue(nameBn, editing),
        code: optionalValue(code, editing),
        address: optionalValue(address, editing),
        phone: optionalValue(phone, editing),
        landSize: optionalValue(landSize, editing),
        totalFloors: optionalNumber(totalFloors, editing, true),
        residentialFloors: optionalNumber(residentialFloors, editing, true),
        unitsPerFloor: optionalNumber(unitsPerFloor, editing, true),
        totalPlannedUnits: optionalNumber(totalPlannedUnits, editing, true),
        parkingUtilityNote: optionalValue(parkingUtilityNote, editing),
        defaultServiceChargePct: optionalNumber(defaultServiceChargePct, editing),
        notes: optionalValue(notes, editing),
        status,
        startDate: startDate || (editing ? null : undefined),
        description: optionalValue(description, editing),
      };

      const res = await fetch(editing ? `/api/projects/${project!.id}` : '/api/projects', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[ProjectForm] Project save failed', { status: res.status, data });
        setError(getResponseError(data, editing ? 'Failed to save changes.' : 'Failed to save project.'));
        return;
      }

      const saved = await res.json();
      router.push(`/projects/${saved.id}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <FormError message={error} />

      <FormSection title="Project Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Project Name" id="name" required value={name} onChange={e => setName(e.target.value)} error={errors.name} />
          <TextField label="Bangla Name" id="nameBn" value={nameBn} onChange={e => setNameBn(e.target.value)} className="bn" />
          <TextField label="Project Code" id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. RT-2026" />
          <TextField label="Phone / Contact Number" id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <TextareaField label="Location / Address" id="address" value={address} onChange={e => setAddress(e.target.value)} rows={2} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Project Status" htmlFor="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Start Date" id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="Planning">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Land Size" id="landSize" value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="e.g. 8.5 katha" />
          <TextField label="Planned Floors" id="totalFloors" type="number" min={0} value={totalFloors} onChange={e => setTotalFloors(e.target.value)} error={errors.totalFloors} />
          <TextField label="Residential Floors" id="residentialFloors" type="number" min={0} value={residentialFloors} onChange={e => setResidentialFloors(e.target.value)} error={errors.residentialFloors} />
          <TextField label="Units Per Floor" id="unitsPerFloor" type="number" min={0} value={unitsPerFloor} onChange={e => setUnitsPerFloor(e.target.value)} error={errors.unitsPerFloor} />
          <TextField label="Total Planned Units" id="totalPlannedUnits" type="number" min={0} value={totalPlannedUnits} onChange={e => setTotalPlannedUnits(e.target.value)} error={errors.totalPlannedUnits} />
          <TextField label="Default Service Charge %" id="defaultServiceChargePct" type="number" min={0} step="0.01" value={defaultServiceChargePct} onChange={e => setDefaultServiceChargePct(e.target.value)} error={errors.defaultServiceChargePct} />
        </div>
        <TextareaField label="Parking / Common Utility Note" id="parkingUtilityNote" value={parkingUtilityNote} onChange={e => setParkingUtilityNote(e.target.value)} rows={2} />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField label="Internal Notes" id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        <TextareaField label="Project Description" id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </FormSection>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editing ? 'Save Project Settings' : 'Create Project'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
