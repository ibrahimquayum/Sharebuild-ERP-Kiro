'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const SUPPLIER_TYPES = [
  { value: 'MATERIAL_SUPPLIER', label: 'Material Supplier (Rod, Cement, Stone…)' },
  { value: 'LABOUR_CONTRACTOR', label: 'Labour Contractor' },
  { value: 'EQUIPMENT_SUPPLIER', label: 'Equipment / Machinery Supplier' },
  { value: 'SERVICE_PROVIDER',   label: 'Service Provider (Electric, Plumbing…)' },
  { value: 'CONSULTANT',         label: 'Consultant / Engineer' },
];

export default function AddSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name,          setName]          = useState('');
  const [nameBn,        setNameBn]        = useState('');
  const [supplierType,  setSupplierType]  = useState('MATERIAL_SUPPLIER');
  const [phone,         setPhone]         = useState('');
  const [email,         setEmail]         = useState('');
  const [address,       setAddress]       = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [bankName,      setBankName]      = useState('');
  const [bankAccount,   setBankAccount]   = useState('');
  const [notes,         setNotes]         = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Supplier name is required.';
    if (phone && !/^[\d\s\-+()]{6,15}$/.test(phone)) e.phone = 'Enter a valid phone number.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameBn:        nameBn.trim()        || undefined,
          supplierType,
          phone:         phone.trim()         || undefined,
          email:         email.trim()         || undefined,
          address:       address.trim()       || undefined,
          contactPerson: contactPerson.trim() || undefined,
          bankName:      bankName.trim()      || undefined,
          bankAccount:   bankAccount.trim()   || undefined,
          notes:         notes.trim()         || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      router.push('/company/suppliers');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Add Supplier" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/company/suppliers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Suppliers
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add Supplier / Vendor</CardTitle>
            <CardDescription>
              Register a material supplier, contractor, or service provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormError message={error} />

              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Supplier / Business Name"
                    id="name"
                    required
                    placeholder="e.g. ABC Trading Co."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    error={errors.name}
                  />
                  <TextField
                    label="Name in Bangla (optional)"
                    id="nameBn"
                    placeholder="এবিসি ট্রেডিং কোং"
                    value={nameBn}
                    onChange={e => setNameBn(e.target.value)}
                    className="bn"
                  />
                </div>

                <Field label="Supplier Type" htmlFor="supplierType" required>
                  <Select value={supplierType} onValueChange={setSupplierType}>
                    <SelectTrigger id="supplierType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <TextField
                  label="Contact Person Name"
                  id="contactPerson"
                  placeholder="e.g. Md. Rahim"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                />
              </FormSection>

              <FormSection title="Contact Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Phone Number"
                    id="phone"
                    type="tel"
                    placeholder="01711000000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                  <TextField
                    label="Email Address (optional)"
                    id="email"
                    type="email"
                    placeholder="supplier@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    error={errors.email}
                  />
                </div>
                <TextareaField
                  label="Address"
                  id="address"
                  placeholder="Shop / office address..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                />
              </FormSection>

              <FormSection title="Bank Details (for payments)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Bank Name"
                    id="bankName"
                    placeholder="e.g. Sonali Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                  <TextField
                    label="Account Number"
                    id="bankAccount"
                    placeholder="e.g. 2001234567890"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                  />
                </div>
              </FormSection>

              <TextareaField
                label="Notes (optional)"
                id="notes"
                placeholder="Credit terms, past experience, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="min-w-[140px]">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save Supplier'}
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
