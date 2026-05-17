'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNIT_TYPES = [
  { value: 'FLAT', label: 'Apartment' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'COMMON', label: 'Common' },
  { value: 'UTILITY', label: 'Utility' },
];

const UNIT_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'HANDED_OVER', label: 'Handed over' },
];

interface UnitFormProps {
  projectId: string;
  unit?: {
    id: string;
    unitNo: string;
    floor: number | null;
    unitType: string;
    status: string;
    sizesqft: string | number | null;
    notes: string | null;
  };
}

export function UnitForm({ projectId, unit }: UnitFormProps) {
  const router = useRouter();
  const editing = Boolean(unit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unitNo, setUnitNo] = useState(unit?.unitNo ?? '');
  const [floor, setFloor] = useState(unit?.floor?.toString() ?? '');
  const [unitType, setUnitType] = useState(unit?.unitType ?? 'FLAT');
  const [status, setStatus] = useState(unit?.status ?? 'AVAILABLE');
  const [sizesqft, setSizesqft] = useState(unit?.sizesqft?.toString() ?? '');
  const [notes, setNotes] = useState(unit?.notes ?? '');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!unitNo.trim()) {
      setError('Unit number is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unitNo: unitNo.trim(),
        floor: floor.trim() ? Number(floor) : undefined,
        unitType,
        status,
        sizesqft: sizesqft.trim() ? Number(sizesqft) : undefined,
        notes: notes.trim() || undefined,
      };
      const res = await fetch(editing ? `/api/projects/${projectId}/units/${unit!.id}` : `/api/projects/${projectId}/units`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save unit.');
        return;
      }
      router.push(`/projects/${projectId}/units/${data.id}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={error} />
      <FormSection title="Unit Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Unit Number" id="unitNo" required value={unitNo} onChange={(e) => setUnitNo(e.target.value)} placeholder="A-1, 3A, Parking-02" />
          <TextField label="Floor" id="floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
          <Field label="Unit Type" htmlFor="unitType">
            <Select value={unitType} onValueChange={setUnitType}>
              <SelectTrigger id="unitType"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Size / sqft" id="sizesqft" type="number" step="0.01" value={sizesqft} onChange={(e) => setSizesqft(e.target.value)} />
        </div>
        <TextareaField label="Notes" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormSection>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editing ? 'Save Unit' : 'Create Unit'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
