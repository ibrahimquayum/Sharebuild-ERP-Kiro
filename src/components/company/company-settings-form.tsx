'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormError, FormSuccess, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Loader2 } from 'lucide-react';

type CompanySettingsData = {
  name: string;
  nameBn?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  defaultCurrency?: string;
  receiptPrefix?: string;
  defaultServiceChargePct?: string;
  fiscalYearStart?: string;
  notes?: string;
};

export function CompanySettingsForm({ initial }: { initial: CompanySettingsData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState(initial.name ?? '');
  const [nameBn, setNameBn] = useState(initial.nameBn ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');
  const [defaultCurrency, setDefaultCurrency] = useState(initial.defaultCurrency ?? 'BDT');
  const [receiptPrefix, setReceiptPrefix] = useState(initial.receiptPrefix ?? 'RCP');
  const [defaultServiceChargePct, setDefaultServiceChargePct] = useState(initial.defaultServiceChargePct ?? '');
  const [fiscalYearStart, setFiscalYearStart] = useState(initial.fiscalYearStart ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/company/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameBn: nameBn.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          website: website.trim() || undefined,
          defaultCurrency: defaultCurrency.trim() || 'BDT',
          receiptPrefix: receiptPrefix.trim() || undefined,
          defaultServiceChargePct: defaultServiceChargePct ? Number(defaultServiceChargePct) : undefined,
          fiscalYearStart: fiscalYearStart.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.formErrors?.[0] ?? data?.error ?? 'Failed to save company settings.');
        return;
      }

      setSuccess('Company settings saved.');
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={error} />
      <FormSuccess message={success} />

      <FormSection title="Company Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Company Name" id="companyName" required value={name} onChange={e => setName(e.target.value)} />
          <TextField label="Bangla Name" id="companyNameBn" value={nameBn} onChange={e => setNameBn(e.target.value)} className="bn" />
          <TextField label="Phone" id="companyPhone" value={phone} onChange={e => setPhone(e.target.value)} />
          <TextField label="Email" id="companyEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField label="Website" id="companyWebsite" value={website} onChange={e => setWebsite(e.target.value)} />
          <TextField label="Logo Placeholder URL" id="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
        </div>
        <TextareaField label="Address" id="companyAddress" value={address} onChange={e => setAddress(e.target.value)} rows={2} />
      </FormSection>

      <FormSection title="Defaults">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Default Currency" id="defaultCurrency" value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} />
          <TextField label="Receipt Prefix" id="receiptPrefix" value={receiptPrefix} onChange={e => setReceiptPrefix(e.target.value)} />
          <TextField label="Default Service Charge %" id="defaultServiceChargePct" type="number" min={0} step="0.01" value={defaultServiceChargePct} onChange={e => setDefaultServiceChargePct(e.target.value)} />
          <TextField label="Fiscal Year Start" id="fiscalYearStart" placeholder="e.g. July 1" value={fiscalYearStart} onChange={e => setFiscalYearStart(e.target.value)} />
        </div>
        <TextareaField label="Notes" id="companyNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </FormSection>

      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Company Settings'}
      </Button>
    </form>
  );
}
