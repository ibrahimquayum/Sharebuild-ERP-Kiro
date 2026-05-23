'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextField, TextareaField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AccountOption = { id: string; label: string };

function today() {
  return new Date().toISOString().split('T')[0];
}

export function AccountTransferForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!fromAccountId || !toAccountId) {
      setError('Select both source and destination accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Transfer source and destination must be different.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/company/accounts/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          transferDate,
          referenceNo: referenceNo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to post account transfer.');
        return;
      }
      router.push('/company/accounts/transfers');
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
      <FormSection title="Transfer Details">
        <Field label="From Account" htmlFor="fromAccountId" required>
          <Select value={fromAccountId} onValueChange={setFromAccountId}>
            <SelectTrigger id="fromAccountId"><SelectValue placeholder="Select source account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="To Account" htmlFor="toAccountId" required>
          <Select value={toAccountId} onValueChange={setToAccountId}>
            <SelectTrigger id="toAccountId"><SelectValue placeholder="Select destination account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Amount" id="amount" type="number" min={0.01} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
        <TextField label="Transfer Date" id="transferDate" type="date" required value={transferDate} onChange={(event) => setTransferDate(event.target.value)} />
        <TextField label="Reference No" id="referenceNo" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
      </FormSection>

      <TextareaField label="Notes" id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Transfer'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
