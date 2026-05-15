'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PAYMENT_METHODS = [
  { value: 'CASH',           label: 'Cash' },
  { value: 'CHEQUE',         label: 'Cheque' },
  { value: 'BANK_TRANSFER',  label: 'Bank Transfer' },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash / Nagad)' },
  { value: 'OTHER',          label: 'Other' },
];

export default function RecordPaymentPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remote data
  const [buyers,  setBuyers]  = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [phases,  setPhases]  = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [buyerId,       setBuyerId]       = useState(searchParams.get('buyerId') ?? '');
  const [phaseId,       setPhaseId]       = useState(searchParams.get('phaseId') ?? '');
  const [amount,        setAmount]        = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [receivedDate,  setReceivedDate]  = useState(today());
  const [receiptNo,     setReceiptNo]     = useState('');
  const [chequeNo,      setChequeNo]      = useState('');
  const [chequeDate,    setChequeDate]    = useState('');
  const [bankName,      setBankName]      = useState('');
  const [reference,     setReference]     = useState('');
  const [notes,         setNotes]         = useState('');

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/buyers').then(r => r.json()),
      fetch('/api/phases').then(r => r.json()),
    ])
      .then(([b, p]) => {
        setBuyers(Array.isArray(b) ? b : []);
        setPhases(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!buyerId)  e.buyerId  = 'Please select a buyer.';
    if (!phaseId)  e.phaseId  = 'Please select a phase.';
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Enter a valid amount greater than zero.';
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
        buyerId,
        phaseId,
        amount: parseFloat(amount),
        paymentMethod,
        receivedDate,
      };
      if (receiptNo)  body.receiptNo  = receiptNo.trim();
      if (chequeNo)   body.chequeNo   = chequeNo.trim();
      if (chequeDate) body.chequeDate = chequeDate;
      if (bankName)   body.bankName   = bankName.trim();
      if (reference)  body.reference  = reference.trim();
      if (notes)      body.notes      = notes.trim();

      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      // Redirect to the buyer's profile to show the updated history
      router.push(`/buyers/${buyerId}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const showChequeFields = paymentMethod === 'CHEQUE';
  const showBankFields   = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_BANKING';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Record Payment" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/collections" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Collections
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Record Buyer Payment</CardTitle>
            <CardDescription>
              Record money received from a buyer for a specific phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormError message={error} />

              <FormSection title="Who Paid & For Which Phase">
                <Field label="Buyer / Investor" htmlFor="buyerId" required error={errors.buyerId}>
                  <Select value={buyerId} onValueChange={setBuyerId}>
                    <SelectTrigger id="buyerId" className={errors.buyerId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loading ? 'Loading…' : 'Select buyer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}{b.phone ? ` — ${b.phone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Phase / Construction Stage" htmlFor="phaseId" required error={errors.phaseId}>
                  <Select value={phaseId} onValueChange={setPhaseId}>
                    <SelectTrigger id="phaseId" className={errors.phaseId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loading ? 'Loading…' : 'Select phase'} />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FormSection>

              <FormSection title="Payment Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Amount Received (৳)"
                    id="amount"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    placeholder="e.g. 250000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    error={errors.amount}
                  />
                  <TextField
                    label="Date Received"
                    id="receivedDate"
                    type="date"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
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

                <TextField
                  label="Receipt Number (optional)"
                  id="receiptNo"
                  placeholder="e.g. RCP-2024-001"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                />
              </FormSection>

              {/* Cheque fields — shown only when method is Cheque */}
              {showChequeFields && (
                <FormSection title="Cheque Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Cheque Number"
                      id="chequeNo"
                      placeholder="e.g. 0012345"
                      value={chequeNo}
                      onChange={e => setChequeNo(e.target.value)}
                    />
                    <TextField
                      label="Cheque Date"
                      id="chequeDate"
                      type="date"
                      value={chequeDate}
                      onChange={e => setChequeDate(e.target.value)}
                    />
                  </div>
                  <TextField
                    label="Bank Name"
                    id="bankName"
                    placeholder="e.g. Islami Bank Bangladesh"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                </FormSection>
              )}

              {/* Bank/Mobile fields */}
              {showBankFields && (
                <FormSection title="Transfer Details">
                  <TextField
                    label="Bank / Account Name"
                    id="bankName"
                    placeholder="e.g. Dutch Bangla Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                  <TextField
                    label="Transaction / Reference Number"
                    id="reference"
                    placeholder="e.g. TXN123456 or bKash TrxID"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                  />
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
      </div>
    </div>
  );
}
