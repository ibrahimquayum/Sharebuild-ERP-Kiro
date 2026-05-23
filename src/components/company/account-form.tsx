'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AccountInput = {
  id?: string;
  name: string;
  type: 'CASH' | 'BANK' | 'MOBILE_BANKING' | 'CHEQUE_CLEARING' | 'OTHER';
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  mobileProvider?: 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER' | null;
  openingBalance?: number | string | null;
  currency?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  notes?: string | null;
};

export function AccountForm({ initialAccount }: { initialAccount?: AccountInput }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(initialAccount?.name ?? '');
  const [type, setType] = useState<AccountInput['type']>(initialAccount?.type ?? 'CASH');
  const [bankName, setBankName] = useState(initialAccount?.bankName ?? '');
  const [branchName, setBranchName] = useState(initialAccount?.branchName ?? '');
  const [accountNumber, setAccountNumber] = useState(initialAccount?.accountNumber ?? '');
  const [accountHolderName, setAccountHolderName] = useState(initialAccount?.accountHolderName ?? '');
  const [mobileProvider, setMobileProvider] = useState(initialAccount?.mobileProvider ?? 'BKASH');
  const [openingBalance, setOpeningBalance] = useState(String(initialAccount?.openingBalance ?? 0));
  const [currency, setCurrency] = useState(initialAccount?.currency ?? 'BDT');
  const [isDefault, setIsDefault] = useState(Boolean(initialAccount?.isDefault));
  const [isActive, setIsActive] = useState(initialAccount?.isActive ?? true);
  const [notes, setNotes] = useState(initialAccount?.notes ?? '');

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Account name is required.';
    if (!openingBalance || Number.isNaN(Number(openingBalance)) || Number(openingBalance) < 0) nextErrors.openingBalance = 'Opening balance must be zero or greater.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        branchName: branchName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountHolderName: accountHolderName.trim() || undefined,
        mobileProvider: type === 'MOBILE_BANKING' ? mobileProvider : undefined,
        openingBalance: Number(openingBalance),
        currency: currency.trim() || 'BDT',
        isDefault,
        isActive,
        notes: notes.trim() || undefined,
      };

      const endpoint = initialAccount?.id ? `/api/company/accounts/${initialAccount.id}` : '/api/company/accounts';
      const method = initialAccount?.id ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : data.error?.formErrors?.[0] ?? 'Failed to save account.');
        return;
      }
      router.push(initialAccount?.id ? `/company/accounts/${initialAccount.id}` : `/company/accounts/${data.id}`);
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

      <FormSection title="Account Details">
        <TextField label="Account Name" id="name" required value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
        <Field label="Account Type" htmlFor="type">
          <Select value={type} onValueChange={(value: AccountInput['type']) => setType(value)}>
            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="BANK">Bank</SelectItem>
              <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
              <SelectItem value="CHEQUE_CLEARING">Cheque Clearing</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Opening Balance" id="openingBalance" type="number" min={0} step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} error={errors.openingBalance} />
          <TextField label="Currency" id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} />
        </div>
      </FormSection>

      {(type === 'BANK' || type === 'CHEQUE_CLEARING') && (
        <FormSection title="Bank Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Bank Name" id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
            <TextField label="Branch Name" id="branchName" value={branchName} onChange={(event) => setBranchName(event.target.value)} />
            <TextField label="Account Number" id="accountNumber" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
            <TextField label="Account Holder Name" id="accountHolderName" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} />
          </div>
        </FormSection>
      )}

      {type === 'MOBILE_BANKING' && (
        <FormSection title="Mobile Banking">
          <Field label="Provider" htmlFor="mobileProvider">
            <Select value={mobileProvider ?? 'BKASH'} onValueChange={(value: 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER') => setMobileProvider(value)}>
              <SelectTrigger id="mobileProvider"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BKASH">bKash</SelectItem>
                <SelectItem value="NAGAD">Nagad</SelectItem>
                <SelectItem value="ROCKET">Rocket</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Account Holder / Merchant Name" id="mobileAccountHolderName" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} />
          <TextField label="Account Number / Wallet" id="mobileAccountNumber" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
        </FormSection>
      )}

      <FormSection title="Status">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
          Set as default account
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Active account
        </label>
      </FormSection>

      <TextareaField label="Notes" id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : initialAccount?.id ? 'Save Changes' : 'Create Account'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
