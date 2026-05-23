'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'ROD_STEEL', label: 'Rod / Steel' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'STONE_AGGREGATE', label: 'Stone / Aggregate' },
  { value: 'SAND', label: 'Sand' },
  { value: 'BRICK', label: 'Brick' },
  { value: 'READYMIX_CONCRETE', label: 'Readymix Concrete' },
  { value: 'TIMBER_SHUTTERING', label: 'Timber / Shuttering' },
  { value: 'PAINT', label: 'Paint' },
  { value: 'TILES', label: 'Tiles' },
  { value: 'SANITARY_FITTINGS', label: 'Sanitary Fittings' },
  { value: 'ELECTRICAL_MATERIAL', label: 'Electrical Material' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'CHEMICAL', label: 'Chemical / Waterproofing' },
  { value: 'LABOUR_BILL', label: 'Labour Bill' },
  { value: 'CONTRACTOR_BILL', label: 'Contractor Bill' },
  { value: 'SECURITY_SALARY', label: 'Security Salary' },
  { value: 'SITE_STAFF_SALARY', label: 'Site Staff Salary' },
  { value: 'WATER_BILL', label: 'Water Bill' },
  { value: 'ELECTRICITY_BILL', label: 'Electricity Bill / Meter Recharge' },
  { value: 'SITE_FOOD_HOSPITALITY', label: 'Site Food / Hospitality' },
  { value: 'TRANSPORT', label: 'Transport / Carriage' },
  { value: 'EQUIPMENT_HIRE', label: 'Equipment / Motor Hire' },
  { value: 'SURVEY_DRAWING', label: 'Survey / Drawing / Design' },
  { value: 'LEGAL_REGISTRATION', label: 'Legal / Registration' },
  { value: 'MUNICIPALITY_FEE', label: 'Municipality / RAJUK Fee' },
  { value: 'BANK_CHARGE', label: 'Bank Charge' },
  { value: 'SERVICE_CHARGE', label: 'Service Charge (Company)' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking' },
  { value: 'OTHER', label: 'Other' },
];

