'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBDT } from '@/lib/utils';

type PhaseOption = { id: string; name: string; serviceChargePct: number };
type ServiceChargeOption = { id: string; phaseId: string | null; label: string; amount: number; settlementStatus: string };

export function DemandBatchForm({
  projectId,
  phases,
  serviceChargeEntries,
}: {
  projectId: string;
  phases: PhaseOption[];
  serviceChargeEntries: ServiceChargeOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [basisType, setBasisType] = useState('EQUAL_PER_UNIT');
  const [baseAmount, setBaseAmount] = useState('');
  const [serviceChargeEntryId, setServiceChargeEntryId] = useState('__none');
  const [serviceChargeAmount, setServiceChargeAmount] = useState('0');
  const [adjustmentAmount, setAdjustmentAmount] = useState('0');
  const [carryForwardAmount, setCarryForwardAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const eligibleEntries = useMemo(
    () => serviceChargeEntries.filter((entry) => entry.phaseId === phaseId || entry.phaseId === null),
    [serviceChargeEntries, phaseId],
  );

  useEffect(() => {
    if (serviceChargeEntryId === '__none') return;
    const entry = eligibleEntries.find((item) => item.id === serviceChargeEntryId);
    if (entry) setServiceChargeAmount(String(entry.amount));
  }, [eligibleEntries, serviceChargeEntryId]);

  const totalBillable = useMemo(
    () =>
      Number(baseAmount || 0) +
      Number(serviceChargeAmount || 0) +
      Number(adjustmentAmount || 0) +
      Number(carryForwardAmount || 0),
    [adjustmentAmount, baseAmount, carryForwardAmount, serviceChargeAmount],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/demand-batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          phaseId,
          basisType,
          baseAmount: Number(baseAmount),
          serviceChargeEntryId: serviceChargeEntryId === '__none' ? undefined : serviceChargeEntryId,
          serviceChargeAmount: Number(serviceChargeAmount || 0),
          adjustmentAmount: Number(adjustmentAmount || 0),
          carryForwardAmount: Number(carryForwardAmount || 0),
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to issue demand batch.');
        return;
      }
      router.push(`/projects/${projectId}/demands/batches/${json.id}`);
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
        <TextField label="Batch Title" id="batchTitle" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. 5th slab demand batch" />
        <Field label="Phase" htmlFor="phaseId" required>
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger id="phaseId"><SelectValue placeholder="Select phase" /></SelectTrigger>
            <SelectContent>
              {phases.map((phase) => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Distribution Basis" htmlFor="basisType" required>
          <Select value={basisType} onValueChange={setBasisType}>
            <SelectTrigger id="basisType"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EQUAL_PER_UNIT">Equal Per Unit</SelectItem>
              <SelectItem value="OWNERSHIP_SHARE">Ownership Share</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Due Date" id="batchDueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Base Construction Cost" id="baseAmount" type="number" min={0} step="0.01" required value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} />
        <Field label="Service Charge Entry" htmlFor="serviceChargeEntryId">
          <Select value={serviceChargeEntryId} onValueChange={setServiceChargeEntryId}>
            <SelectTrigger id="serviceChargeEntryId"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No linked entry</SelectItem>
              {eligibleEntries.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Service Charge Amount" id="serviceChargeAmount" type="number" min={0} step="0.01" value={serviceChargeAmount} onChange={(event) => setServiceChargeAmount(event.target.value)} />
        <TextField label="Adjustment Amount" id="adjustmentAmount" type="number" step="0.01" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} />
        <TextField label="Carry Forward Amount" id="carryForwardAmount" type="number" step="0.01" value={carryForwardAmount} onChange={(event) => setCarryForwardAmount(event.target.value)} />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="text-xs text-muted-foreground">Total Billable Amount</div>
        <div className="mt-1 text-xl font-bold">{formatBDT(totalBillable)}</div>
      </div>

      <TextareaField label="Notes" id="batchNotes" value={notes} onChange={(event) => setNotes(event.target.value)} />

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing...</> : 'Issue Demand Batch'}
        </Button>
      </div>
    </form>
  );
}
