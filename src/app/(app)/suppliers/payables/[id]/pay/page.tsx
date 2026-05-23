'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBDT } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash / Nagad)' },
  { value: 'OTHER', label: 'Other' },
];

interface Payable {
  id: string;
  billNo: string | null;
  billDate: string;
  totalAmount: number | string;
  paidAmount: number | string;
  dueAmount: number | string;
  status: string;
  supplier: { id: string; name: string };
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function RecordSupplierPaymentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const payableId = params.id;

  const [payable, setPayable] = useState<Payable | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string; isDefault?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState(today());
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeBranchName, setChequeBranchName] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/suppliers/payables/${payableId}/payments`).then((r) => r.json()),
      fetch('/api/company/accounts').then((r) => r.json()),
    ])
      .then(([payableResponse, accountsResponse]) => {
        setPayable(payableResponse);
        const accountList = Array.isArray(accountsResponse) ? accountsResponse : [];
        setAccounts(accountList);
        if (accountList.length > 0) {
          const defaultAccount = accountList.find((account) => account.isDefault) ?? accountList[0];
          setAccountId(defaultAccount.id);
        }
      })
      .catch(() => setError('Could not load payable details.'))
      .finally(() => setLoading(false));
  }, [payableId]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const numericAmount = parseFloat(amount);
    if (!accountId) nextErrors.accountId = 'Select the paying account.';
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Enter a valid amount.';
    } else if (payable && numericAmount > Number(payable.dueAmount)) {
      nextErrors.amount = `Amount cannot exceed the outstanding balance of ${formatBDT(Number(payable.dueAmount))}.`;
    }
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
        accountId,
        amount: parseFloat(amount),
        paymentMethod,
        paidAt,
      };
      if (chequeNo.trim()) body.chequeNo = chequeNo.trim();
      if (chequeDate) body.chequeDate = chequeDate;
      if (bankName.trim()) body.bankName = bankName.trim();
      if (chequeBranchName.trim()) body.chequeBranchName = chequeBranchName.trim();
      if (chequeMaturityDate) body.chequeMaturityDate = chequeMaturityDate;
      if (reference.trim()) body.reference = reference.trim();
      if (notes.trim()) body.notes = notes.trim();

      const response = await fetch(`/api/suppliers/payables/${payableId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      router.push('/suppliers/payables');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Record Payment" />
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
        </div>
      </div>
    );
  }

  if (!payable) {
    return (
      <div className="flex flex-col min-h-full">
        <Header title="Record Payment" />
        <div className="p-6 text-destructive">Could not find this payable.</div>
      </div>
    );
  }

  const dueAmount = Number(payable.dueAmount);
  const isPaid = payable.status === 'PAID';
  const showCheque = paymentMethod === 'CHEQUE';
  const showBank = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_BANKING';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Record Supplier Payment" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/suppliers/payables" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Payables
        </Link>

        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">{payable.supplier.name}</p>
            {payable.billNo && <p className="text-xs text-muted-foreground">Bill: {payable.billNo}</p>}
            <div className="flex gap-6 mt-2 text-sm">
              <div><span className="text-muted-foreground">Total: </span><strong>{formatBDT(Number(payable.totalAmount))}</strong></div>
              <div><span className="text-muted-foreground">Paid: </span><strong className="text-green-600">{formatBDT(Number(payable.paidAmount))}</strong></div>
              <div><span className="text-muted-foreground">Outstanding: </span><strong className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>{formatBDT(dueAmount)}</strong></div>
            </div>
          </CardContent>
        </Card>

        {isPaid ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-lg font-medium text-green-600">This bill is fully paid.</p>
              <p className="text-sm mt-1">No outstanding balance remaining.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Record Payment</CardTitle>
              <CardDescription>
                Outstanding balance: <strong className="text-red-600">{formatBDT(dueAmount)}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <FormError message={error} />

                <FormSection title="Payment Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Amount Paid (BDT)" id="amount" type="number" min={0.01} step="0.01" required placeholder={`Max: ${dueAmount}`} value={amount} onChange={(event) => setAmount(event.target.value)} error={errors.amount} hint={`Outstanding: ${formatBDT(dueAmount)}`} />
                    <TextField label="Payment Date" id="paidAt" type="date" required value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
                  </div>

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

                  <Field label="Payment Method" htmlFor="paymentMethod" required>
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
                </FormSection>

                {showCheque && (
                  <FormSection title="Cheque Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Cheque Number" id="chequeNo" placeholder="e.g. 0012345" value={chequeNo} onChange={(event) => setChequeNo(event.target.value)} />
                      <TextField label="Cheque Date" id="chequeDate" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                      <TextField label="Bank Name" id="bankName" placeholder="e.g. Agrani Bank" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                      <TextField label="Branch" id="chequeBranchName" placeholder="e.g. Kawlar Branch" value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
                      <TextField label="Maturity Date" id="chequeMaturityDate" type="date" value={chequeMaturityDate} onChange={(event) => setChequeMaturityDate(event.target.value)} />
                    </div>
                  </FormSection>
                )}

                {showBank && (
                  <FormSection title="Transfer Details">
                    <TextField label="Bank / Account Note" id="bankName" placeholder="e.g. Dutch Bangla Bank" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                    <TextField label="Transaction Reference" id="reference" placeholder="e.g. TXN123456" value={reference} onChange={(event) => setReference(event.target.value)} />
                  </FormSection>
                )}

                {!showBank && !showCheque && (
                  <TextField label="Reference (optional)" id="reference" placeholder="e.g. memo or mobile transaction id" value={reference} onChange={(event) => setReference(event.target.value)} />
                )}

                <TextareaField label="Notes (optional)" id="notes" placeholder="Any notes about this payment..." value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving} className="min-w-[140px]">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Record Payment'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
