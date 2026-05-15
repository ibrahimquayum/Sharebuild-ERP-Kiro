'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatBDT } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'CASH',           label: 'Cash' },
  { value: 'CHEQUE',         label: 'Cheque' },
  { value: 'BANK_TRANSFER',  label: 'Bank Transfer' },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash / Nagad)' },
  { value: 'OTHER',          label: 'Other' },
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

export default function RecordSupplierPaymentPage() {
  const router     = useRouter();
  const params     = useParams<{ id: string }>();
  const payableId  = params.id;

  const [payable, setPayable] = useState<Payable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const [amount,        setAmount]        = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paidAt,        setPaidAt]        = useState(today());
  const [chequeNo,      setChequeNo]      = useState('');
  const [chequeDate,    setChequeDate]    = useState('');
  const [bankName,      setBankName]      = useState('');
  const [reference,     setReference]     = useState('');
  const [notes,         setNotes]         = useState('');

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  useEffect(() => {
    fetch(`/api/suppliers/payables/${payableId}/payments`)
      .then(r => r.json())
      .then(data => setPayable(data))
      .catch(() => setError('Could not load payable details.'))
      .finally(() => setLoading(false));
  }, [payableId]);

  function validate() {
    const e: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid amount.';
    } else if (payable && amt > Number(payable.dueAmount)) {
      e.amount = `Amount cannot exceed the outstanding balance of ${formatBDT(Number(payable.dueAmount))}.`;
    }
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
        amount: parseFloat(amount),
        paymentMethod,
        paidAt,
      };
      if (chequeNo.trim())  body.chequeNo  = chequeNo.trim();
      if (chequeDate)       body.chequeDate = chequeDate;
      if (bankName.trim())  body.bankName  = bankName.trim();
      if (reference.trim()) body.reference = reference.trim();
      if (notes.trim())     body.notes     = notes.trim();

      const res = await fetch(`/api/suppliers/payables/${payableId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
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

  const dueAmount   = Number(payable.dueAmount);
  const isPaid      = payable.status === 'PAID';
  const showCheque  = paymentMethod === 'CHEQUE';
  const showBank    = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_BANKING';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Record Supplier Payment" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/suppliers/payables" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Payables
        </Link>

        {/* Payable summary */}
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
              <p className="text-lg font-medium text-green-600">✅ This bill is fully paid.</p>
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
                    <TextField
                      label="Amount Paid (৳)"
                      id="amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      placeholder={`Max: ${dueAmount}`}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      error={errors.amount}
                      hint={`Outstanding: ${formatBDT(dueAmount)}`}
                    />
                    <TextField
                      label="Payment Date"
                      id="paidAt"
                      type="date"
                      required
                      value={paidAt}
                      onChange={e => setPaidAt(e.target.value)}
                    />
                  </div>

                  <Field label="Payment Method" htmlFor="paymentMethod" required>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FormSection>

                {showCheque && (
                  <FormSection title="Cheque Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Cheque Number" id="chequeNo" placeholder="e.g. 0012345" value={chequeNo} onChange={e => setChequeNo(e.target.value)} />
                      <TextField label="Cheque Date"   id="chequeDate" type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                    </div>
                    <TextField label="Bank Name" id="bankName" placeholder="e.g. Agrani Bank" value={bankName} onChange={e => setBankName(e.target.value)} />
                  </FormSection>
                )}

                {showBank && (
                  <FormSection title="Transfer Details">
                    <TextField label="Bank / Account" id="bankName" placeholder="e.g. Dutch Bangla Bank" value={bankName} onChange={e => setBankName(e.target.value)} />
                    <TextField label="Transaction Reference" id="reference" placeholder="e.g. TXN123456" value={reference} onChange={e => setReference(e.target.value)} />
                  </FormSection>
                )}

                <TextareaField
                  label="Notes (optional)"
                  id="notes"
                  placeholder="Any notes about this payment..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving} className="min-w-[140px]">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Record Payment'}
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
