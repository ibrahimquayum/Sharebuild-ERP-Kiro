'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextField, TextareaField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function RetentionReleasePage() {
  const params = useParams<{ id: string; payableId: string }>();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeBranchName, setChequeBranchName] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string; isDefault?: boolean }[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/company/accounts').then((response) => response.json()).then((data) => {
      const list = Array.isArray(data) ? data : [];
      setAccounts(list);
      const defaultAccount = list.find((item) => item.isDefault) ?? list[0];
      if (defaultAccount) setAccountId(defaultAccount.id);
    }).catch(() => {});
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid retention release amount.');
      return;
    }
    if (!accountId) {
      setError('Select a payment account.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/suppliers/payables/${params.payableId}/retention-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          accountId,
          paymentMethod,
          paidAt,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          chequeNo: chequeNo.trim() || undefined,
          chequeDate: chequeDate || undefined,
          bankName: bankName.trim() || undefined,
          chequeBranchName: chequeBranchName.trim() || undefined,
          chequeMaturityDate: chequeMaturityDate || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to release retention.');
        return;
      }
      router.push(`/projects/${params.id}/payables/${params.payableId}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      <h1 className="text-base font-semibold">Release Retention / Security</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormError message={error} />
        <FormSection title="Release Details">
          <TextField label="Release Amount" id="amount" type="number" min={0.01} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Field label="Pay From Account" htmlFor="accountId">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="accountId"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name} - {account.type.replaceAll('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment Method" htmlFor="paymentMethod">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Release Date" id="paidAt" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
          <TextField label="Reference" id="reference" value={reference} onChange={(event) => setReference(event.target.value)} />
          {paymentMethod === 'CHEQUE' && (
            <>
              <TextField label="Cheque No" id="chequeNo" value={chequeNo} onChange={(event) => setChequeNo(event.target.value)} />
              <TextField label="Cheque Date" id="chequeDate" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
              <TextField label="Bank Name" id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
              <TextField label="Branch" id="chequeBranchName" value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
              <TextField label="Maturity Date" id="chequeMaturityDate" type="date" value={chequeMaturityDate} onChange={(event) => setChequeMaturityDate(event.target.value)} />
            </>
          )}
        </FormSection>
        <TextareaField label="Notes" id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Releasing...</> : 'Release Retention'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
