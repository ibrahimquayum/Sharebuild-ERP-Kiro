'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'ROD_STEEL',             label: 'Rod / Steel' },
  { value: 'CEMENT',                label: 'Cement' },
  { value: 'STONE_AGGREGATE',       label: 'Stone / Aggregate' },
  { value: 'SAND',                  label: 'Sand' },
  { value: 'BRICK',                 label: 'Brick' },
  { value: 'READYMIX_CONCRETE',     label: 'Readymix Concrete' },
  { value: 'TIMBER_SHUTTERING',     label: 'Timber / Shuttering' },
  { value: 'PAINT',                 label: 'Paint' },
  { value: 'TILES',                 label: 'Tiles' },
  { value: 'SANITARY_FITTINGS',     label: 'Sanitary Fittings' },
  { value: 'ELECTRICAL_MATERIAL',   label: 'Electrical Material' },
  { value: 'HARDWARE',              label: 'Hardware' },
  { value: 'CHEMICAL',              label: 'Chemical / Waterproofing' },
  { value: 'LABOUR_BILL',           label: 'Labour Bill' },
  { value: 'CONTRACTOR_BILL',       label: 'Contractor Bill' },
  { value: 'SECURITY_SALARY',       label: 'Security Salary' },
  { value: 'SITE_STAFF_SALARY',     label: 'Site Staff Salary' },
  { value: 'WATER_BILL',            label: 'Water Bill' },
  { value: 'ELECTRICITY_BILL',      label: 'Electricity Bill / Meter Recharge' },
  { value: 'SITE_FOOD_HOSPITALITY', label: 'Site Food / Hospitality' },
  { value: 'TRANSPORT',             label: 'Transport / Carriage' },
  { value: 'EQUIPMENT_HIRE',        label: 'Equipment / Motor Hire' },
  { value: 'SURVEY_DRAWING',        label: 'Survey / Drawing / Design' },
  { value: 'LEGAL_REGISTRATION',    label: 'Legal / Registration' },
  { value: 'MUNICIPALITY_FEE',      label: 'Municipality / RAJUK Fee' },
  { value: 'BANK_CHARGE',           label: 'Bank Charge' },
  { value: 'SERVICE_CHARGE',        label: 'Service Charge (Company)' },
  { value: 'OTHER',                 label: 'Other' },
];

const UNITS = ['kg', 'ton', 'bag', 'cft', 'sft', 'rft', 'pcs', 'truck', 'trip', 'nos', 'ls'];
const NO_SUPPLIER = '__none';

const MATERIAL_CATS = new Set(['ROD_STEEL','CEMENT','STONE_AGGREGATE','SAND','BRICK','READYMIX_CONCRETE','TIMBER_SHUTTERING','PAINT','TILES','HARDWARE','TRANSPORT']);

export default function ProjectExpenseNewPage() {
  const router    = useRouter();
  const params    = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [phases,    setPhases]    = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const [phaseId,     setPhaseId]     = useState(searchParams.get('phaseId') ?? '');
  const [category,    setCategory]    = useState('OTHER');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [supplierId,  setSupplierId]  = useState(NO_SUPPLIER);
  const [billNo,      setBillNo]      = useState('');
  const [quantity,    setQuantity]    = useState('');
  const [unit,        setUnit]        = useState('');
  const [unitPrice,   setUnitPrice]   = useState('');
  const [notes,       setNotes]       = useState('');

  function today() { return new Date().toISOString().split('T')[0]; }

  useEffect(() => {
    Promise.all([
      fetch(`/api/phases?projectId=${projectId}`).then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
    ])
      .then(([p, s]) => { setPhases(Array.isArray(p) ? p : []); setSuppliers(Array.isArray(s) ? s : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const q = parseFloat(quantity), p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) setAmount((q * p).toFixed(2));
  }, [quantity, unitPrice]);

  function validate() {
    const e: Record<string, string> = {};
    if (!phaseId) e.phaseId = 'Please select a phase.';
    if (!description.trim()) e.description = 'Description is required.';
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid amount.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { phaseId, category, description: description.trim(), amount: parseFloat(amount), expenseDate };
      if (supplierId !== NO_SUPPLIER) body.supplierId = supplierId;
      if (billNo.trim()) body.billNo = billNo.trim();
      if (notes.trim())  body.notes  = notes.trim();
      if (quantity && !isNaN(parseFloat(quantity))) body.quantity  = parseFloat(quantity);
      if (unit.trim())   body.unit     = unit.trim();
      if (unitPrice && !isNaN(parseFloat(unitPrice))) body.unitPrice = parseFloat(unitPrice);

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save.');
        return;
      }
      router.push(`/projects/${projectId}/expenses`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const showQty = MATERIAL_CATS.has(category);

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <Link href={`/projects/${projectId}/expenses`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add Daily Expense</CardTitle>
          <CardDescription>Record any site cost — phases shown are for this project only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormError message={error} />

            <FormSection title="Phase & Category">
              <Field label="Construction Phase" htmlFor="phaseId" required error={errors.phaseId}>
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger id="phaseId" className={errors.phaseId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading…' : phases.length === 0 ? 'No phases in this project' : 'Select phase'} />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Expense Category" htmlFor="category" required>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Expense Details">
              <TextField label="Description" id="description" required placeholder="e.g. Cement purchase from ABC Supplier" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Expense Date" id="expenseDate" type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                <TextField label="Bill / Invoice Number" id="billNo" placeholder="e.g. INV-2024-001" value={billNo} onChange={e => setBillNo(e.target.value)} />
              </div>

              {showQty && (
                <div className="grid grid-cols-3 gap-3">
                  <TextField label="Quantity" id="quantity" type="number" min={0} step="0.001" placeholder="e.g. 3828" value={quantity} onChange={e => setQuantity(e.target.value)} />
                  <Field label="Unit" htmlFor="unit">
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger id="unit"><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <TextField label="Unit Price (৳)" id="unitPrice" type="number" min={0} step="0.01" placeholder="e.g. 520" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} hint="Amount auto-calculated" />
                </div>
              )}

              <TextField label="Total Amount (৳)" id="amount" type="number" min={0.01} step="0.01" required placeholder="e.g. 45000" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} />
            </FormSection>

            <FormSection title="Supplier (optional)">
              <Field label="Supplier / Vendor" htmlFor="supplierId">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplierId"><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER}>— No supplier —</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <TextareaField label="Notes (optional)" id="notes" placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[130px]">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Expense'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