const UNITS = ['kg', 'ton', 'bag', 'cft', 'sft', 'rft', 'pcs', 'truck', 'trip', 'nos', 'ls'];
const NO_SUPPLIER = '__none';
const MATERIAL_CATS = new Set(['ROD_STEEL', 'CEMENT', 'STONE_AGGREGATE', 'SAND', 'BRICK', 'READYMIX_CONCRETE', 'TIMBER_SHUTTERING', 'PAINT', 'TILES', 'HARDWARE', 'TRANSPORT']);

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function ProjectExpenseNewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [phases, setPhases] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string; isDefault?: boolean }[]>([]);

  const [phaseId, setPhaseId] = useState(searchParams.get('phaseId') ?? '');
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [supplierId, setSupplierId] = useState(NO_SUPPLIER);
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [billNo, setBillNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeBranchName, setChequeBranchName] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/phases?projectId=${projectId}`).then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json()),
      fetch('/api/company/accounts').then((r) => r.json()),
    ])
      .then(([phasesResponse, suppliersResponse, accountsResponse]) => {
        setPhases(Array.isArray(phasesResponse) ? phasesResponse : []);
        setSuppliers(Array.isArray(suppliersResponse) ? suppliersResponse : []);
        const accountList = Array.isArray(accountsResponse) ? accountsResponse : [];
        setAccounts(accountList);
        if (accountList.length > 0) {
          const defaultAccount = accountList.find((account) => account.isDefault) ?? accountList[0];
          setAccountId(defaultAccount.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const q = parseFloat(quantity);
    const p = parseFloat(unitPrice);
    if (!Number.isNaN(q) && !Number.isNaN(p) && q > 0 && p > 0) {
      setAmount((q * p).toFixed(2));
    }
  }, [quantity, unitPrice]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!phaseId) nextErrors.phaseId = 'Please select a phase.';
    if (!accountId) nextErrors.accountId = 'Please select the paying account.';
    if (!description.trim()) nextErrors.description = 'Description is required.';
    const numericAmount = parseFloat(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) nextErrors.amount = 'Enter a valid amount.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        phaseId,
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        expenseDate,
        accountId,
        paymentMethod,
      };
      if (supplierId !== NO_SUPPLIER) {
        body.supplierId = supplierId;
        body.supplierMode = 'EXISTING_SUPPLIER';
      } else {
        body.supplierMode = 'NO_SUPPLIER';
      }
      if (billNo.trim()) body.billNo = billNo.trim();
      if (referenceNo.trim()) body.referenceNo = referenceNo.trim();
      if (notes.trim()) body.notes = notes.trim();
      if (quantity && !Number.isNaN(parseFloat(quantity))) body.quantity = parseFloat(quantity);
      if (unit.trim()) body.unit = unit.trim();
      if (unitPrice && !Number.isNaN(parseFloat(unitPrice))) body.unitPrice = parseFloat(unitPrice);
      if (chequeNo.trim()) body.chequeNo = chequeNo.trim();
      if (chequeDate) body.chequeDate = chequeDate;
      if (bankName.trim()) body.chequeBankName = bankName.trim();
      if (chequeBranchName.trim()) body.chequeBranchName = chequeBranchName.trim();
      if (chequeMaturityDate) body.chequeMaturityDate = chequeMaturityDate;

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
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
  const showCheque = paymentMethod === 'CHEQUE';

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      <Link href={`/projects/${projectId}/expenses`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add Daily Expense</CardTitle>
          <CardDescription>Record a direct project cost and where the money went from.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormError message={error} />

            <FormSection title="Phase And Category">
              <Field label="Construction Phase" htmlFor="phaseId" required error={errors.phaseId}>
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger id="phaseId" className={errors.phaseId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading...' : phases.length === 0 ? 'No phases in this project' : 'Select phase'} />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Expense Category" htmlFor="category" required>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((categoryOption) => (
                      <SelectItem key={categoryOption.value} value={categoryOption.value}>
                        {categoryOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Expense Details">
              <TextField label="Description" id="description" required placeholder="e.g. Cement purchase from ABC Supplier" value={description} onChange={(event) => setDescription(event.target.value)} error={errors.description} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Expense Date" id="expenseDate" type="date" required value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
                <TextField label="Bill / Invoice Number" id="billNo" placeholder="e.g. INV-2024-001" value={billNo} onChange={(event) => setBillNo(event.target.value)} />
              </div>

              {showQty && (
                <div className="grid grid-cols-3 gap-3">
                  <TextField label="Quantity" id="quantity" type="number" min={0} step="0.001" placeholder="e.g. 3828" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                  <Field label="Unit" htmlFor="unit">
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger id="unit">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unitOption) => (
                          <SelectItem key={unitOption} value={unitOption}>
                            {unitOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <TextField label="Unit Price (BDT)" id="unitPrice" type="number" min={0} step="0.01" placeholder="e.g. 520" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} hint="Amount auto-calculated" />
                </div>
              )}

              <TextField label="Total Amount (BDT)" id="amount" type="number" min={0.01} step="0.01" required placeholder="e.g. 45000" value={amount} onChange={(event) => setAmount(event.target.value)} error={errors.amount} />
            </FormSection>

            <FormSection title="Money Movement">
              <Field label="Paid From Account" htmlFor="accountId" required error={errors.accountId}>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="accountId" className={errors.accountId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={accounts.length === 0 ? 'No active accounts found' : 'Select account'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.type.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Payment Method" htmlFor="paymentMethod">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <TextField label="Reference No (optional)" id="referenceNo" placeholder="e.g. TXN-001 or cash memo" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            </FormSection>

            {showCheque && (
              <FormSection title="Cheque Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Cheque Number" id="chequeNo" value={chequeNo} onChange={(event) => setChequeNo(event.target.value)} />
                  <TextField label="Cheque Date" id="chequeDate" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                  <TextField label="Bank Name" id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                  <TextField label="Branch" id="chequeBranchName" value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
                  <TextField label="Maturity Date" id="chequeMaturityDate" type="date" value={chequeMaturityDate} onChange={(event) => setChequeMaturityDate(event.target.value)} />
                </div>
              </FormSection>
            )}

            <FormSection title="Supplier (optional)">
              <Field label="Supplier / Vendor" htmlFor="supplierId">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplierId">
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER}>No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <TextareaField label="Notes (optional)" id="notes" placeholder="Additional notes..." value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[130px]">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : 'Save Expense'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
