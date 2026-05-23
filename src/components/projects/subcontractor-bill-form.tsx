'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
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

type AssignmentOption = { id: string; workType: string; supplier: { id: string; name: string } };
type PhaseOption = { id: string; name: string };
type AccountOption = { id: string; label: string };

function today() {
  return new Date().toISOString().split('T')[0];
}

export function SubcontractorBillForm({
  projectId,
  subcontractors,
  phases,
  accounts,
  initialProjectSubcontractorId,
  initialSubcontractorId,
}: {
  projectId: string;
  subcontractors: AssignmentOption[];
  phases: PhaseOption[];
  accounts: AccountOption[];
  initialProjectSubcontractorId?: string;
  initialSubcontractorId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projectSubcontractorId, setProjectSubcontractorId] = useState(initialProjectSubcontractorId ?? '');
  const [workType, setWorkType] = useState('STRUCTURE_CIVIL');
  const [phaseId, setPhaseId] = useState(NO_PHASE);
  const [contractAmount, setContractAmount] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [billAmount, setBillAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeBranchName, setChequeBranchName] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [measurementFiles, setMeasurementFiles] = useState<File[]>([]);
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);

  const selectedAssignment = subcontractors.find((assignment) => assignment.id === projectSubcontractorId)
    ?? subcontractors.find((assignment) => assignment.supplier.id === initialSubcontractorId)
    ?? null;

  useEffect(() => {
    if (selectedAssignment) {
      setWorkType(selectedAssignment.workType);
    }
  }, [selectedAssignment]);

  const workTypeLabel = useMemo(() => WORK_TYPES.find(([value]) => value === workType)?.[1] ?? workType, [workType]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const total = Number(billAmount);
    const paid = Number(paidAmount || 0);
    if (!projectSubcontractorId && !selectedAssignment) nextErrors.subcontractorId = 'Select a project subcontractor.';
    if (!billDate) nextErrors.billDate = 'Bill date is required.';
    if (!billAmount || Number.isNaN(total) || total <= 0) nextErrors.billAmount = 'Enter a valid bill amount.';
    if (paid < 0 || paid > total) nextErrors.paidAmount = 'Paid amount cannot exceed bill amount.';
    if (paid > 0 && !accountId) nextErrors.accountId = 'Select the paying account for the initial payment.';
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
        projectSubcontractorId: selectedAssignment?.id,
        supplierId: selectedAssignment?.supplier.id,
        projectId,
        billDate,
        totalAmount: Number(billAmount),
        paidAmount: paidAmount ? Number(paidAmount) : 0,
        accountId: paidAmount ? accountId : undefined,
        paymentMethod,
        reference: reference.trim() || undefined,
        chequeNo: chequeNo.trim() || undefined,
        chequeDate: chequeDate || undefined,
        bankName: bankName.trim() || undefined,
        chequeBranchName: chequeBranchName.trim() || undefined,
        chequeMaturityDate: chequeMaturityDate || undefined,
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
      const uploadGroups = [
        { files: measurementFiles, category: 'subcontractor measurement sheet', title: 'Measurement sheet' },
        { files: agreementFiles, category: 'subcontractor agreement', title: 'Subcontractor agreement' },
        { files: invoiceFiles, category: 'subcontractor invoice', title: billNo.trim() ? `Subcontractor invoice ${billNo.trim()}` : 'Subcontractor invoice / voucher' },
      ];
      for (const group of uploadGroups) {
        if (group.files.length === 0) continue;
        const uploadData = new FormData();
        group.files.forEach((file) => uploadData.append('file', file));
        uploadData.set('projectId', projectId);
        uploadData.set('payableId', data.id);
        uploadData.set('scope', 'SUBCONTRACTOR_BILL');
        uploadData.set('category', group.category);
        uploadData.set('title', group.title);
        uploadData.set('description', 'Uploaded during subcontractor bill entry.');
        const uploadRes = await fetch('/api/documents', { method: 'POST', body: uploadData });
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json().catch(() => ({}));
          setError(`Bill saved, but ${group.title.toLowerCase()} upload failed: ${typeof uploadJson.error === 'string' ? uploadJson.error : 'try uploading from bill detail.'}`);
          router.push(`/projects/${projectId}/payables/${data.id}`);
          router.refresh();
          return;
        }
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
        <div className="md:col-span-2 flex justify-end">
          <Link href={`/projects/${projectId}/subcontractors/new`} className="text-xs font-medium text-primary hover:underline">
            Add new subcontractor
          </Link>
        </div>
        <Field label="Project Subcontractor" htmlFor="projectSubcontractorId" required error={errors.subcontractorId}>
          <Select value={selectedAssignment?.id ?? projectSubcontractorId} onValueChange={setProjectSubcontractorId}>
            <SelectTrigger id="projectSubcontractorId" className={errors.subcontractorId ? 'border-destructive' : ''}>
              <SelectValue placeholder={subcontractors.length === 0 ? 'No project subcontractors found' : 'Select subcontractor assignment'} />
            </SelectTrigger>
            <SelectContent>
              {subcontractors.map((subcontractor) => (
                <SelectItem key={subcontractor.id} value={subcontractor.id}>{subcontractor.supplier.name} - {subcontractor.workType.replaceAll('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Bills link to the project subcontractor assignment so contract and progress billing stay together.
          </p>
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
          <Field label="Pay From Account" htmlFor="accountId" error={errors.accountId}>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="accountId" className={errors.accountId ? 'border-destructive' : ''}><SelectValue placeholder={accounts.length === 0 ? 'No active accounts found' : 'Select account'} /></SelectTrigger>
              <SelectContent>
                {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Payment Due By" id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Field label="Payment Method For Paid Amount" htmlFor="paymentMethod">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Reference" id="reference" value={reference} onChange={(event) => setReference(event.target.value)} />
          {paymentMethod === 'CHEQUE' && (
            <>
              <TextField label="Cheque Number" id="chequeNo" value={chequeNo} onChange={(event) => setChequeNo(event.target.value)} />
              <TextField label="Cheque Date" id="chequeDate" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
              <TextField label="Bank Name" id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
              <TextField label="Branch" id="chequeBranchName" value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
              <TextField label="Maturity Date" id="chequeMaturityDate" type="date" value={chequeMaturityDate} onChange={(event) => setChequeMaturityDate(event.target.value)} />
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Documents">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Measurement Sheet" htmlFor="measurementFiles" hint="Optional PDF/image.">
            <input id="measurementFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setMeasurementFiles(Array.from(event.target.files ?? []))} className="text-sm" />
            {measurementFiles.length === 0 && <p className="mt-1 text-xs text-amber-600">No measurement sheet</p>}
          </Field>
          <Field label="Agreement" htmlFor="agreementFiles" hint="Optional PDF/image.">
            <input id="agreementFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setAgreementFiles(Array.from(event.target.files ?? []))} className="text-sm" />
            {agreementFiles.length === 0 && <p className="mt-1 text-xs text-amber-600">No agreement attached</p>}
          </Field>
          <Field label="Invoice / Voucher" htmlFor="invoiceFiles" hint="Optional PDF/image.">
            <input id="invoiceFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setInvoiceFiles(Array.from(event.target.files ?? []))} className="text-sm" />
            {invoiceFiles.length === 0 && <p className="mt-1 text-xs text-amber-600">Missing invoice/voucher</p>}
          </Field>
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
