'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type VendorMode = 'supplier' | 'subcontractor';

type ExistingVendor = {
  id: string;
  name: string;
  phone: string | null;
  supplierType: string;
};

const SUPPLIER_TYPES = [
  ['MATERIAL_SUPPLIER', 'Material supplier'],
  ['EQUIPMENT_SUPPLIER', 'Equipment / machinery supplier'],
] as const;

const SUBCONTRACTOR_TYPES = [
  ['LABOUR_CONTRACTOR', 'Labour contractor'],
  ['SERVICE_PROVIDER', 'Service provider'],
] as const;

const WORK_TYPES = [
  'Piling',
  'Structure / civil',
  'Brick work',
  'Plaster',
  'Plumbing',
  'Electrical',
  'Tiles',
  'Grill / window',
  'Painting',
  'Lift',
  'Labour / service',
  'Other',
] as const;

export function ProjectVendorCreateForm({
  projectId,
  mode,
  existingVendors,
}: {
  projectId: string;
  mode: VendorMode;
  existingVendors: ExistingVendor[];
}) {
  const router = useRouter();
  const isSubcontractor = mode === 'subcontractor';
  const typeOptions = isSubcontractor ? SUBCONTRACTOR_TYPES : SUPPLIER_TYPES;
  const defaultType = typeOptions[0][0];
  const billHref = isSubcontractor ? `/projects/${projectId}/subcontractors/bills/new` : `/projects/${projectId}/payables/new`;
  const vendorsHref = `/projects/${projectId}/vendors`;

  const [modeChoice, setModeChoice] = useState<'new' | 'existing'>('new');
  const [existingId, setExistingId] = useState('');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [supplierType, setSupplierType] = useState<string>(defaultType);
  const [workType, setWorkType] = useState<string>(WORK_TYPES[1]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState('true');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const title = isSubcontractor ? 'Subcontractor' : 'Supplier';
  const nameLabel = isSubcontractor ? 'Subcontractor Name' : 'Supplier Name';
  const redirectWithId = useMemo(() => {
    const key = isSubcontractor ? 'subcontractorId' : 'supplierId';
    return `${billHref}?${key}=`;
  }, [billHref, isSubcontractor]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (modeChoice === 'existing' && !existingId) nextErrors.existingId = `Select an existing ${title.toLowerCase()}.`;
    if (modeChoice === 'new') {
      if (!name.trim()) nextErrors.name = `${title} name is required.`;
      if (phone && !/^[\d\s\-+()]{6,20}$/.test(phone)) nextErrors.phone = 'Enter a valid phone number.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    if (modeChoice === 'existing') {
      router.push(`${redirectWithId}${existingId}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameBn: nameBn.trim() || undefined,
          supplierType,
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          notes: [isSubcontractor ? `Work type: ${workType}` : '', notes.trim()].filter(Boolean).join('\n') || undefined,
          isActive: isActive === 'true',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save. Please try again.');
        return;
      }
      router.push(`${redirectWithId}${data.id}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={error} />

      <FormSection title={`Use Existing Or Add New ${title}`}>
        <Field label="Action" htmlFor="modeChoice">
          <Select value={modeChoice} onValueChange={(value: 'new' | 'existing') => setModeChoice(value)}>
            <SelectTrigger id="modeChoice"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Add new {title.toLowerCase()}</SelectItem>
              <SelectItem value="existing">Use existing {title.toLowerCase()}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {modeChoice === 'existing' && (
          <Field label={`Existing ${title}`} htmlFor="existingId" required error={errors.existingId}>
            <Select value={existingId} onValueChange={setExistingId}>
              <SelectTrigger id="existingId" className={errors.existingId ? 'border-destructive' : ''}>
                <SelectValue placeholder={existingVendors.length === 0 ? `No existing ${title.toLowerCase()} found` : `Select ${title.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {existingVendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}{vendor.phone ? ` - ${vendor.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </FormSection>

      {modeChoice === 'new' && (
        <>
          <FormSection title={`${title} Information`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label={nameLabel} id="name" required value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
              <TextField label="Bangla Name" id="nameBn" value={nameBn} onChange={(event) => setNameBn(event.target.value)} />
              <TextField label="Contact Person" id="contactPerson" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
              <TextField label="Phone" id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} />
            </div>
            <Field label={isSubcontractor ? 'Subcontractor Type' : 'Supplier Type'} htmlFor="supplierType">
              <Select value={supplierType} onValueChange={setSupplierType}>
                <SelectTrigger id="supplierType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {isSubcontractor && (
              <Field label="Work Type" htmlFor="workType">
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger id="workType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Active Status" htmlFor="isActive">
              <Select value={isActive} onValueChange={setIsActive}>
                <SelectTrigger id="isActive"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Address And Notes">
            <TextareaField label="Address" id="address" rows={2} value={address} onChange={(event) => setAddress(event.target.value)} />
            <TextareaField label="Notes" id="notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormSection>
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving} className="min-w-[170px]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><ArrowRight className="mr-2 h-4 w-4" /> Continue To Bill</>}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(vendorsHref)}>Cancel</Button>
      </div>
    </form>
  );
}
