'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const NO_PHASE = '__none';

export default function ProjectPayableNewPage() {
  const router    = useRouter();
  const params    = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [phases,    setPhases]    = useState<{ id: string; name: string }[]>([]);

  const [supplierId,  setSupplierId]  = useState(searchParams.get('supplierId') ?? '');
  const [phaseId,     setPhaseId]     = useState(NO_PHASE);
  const [billNo,      setBillNo]      = useState('');
  const [billDate,    setBillDate]    = useState(today());
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [notes,       setNotes]       = useState('');

  function today() { return new Date().toISOString().split('T')[0]; }

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch(`/api/phases?projectId=${projectId}`).then(r => r.json()),
    ])
      .then(([s, p]) => { setSuppliers(Array.isArray(s) ? s : []); setPhases(Array.isArray(p) ? p : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function validate() {
    const e: Record<string, string> = {};
    if (!supplierId)  e.supplierId  = 'Please select a supplier.';
    if (!billDate)    e.billDate    = 'Bill date is required.';
    const amt = parseFloat(totalAmount);
    if (!totalAmount || isNaN(amt) || amt <= 0) e.totalAmount = 'Enter a valid bill amount.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        supplierId,
        projectId,
        billDate,
        totalAmount: parseFloat(totalAmount),
      };
      if (phaseId !== NO_PHASE) body.phaseId = phaseId;
      if (billNo.trim()) body.billNo  = billNo.trim();
      if (dueDate)       body.dueDate = dueDate;
      if (notes.trim())  body.notes   = notes.trim();

      const res = await fetch('/api/suppliers/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save.');
        return;
      }
      router.push(`/projects/${projectId}/payables`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <Link href={`/projects/${projectId}/payables`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Payables
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Record Supplier Bill</CardTitle>
          <CardDescription>Bill is linked to this project. Phase is optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormError message={error} />

            <FormSection title="Supplier">
              <Field label="Supplier / Vendor" htmlFor="supplierId" required error={errors.supplierId}>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplierId" className={errors.supplierId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading…' : suppliers.length === 0 ? 'No suppliers — add one first' : 'Select supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {!loading && suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/suppliers/new" className="text-primary underline">Add a supplier first</Link>
                </p>
              )}
            </FormSection>

            <FormSection title="Phase (optional)">
              <Field label="Construction Phase" htmlFor="phaseId">
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger id="phaseId">
                    <SelectValue placeholder="Select phase (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PHASE}>— Project-general (no specific phase) —</SelectItem>
                    {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">Link this bill to a phase if it belongs to specific construction work.</p>
            </FormSection>

            <FormSection title="Bill Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Bill / Invoice Number" id="billNo" placeholder="e.g. INV-2024-001" value={billNo} onChange={e => setBillNo(e.target.value)} />
                <TextField label="Bill Date" id="billDate" type="date" required value={billDate} onChange={e => setBillDate(e.target.value)} error={errors.billDate} />
              </div>
              <TextField label="Total Bill Amount (৳)" id="totalAmount" type="number" min={0.01} step="0.01" required placeholder="e.g. 250000" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} error={errors.totalAmount} />
              <TextField label="Payment Due By (optional)" id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} hint="Leave blank if no fixed due date" />
            </FormSection>

            <TextareaField label="Notes (optional)" id="notes" placeholder="What this bill is for, delivery details, etc." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[130px]">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Record Bill'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
