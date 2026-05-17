'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AddSupplierBillPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [projects,  setProjects]  = useState<{ id: string; name: string }[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [supplierId,   setSupplierId]   = useState(searchParams.get('supplierId') ?? '');
  const [projectId,    setProjectId]    = useState(searchParams.get('projectId')  ?? '');
  const [billNo,       setBillNo]       = useState('');
  const [billDate,     setBillDate]     = useState(today());
  const [totalAmount,  setTotalAmount]  = useState('');
  const [dueDate,      setDueDate]      = useState('');
  const [notes,        setNotes]        = useState('');

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
      .then(([s, p]) => {
        setSuppliers(Array.isArray(s) ? s : []);
        const projs = Array.isArray(p) ? p : [];
        setProjects(projs);
        // Auto-select project if only one
        if (projs.length === 1 && !projectId) setProjectId(projs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!supplierId) e.supplierId = 'Please select a supplier.';
    if (!projectId)  e.projectId  = 'Please select a project.';
    if (!billDate)   e.billDate   = 'Bill date is required.';
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
      if (billNo.trim())  body.billNo  = billNo.trim();
      if (dueDate)        body.dueDate = dueDate;
      if (notes.trim())   body.notes   = notes.trim();

      const res = await fetch('/api/suppliers/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      router.push('/suppliers/payables');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Record Supplier Bill" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        {/* Legacy notice */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Tip:</strong> For a better experience, record supplier bills from inside the{' '}
            <Link href="/projects" className="underline font-medium">Project Workspace</Link>{' '}
            → select project → Supplier Payables → Record Bill.
            The project will be pre-filled automatically.
          </div>
        </div>

        <Link href="/suppliers/payables" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Payables
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Record Supplier Bill</CardTitle>
            <CardDescription>
              Enter the bill received from a supplier. Select the project this bill belongs to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormError message={error} />

              <FormSection title="Project & Supplier">
                {/* Project selector — required now */}
                <Field label="Project" htmlFor="projectId" required error={errors.projectId}>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="projectId" className={errors.projectId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loading ? 'Loading projects…' : 'Select project'} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Supplier / Vendor" htmlFor="supplierId" required error={errors.supplierId}>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplierId" className={errors.supplierId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loading ? 'Loading suppliers…' : 'Select supplier'} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                      {!loading && suppliers.length === 0 && (
                        <SelectItem value="__none" disabled>No suppliers — add one first</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </FormSection>

              <FormSection title="Bill Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Bill / Invoice Number"
                    id="billNo"
                    placeholder="e.g. INV-2024-001"
                    value={billNo}
                    onChange={e => setBillNo(e.target.value)}
                  />
                  <TextField
                    label="Bill Date"
                    id="billDate"
                    type="date"
                    required
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    error={errors.billDate}
                  />
                </div>

                <TextField
                  label="Total Bill Amount (৳)"
                  id="totalAmount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  placeholder="e.g. 250000"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  error={errors.totalAmount}
                />

                <TextField
                  label="Payment Due By (optional)"
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  hint="Leave blank if there is no fixed due date"
                />
              </FormSection>

              <TextareaField
                label="Notes (optional)"
                id="notes"
                placeholder="What this bill is for, delivery details, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="min-w-[140px]">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Record Bill'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
