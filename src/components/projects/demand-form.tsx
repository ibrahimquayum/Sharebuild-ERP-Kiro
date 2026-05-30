'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBDT } from '@/lib/utils';

interface Option {
  id: string;
  label: string;
}

interface PhaseOption extends Option {
  serviceChargePct: number;
}

export function DemandForm({ projectId, phases, allocations }: { projectId: string; phases: PhaseOption[]; allocations: Option[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [allocationIds, setAllocationIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.id === phaseId) ?? null,
    [phaseId, phases],
  );

  const effectiveServiceChargePct = selectedPhase?.serviceChargePct ?? 0;

  const serviceChargePreview = useMemo(
    () => Number(((Number(amount || 0) * effectiveServiceChargePct) / 100).toFixed(2)),
    [amount, effectiveServiceChargePct],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !phaseId || allocationIds.length === 0 || !amount.trim()) {
      setError('Title, phase, buyer/unit allocation, and amount are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/demands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          phaseId,
          allocationIds,
          amount: Number(amount),
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to create demands.');
        return;
      }
      router.push(`/projects/${projectId}/demands`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleAllocation(id: string) {
    setAllocationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Demand Title" id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 3rd slab installment" />
        <Field label="Phase" htmlFor="phaseId" required>
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger id="phaseId"><SelectValue placeholder="Select phase" /></SelectTrigger>
            <SelectContent>
              {phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Equal Amount Per Unit" id="amount" required type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <TextField label="Due Date" id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="text-xs text-muted-foreground">Effective Service Charge Rate</div>
          <div className="mt-1 text-lg font-semibold">{effectiveServiceChargePct.toFixed(2)}%</div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="text-xs text-muted-foreground">Service Charge (auto-included)</div>
          <div className="mt-1 text-lg font-semibold">{formatBDT(serviceChargePreview)}</div>
        </div>
      </div>
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Service charge is included automatically in the buyer phase demand at the effective rate and collected through
        normal buyer payments. The amount above is the base amount; service charge is added on top by the system.
      </div>
      <Field label="Buyer / Unit Allocations" htmlFor="allocations" required hint="Amount is calculated per unit, then split by ownership share. A buyer with two full units receives two unit demands.">
        <div id="allocations" className="max-h-72 overflow-y-auto rounded-md border divide-y">
          {allocations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No buyer/unit allocations yet. Add units and assign buyers first.</div>
          ) : allocations.map((allocation) => (
            <label key={allocation.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40">
              <input type="checkbox" checked={allocationIds.includes(allocation.id)} onChange={() => toggleAllocation(allocation.id)} />
              <span>{allocation.label}</span>
            </label>
          ))}
        </div>
      </Field>
      <TextareaField label="Notes" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Demand Records'}
      </Button>
    </form>
  );
}
