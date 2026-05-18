'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NO_PHASE = '__none';

const WORK_TYPES = [
  ['PILING', 'Piling'],
  ['STRUCTURE_CIVIL', 'Structure / Civil'],
  ['BRICK_WORK', 'Brick work'],
  ['PLASTER', 'Plaster'],
  ['PLUMBING', 'Plumbing'],
  ['ELECTRICAL', 'Electrical'],
  ['TILES_FITTING', 'Tiles fitting'],
  ['GRILL_WINDOW', 'Grill / Window'],
  ['PAINTING', 'Painting'],
  ['LIFT', 'Lift'],
  ['LABOUR_SERVICE', 'Labour / Service'],
  ['OTHER', 'Other'],
] as const;

const PAYMENT_METHODS = [
  ['CASH', 'Cash'],
  ['CHEQUE', 'Cheque'],
  ['BANK_TRANSFER', 'Bank transfer'],
  ['MOBILE_BANKING', 'Mobile banking'],
  ['OTHER', 'Other'],
] as const;

type Option = { id: string; name: string };

function today() {
  return new Date().toISOString().split('T')[0];
}

export function SubcontractorBillForm({
  projectId,
  subcontractors,
  phases,
}: {
  projectId: string;
  subcontractors: Option[];
  phases: Option[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subcontractorId, setSubcontractorId] = useState('');
  const [workType, setWorkType] = useState('STRUCTURE_CIVIL');
  const [phaseId, setPhaseId] = useState(NO_PHASE);
  const [contractAmount, setContractAmount] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  const workTypeLabel = useMemo(() => WORK_TYPES.find(([value]) => value === workType)?.[1] ?? workType, [workType]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const total = Number(billAmount);
    const paid = Number(paidAmount || 0);
    if (!subcontractorId) nextErrors.subcontractorId = 'Select a subcontractor.';
    if (!billDate) nextErrors.billDate = 'Bill date is required.';
    if (!billAmount || Number.isNaN(total) || total <= 0) nextErrors.billAmount = 'Enter a valid bill amount.';
    if (paid < 0 || paid > total) nextErrors.paidAmount = 'Paid amount cannot exceed bill amount.';
    if (contractAmount && Number(contractAmount) < 0) nextErrors.contractAmount = 'Contract amount cannot be negative.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);

    try {
      const noteParts = [
        `Work type: ${workTypeLabel}`,
        contractAmount ? `Contract amount: ${contractAmount}` : '',
        paidAmount ? `Initial payment method: ${PAYMENT_METHODS.find(([value]) => value === paymentMethod)?.[1] ?? paymentMethod}` : '',
        notes.trim(),
      ].filter(Boolean);

      const body: Record<string, unknown> = {
        supplierId: subcontractorId,
        projectId,
        billDate,
        totalAmount: Number(billAmount),
        paidAmount: paidAmount ? Number(paidAmount) : 0,
        phaseId: phaseId === NO_PHASE ? undefined : phaseId,
        billNo: billNo.trim() || undefined,
        dueDate: dueDate || undefined,
        notes: noteParts.join('\n'),
        items: [
          {
            description: `${workTypeLabel} progress bill`,
            category: workType === 'LABOUR_SERVICE' ? 'LABOUR_BILL' : 'CONTRACTOR_BILL',
            amount: Number(billAmount),
          },
        ],
      };

      const res = await fetch('/api/suppliers/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save subcontractor bill.');
        return;
      }

      router.push(`/projects/${projectId}/payables/${data.id}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={error} />

      <FormSection title="Subcontractor And Phase">
        <Field label="Subcontractor" htmlFor="subcontractorId" required error={errors.subcontractorId}>
          <Select value={subcontractorId} onValueChange={setSubcontractorId}>
            <SelectTrigger id="subcontractorId" className={errors.subcontractorId ? 'border-destructive' : ''}>
              <SelectValue placeholder={subcontractors.length === 0 ? 'No subcontractors found' : 'Select subcontractor'} />
            </SelectTrigger>
            <SelectContent>
              {subcontractors.map((subcontractor) => (
                <SelectItem key={subcontractor.id} value={subcontractor.id}>{subcontractor.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Work Type" htmlFor="workType">
          <Select value={workType} onValueChange={setWorkType}>
            <SelectTrigger id="workType"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORK_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Construction Phase" htmlFor="phaseId">
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger id="phaseId"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PHASE}>Project-general (no specific phase)</SelectItem>
              {phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Bill Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Contract Amount (optional)" id="contractAmount" type="number" min={0} step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} error={errors.contractAmount} />
          <TextField label="Bill / Invoice Number" id="billNo" value={billNo} onChange={(event) => setBillNo(event.target.value)} />
          <TextField label="Bill Date" id="billDate" type="date" required value={billDate} onChange={(event) => setBillDate(event.target.value)} error={errors.billDate} />
          <TextField label="Bill Amount (BDT)" id="billAmount" type="number" min={0.01} step="0.01" required value={billAmount} onChange={(event) => setBillAmount(event.target.value)} error={errors.billAmount} />
          <TextField label="Paid Amount Now" id="paidAmount" type="number" min={0} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} error={errors.paidAmount} />
          <TextField label="Payment Due By" id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Field label="Payment Method For Paid Amount" htmlFor="paymentMethod">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Documents">
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Save the bill first, then attach measurement sheets, agreements, invoices, or vouchers from the bill detail page. Attached files are stored in project documents and linked to this bill.
        </div>
      </FormSection>

      <TextareaField label="Notes" id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving || subcontractors.length === 0} className="min-w-[150px]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Record Bill'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
