'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSuccess, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BulkUnitForm({
  projectId,
  defaultFloors,
  defaultUnitsPerFloor,
}: {
  projectId: string;
  defaultFloors?: number | null;
  defaultUnitsPerFloor?: number | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [startFloor, setStartFloor] = useState('1');
  const [floorCount, setFloorCount] = useState(defaultFloors?.toString() ?? '9');
  const [unitsPerFloor, setUnitsPerFloor] = useState(defaultUnitsPerFloor?.toString() ?? '6');
  const [namingPattern, setNamingPattern] = useState('FLOOR_UNIT');
  const [prefix, setPrefix] = useState('');
  const [defaultSize, setDefaultSize] = useState('');
  const [unitType, setUnitType] = useState('FLAT');
  const [status, setStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      startFloor: Number(startFloor),
      floorCount: Number(floorCount),
      unitsPerFloor: Number(unitsPerFloor),
      namingPattern,
      prefix: prefix.trim() || undefined,
      defaultSize: defaultSize.trim() ? Number(defaultSize) : undefined,
      unitType,
      status,
      notes: notes.trim() || undefined,
    };

    if (!Number.isInteger(payload.floorCount) || payload.floorCount < 1 || !Number.isInteger(payload.unitsPerFloor) || payload.unitsPerFloor < 1) {
      setError('Enter valid floor and unit counts.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/units/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to generate units.');
        return;
      }
      setSuccess(`${json.count ?? 0} units generated.`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />
      <FormSuccess message={success} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TextField label="Start Floor" id="startFloor" type="number" value={startFloor} onChange={(e) => setStartFloor(e.target.value)} />
        <TextField label="Floor Count" id="floorCount" type="number" min={1} value={floorCount} onChange={(e) => setFloorCount(e.target.value)} />
        <TextField label="Units Per Floor" id="unitsPerFloor" type="number" min={1} value={unitsPerFloor} onChange={(e) => setUnitsPerFloor(e.target.value)} />
        <TextField label="Default Size / sqft" id="defaultSize" type="number" min={0} step="0.01" value={defaultSize} onChange={(e) => setDefaultSize(e.target.value)} />
        <Field label="Naming Pattern" htmlFor="namingPattern">
          <Select value={namingPattern} onValueChange={setNamingPattern}>
            <SelectTrigger id="namingPattern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FLOOR_UNIT">Floor-Unit, e.g. 3-1</SelectItem>
              <SelectItem value="LETTER_UNIT">A1, A2, B1</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Prefix" id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Optional" />
        <Field label="Unit Type" htmlFor="bulkUnitType">
          <Select value={unitType} onValueChange={setUnitType}>
            <SelectTrigger id="bulkUnitType"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FLAT">Apartment</SelectItem>
              <SelectItem value="PARKING">Parking</SelectItem>
              <SelectItem value="SHOP">Shop</SelectItem>
              <SelectItem value="COMMON">Common</SelectItem>
              <SelectItem value="UTILITY">Utility</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status" htmlFor="bulkStatus">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="bulkStatus"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="BOOKED">Booked</SelectItem>
              <SelectItem value="SOLD">Sold</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <TextareaField label="Notes" id="bulkNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Generate Units'}
      </Button>
    </form>
  );
}
