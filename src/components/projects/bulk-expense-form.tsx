'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  ['ROD_STEEL', 'Rod / Steel'],
  ['CEMENT', 'Cement'],
  ['STONE_AGGREGATE', 'Stone / Aggregate'],
  ['SAND', 'Sand'],
  ['BRICK', 'Brick'],
  ['READYMIX_CONCRETE', 'Readymix Concrete'],
  ['TIMBER_SHUTTERING', 'Timber / Shuttering'],
  ['PAINT', 'Paint'],
  ['TILES', 'Tiles'],
  ['SANITARY_FITTINGS', 'Sanitary Fittings'],
  ['ELECTRICAL_MATERIAL', 'Electrical Material'],
  ['HARDWARE', 'Hardware'],
  ['LABOUR_BILL', 'Labour Bill'],
  ['CONTRACTOR_BILL', 'Contractor Bill'],
  ['TRANSPORT', 'Transport'],
  ['OTHER', 'Other'],
] as const;

const PAYMENT_METHODS = [
  ['CASH', 'Cash'],
  ['CHEQUE', 'Cheque'],
  ['BANK_TRANSFER', 'Bank Transfer'],
  ['MOBILE_BANKING', 'Mobile Banking'],
  ['OTHER', 'Other'],
] as const;

type Option = { id: string; label: string };
type Row = {
  expenseDate: string;
  phaseId: string;
  accountId: string;
  category: string;
  description: string;
  supplierMode: 'EXISTING_SUPPLIER' | 'LOCAL_SHOP' | 'NO_SUPPLIER';
  supplierId: string;
  localShopName: string;
  localShopPhone: string;
  amount: string;
  paymentMethod: string;
  referenceNo: string;
  chequeNo: string;
  chequeDate: string;
  chequeBankName: string;
  chequeBranchName: string;
  chequeMaturityDate: string;
  billNo: string;
  notes: string;
  voucher?: File | null;
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function blankRow(defaultPhaseId = '', defaultAccountId = ''): Row {
  return {
    expenseDate: today(),
    phaseId: defaultPhaseId,
    accountId: defaultAccountId,
    category: 'OTHER',
    description: '',
    supplierMode: 'NO_SUPPLIER',
    supplierId: '',
    localShopName: '',
    localShopPhone: '',
    amount: '',
    paymentMethod: 'CASH',
    referenceNo: '',
    chequeNo: '',
    chequeDate: '',
    chequeBankName: '',
    chequeBranchName: '',
    chequeMaturityDate: '',
    billNo: '',
    notes: '',
    voucher: null,
  };
}

export function BulkExpenseForm({
  projectId,
  phases,
  suppliers,
  accounts,
}: {
  projectId: string;
  phases: Option[];
  suppliers: Option[];
  accounts: Option[];
}) {
  const router = useRouter();
  const defaultPhaseId = phases[0]?.id ?? '';
  const defaultAccountId = accounts[0]?.id ?? '';
  const [rows, setRows] = useState<Row[]>([blankRow(defaultPhaseId, defaultAccountId)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function validate() {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row.phaseId) return `Row ${index + 1}: select a phase.`;
      if (!row.accountId) return `Row ${index + 1}: select an account.`;
      if (!row.description.trim()) return `Row ${index + 1}: description is required.`;
      if (!row.amount || Number(row.amount) <= 0) return `Row ${index + 1}: enter a valid amount.`;
      if (row.supplierMode === 'EXISTING_SUPPLIER' && !row.supplierId) return `Row ${index + 1}: select a supplier.`;
      if (row.supplierMode === 'LOCAL_SHOP' && !row.localShopName.trim()) return `Row ${index + 1}: enter the local shop/person name.`;
    }
    return '';
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();
    formData.set(
      'rows',
      JSON.stringify(
        rows.map((row) => ({
          expenseDate: row.expenseDate,
          phaseId: row.phaseId,
          accountId: row.accountId,
          category: row.category,
          description: row.description.trim(),
          supplierMode: row.supplierMode,
          supplierId: row.supplierMode === 'EXISTING_SUPPLIER' ? row.supplierId : undefined,
          localShopName: row.supplierMode === 'LOCAL_SHOP' ? row.localShopName.trim() : undefined,
          localShopPhone: row.supplierMode === 'LOCAL_SHOP' ? row.localShopPhone.trim() : undefined,
          amount: Number(row.amount),
          paymentMethod: row.paymentMethod,
          referenceNo: row.referenceNo.trim() || undefined,
          chequeNo: row.chequeNo.trim() || undefined,
          chequeDate: row.chequeDate || undefined,
          chequeBankName: row.chequeBankName.trim() || undefined,
          chequeBranchName: row.chequeBranchName.trim() || undefined,
          chequeMaturityDate: row.chequeMaturityDate || undefined,
          billNo: row.billNo.trim() || undefined,
          notes: row.notes.trim() || undefined,
        })),
      ),
    );
    rows.forEach((row, index) => {
      if (row.voucher) formData.set(`voucher-${index}`, row.voucher);
    });

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/expenses/bulk`, { method: 'POST', body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : json.error?.formErrors?.[0] ?? 'Failed to save bulk expenses.');
        return;
      }
      router.push(`/projects/${projectId}/expenses`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError message={error} />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1700px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-left">Account</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Supplier Type</th>
              <th className="px-3 py-2 text-left">Supplier / Shop</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Payment</th>
              <th className="px-3 py-2 text-left">Reference</th>
              <th className="px-3 py-2 text-left">Cheque</th>
              <th className="px-3 py-2 text-left">Bill / Voucher No</th>
              <th className="px-3 py-2 text-left">Voucher</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b align-top">
                <td className="px-3 py-2"><input type="date" value={row.expenseDate} onChange={(e) => updateRow(index, { expenseDate: e.target.value })} className="h-9 rounded-md border px-2" /></td>
                <td className="px-3 py-2">
                  <Select value={row.phaseId} onValueChange={(value) => updateRow(index, { phaseId: value })}>
                    <SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger>
                    <SelectContent>{phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={row.accountId} onValueChange={(value) => updateRow(index, { accountId: value })}>
                    <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                    <SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={row.category} onValueChange={(value) => updateRow(index, { category: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2"><input value={row.description} onChange={(e) => updateRow(index, { description: e.target.value })} className="h-9 w-56 rounded-md border px-2" placeholder="What was purchased or paid?" /></td>
                <td className="px-3 py-2">
                  <Select value={row.supplierMode} onValueChange={(value: Row['supplierMode']) => updateRow(index, { supplierMode: value, supplierId: '', localShopName: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_SUPPLIER">No supplier / cash</SelectItem>
                      <SelectItem value="LOCAL_SHOP">One-time local shop</SelectItem>
                      <SelectItem value="EXISTING_SUPPLIER">Existing supplier</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  {row.supplierMode === 'EXISTING_SUPPLIER' ? (
                    <Select value={row.supplierId} onValueChange={(value) => updateRow(index, { supplierId: value })}>
                      <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : row.supplierMode === 'LOCAL_SHOP' ? (
                    <div className="space-y-1">
                      <input value={row.localShopName} onChange={(e) => updateRow(index, { localShopName: e.target.value })} className="h-9 w-44 rounded-md border px-2" placeholder="Shop/person name" />
                      <input value={row.localShopPhone} onChange={(e) => updateRow(index, { localShopPhone: e.target.value })} className="h-8 w-44 rounded-md border px-2 text-xs" placeholder="Phone optional" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Cash/site expense</span>
                  )}
                </td>
                <td className="px-3 py-2"><input type="number" min={0.01} step="0.01" value={row.amount} onChange={(e) => updateRow(index, { amount: e.target.value })} className="h-9 w-28 rounded-md border px-2 text-right" /></td>
                <td className="px-3 py-2">
                  <Select value={row.paymentMethod} onValueChange={(value) => updateRow(index, { paymentMethod: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <input value={row.referenceNo} onChange={(e) => updateRow(index, { referenceNo: e.target.value })} className="h-9 w-36 rounded-md border px-2" placeholder="Ref / memo" />
                </td>
                <td className="px-3 py-2">
                  {row.paymentMethod === 'CHEQUE' ? (
                    <div className="space-y-1">
                      <input value={row.chequeNo} onChange={(e) => updateRow(index, { chequeNo: e.target.value })} className="h-8 w-32 rounded-md border px-2 text-xs" placeholder="Cheque no" />
                      <input type="date" value={row.chequeDate} onChange={(e) => updateRow(index, { chequeDate: e.target.value })} className="h-8 w-36 rounded-md border px-2 text-xs" />
                      <input value={row.chequeBankName} onChange={(e) => updateRow(index, { chequeBankName: e.target.value })} className="h-8 w-36 rounded-md border px-2 text-xs" placeholder="Bank" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input value={row.billNo} onChange={(e) => updateRow(index, { billNo: e.target.value })} className="h-9 w-36 rounded-md border px-2" placeholder="Bill / voucher" />
                </td>
                <td className="px-3 py-2">
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => updateRow(index, { voucher: e.target.files?.[0] ?? null })} className="w-40 text-xs" />
                  {!row.voucher && <div className="text-xs text-amber-600">Missing voucher</div>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, blankRow(current[0]?.phaseId ?? defaultPhaseId, current[0]?.accountId ?? defaultAccountId)])}>
          <Plus className="mr-2 h-4 w-4" /> Add Row
        </Button>
        <div className="text-sm font-semibold">Total: BDT {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <Field label="Approval Status" htmlFor="bulkStatus" hint="Engineer and site staff entries save as Pending Approval. Accounts and Management can approve later. Cash movement posts when the row becomes final.">
        <TextField id="bulkStatus" label="" value="Draft / Pending Approval by role" readOnly />
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Submit Bulk Expenses'}
      </Button>
    </form>
  );
}
