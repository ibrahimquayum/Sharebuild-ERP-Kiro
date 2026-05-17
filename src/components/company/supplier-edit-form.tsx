'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Loader2 } from 'lucide-react';

const SUPPLIER_TYPES = [
  'MATERIAL_SUPPLIER',
  'LABOUR_CONTRACTOR',
  'EQUIPMENT_SUPPLIER',
  'SERVICE_PROVIDER',
  'CONSULTANT',
];

export function SupplierEditForm({ supplier }: { supplier: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: supplier.name ?? '',
    nameBn: supplier.nameBn ?? '',
    supplierType: supplier.supplierType ?? 'MATERIAL_SUPPLIER',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    contactPerson: supplier.contactPerson ?? '',
    bankName: supplier.bankName ?? '',
    bankAccount: supplier.bankAccount ?? '',
    notes: supplier.notes ?? '',
    isActive: supplier.isActive ? 'active' : 'inactive',
  });

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isActive: form.isActive === 'active',
          email: form.email || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? 'Failed to save supplier.');
        return;
      }
      router.push(`/company/suppliers/${supplier.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError message={error} />
      <FormSection title="Supplier Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Supplier Name" id="name" required value={form.name} onChange={e => setField('name', e.target.value)} />
          <TextField label="Bangla Name" id="nameBn" value={form.nameBn} onChange={e => setField('nameBn', e.target.value)} className="bn" />
          <Field label="Supplier Type" htmlFor="supplierType">
            <Select value={form.supplierType} onValueChange={v => setField('supplierType', v)}>
              <SelectTrigger id="supplierType"><SelectValue /></SelectTrigger>
              <SelectContent>{SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status" htmlFor="isActive">
            <Select value={form.isActive} onValueChange={v => setField('isActive', v)}>
              <SelectTrigger id="isActive"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </Field>
          <TextField label="Contact Person" id="contactPerson" value={form.contactPerson} onChange={e => setField('contactPerson', e.target.value)} />
          <TextField label="Phone" id="phone" value={form.phone} onChange={e => setField('phone', e.target.value)} />
          <TextField label="Email" id="email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
          <TextField label="Bank Name" id="bankName" value={form.bankName} onChange={e => setField('bankName', e.target.value)} />
          <TextField label="Bank Account" id="bankAccount" value={form.bankAccount} onChange={e => setField('bankAccount', e.target.value)} />
        </div>
        <TextareaField label="Address" id="address" value={form.address} onChange={e => setField('address', e.target.value)} rows={2} />
        <TextareaField label="Notes" id="notes" value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} />
      </FormSection>
      <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Supplier'}</Button>
    </form>
  );
}
