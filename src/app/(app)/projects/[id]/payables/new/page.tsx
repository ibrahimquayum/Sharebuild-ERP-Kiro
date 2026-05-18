'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NO_PHASE = '__none';

const CATEGORIES = [
  ['ROD_STEEL', 'Rod / Steel'],
  ['CEMENT', 'Cement'],
  ['STONE_AGGREGATE', 'Stone / Aggregate'],
  ['SAND', 'Sand'],
  ['BRICK', 'Brick'],
  ['TILES', 'Tiles'],
  ['SANITARY_FITTINGS', 'Sanitary'],
  ['ELECTRICAL_MATERIAL', 'Electrical'],
  ['PAINT', 'Paint'],
  ['TRANSPORT', 'Transport'],
  ['OTHER', 'Other'],
] as const;

function today() {
  return new Date().toISOString().split('T')[0];
}

function emptyItem() {
  return { description: '', category: 'OTHER', quantity: '', unit: '', unitPrice: '', amount: '' };
}

export default function ProjectPayableNewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string; supplierType?: string }[]>([]);
  const [phases, setPhases] = useState<{ id: string; name: string }[]>([]);

  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') ?? '');
  const [phaseId, setPhaseId] = useState(NO_PHASE);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then((r) => r.json()),
      fetch(`/api/phases?projectId=${projectId}`).then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setSuppliers(Array.isArray(s) ? s.filter((supplier) => !['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'].includes(supplier.supplierType)) : []);
        setPhases(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function updateItem(index: number, patch: Partial<ReturnType<typeof emptyItem>>) {
    setItems((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!supplierId) e.supplierId = 'Please select a supplier.';
    if (!billDate) e.billDate = 'Bill date is required.';
    const amount = Number(totalAmount);
    if (!totalAmount || Number.isNaN(amount) || amount <= 0) e.totalAmount = 'Enter a valid bill amount.';
    const paid = Number(paidAmount || 0);
    if (paid < 0 || paid > amount) e.paidAmount = 'Paid amount cannot exceed total bill amount.';
    items.forEach((item, index) => {
      const hasAny = item.description || item.amount || item.quantity || item.unitPrice;
      if (!hasAny) return;
      if (!item.description.trim()) e[`item-${index}`] = `Line ${index + 1}: description is required.`;
      if (!item.amount || Number(item.amount) <= 0) e[`item-${index}`] = `Line ${index + 1}: amount is required.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const validItems = items
        .filter((item) => item.description.trim() && Number(item.amount) > 0)
        .map((item) => ({
          description: item.description.trim(),
          category: item.category,
          quantity: item.quantity ? Number(item.quantity) : undefined,
          unit: item.unit.trim() || undefined,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          amount: Number(item.amount),
        }));

      const body: Record<string, unknown> = {
        supplierId,
        projectId,
        billDate,
        totalAmount: Number(totalAmount),
        ...(paidAmount ? { paidAmount: Number(paidAmount) } : {}),
        ...(phaseId !== NO_PHASE ? { phaseId } : {}),
        ...(billNo.trim() ? { billNo: billNo.trim() } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(validItems.length > 0 ? { items: validItems } : {}),
      };

      const res = await fetch('/api/suppliers/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save supplier bill.');
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
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${projectId}/payables`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Payables
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Record Supplier Bill</CardTitle>
          <CardDescription>Use line items for material and vendor bills. Labour contractors and service providers are recorded from the Subcontractor Bills area.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormError message={error} />

            <FormSection title="Supplier And Phase">
              <Field label="Supplier / Vendor" htmlFor="supplierId" required error={errors.supplierId}>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplierId" className={errors.supplierId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading...' : suppliers.length === 0 ? 'No suppliers - add one first' : 'Select supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Construction Phase" htmlFor="phaseId">
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger id="phaseId"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PHASE}>Project-general (no specific phase)</SelectItem>
                    {phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Bill Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Bill / Invoice Number" id="billNo" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
                <TextField label="Bill Date" id="billDate" type="date" required value={billDate} onChange={(e) => setBillDate(e.target.value)} error={errors.billDate} />
                <TextField label="Total Bill Amount (BDT)" id="totalAmount" type="number" min={0.01} step="0.01" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} error={errors.totalAmount} />
                <TextField label="Paid Amount Now" id="paidAmount" type="number" min={0} step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} error={errors.paidAmount} />
                <TextField label="Payment Due By" id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </FormSection>

            <FormSection title="Bill Line Items">
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_0.7fr_0.7fr_0.8fr_0.9fr_auto] gap-2 rounded-md border p-3">
                    <TextField label="Material / Line" id={`itemDesc${index}`} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} error={errors[`item-${index}`]} />
                    <Field label="Category" htmlFor={`itemCat${index}`}>
                      <Select value={item.category} onValueChange={(value) => updateItem(index, { category: value })}>
                        <SelectTrigger id={`itemCat${index}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <TextField label="Qty" id={`itemQty${index}`} type="number" min={0} step="0.001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value, amount: e.target.value && item.unitPrice ? (Number(e.target.value) * Number(item.unitPrice)).toFixed(2) : item.amount })} />
                    <TextField label="Unit" id={`itemUnit${index}`} value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} />
                    <TextField label="Rate" id={`itemRate${index}`} type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value, amount: item.quantity && e.target.value ? (Number(item.quantity) * Number(e.target.value)).toFixed(2) : item.amount })} />
                    <TextField label="Amount" id={`itemAmount${index}`} type="number" min={0} step="0.01" value={item.amount} onChange={(e) => updateItem(index, { amount: e.target.value })} />
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}>
                  <Plus className="mr-2 h-4 w-4" /> Add Line
                </Button>
                <Button type="button" variant="ghost" onClick={() => setTotalAmount(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2))}>
                  Use line total
                </Button>
              </div>
            </FormSection>

            <TextareaField label="Notes" id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[130px]">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Record Bill'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
