'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ExistingSupplier = {
  id: string;
  name: string;
  phone: string | null;
  supplierType: string;
};

type InitialAssignment = {
  id: string;
  supplier: {
    id: string;
    name: string;
    nameBn: string | null;
    supplierType: string;
    contactPerson: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  };
  materialCategory: string | null;
  phaseNotes: string | null;
  paymentTerms: string | null;
  creditDays: number | null;
  openingBalance: number;
  contractNo: string | null;
  contractDate: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string | null;
};

const SUPPLIER_TYPES = [
  ['MATERIAL_SUPPLIER', 'Material supplier'],
  ['EQUIPMENT_SUPPLIER', 'Equipment supplier'],
  ['CONSULTANT', 'Consultant'],
] as const;

const ASSIGNMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'] as const;

function toDateValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function ProjectSupplierAssignmentForm({
  projectId,
  existingSuppliers,
  initialAssignment,
}: {
  projectId: string;
  existingSuppliers: ExistingSupplier[];
  initialAssignment?: InitialAssignment;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialAssignment);

  const [modeChoice, setModeChoice] = useState<'new' | 'existing'>(initialAssignment ? 'existing' : 'existing');
  const [existingSupplierId, setExistingSupplierId] = useState(initialAssignment?.supplier.id ?? '');
  const [name, setName] = useState(initialAssignment?.supplier.name ?? '');
  const [nameBn, setNameBn] = useState(initialAssignment?.supplier.nameBn ?? '');
  const [supplierType, setSupplierType] = useState(initialAssignment?.supplier.supplierType ?? 'MATERIAL_SUPPLIER');
  const [contactPerson, setContactPerson] = useState(initialAssignment?.supplier.contactPerson ?? '');
  const [phone, setPhone] = useState(initialAssignment?.supplier.phone ?? '');
  const [address, setAddress] = useState(initialAssignment?.supplier.address ?? '');
  const [supplierNotes, setSupplierNotes] = useState(initialAssignment?.supplier.notes ?? '');
  const [isActive, setIsActive] = useState(initialAssignment?.supplier.isActive === false ? 'false' : 'true');

  const [materialCategory, setMaterialCategory] = useState(initialAssignment?.materialCategory ?? '');
  const [phaseNotes, setPhaseNotes] = useState(initialAssignment?.phaseNotes ?? '');
  const [paymentTerms, setPaymentTerms] = useState(initialAssignment?.paymentTerms ?? '');
  const [creditDays, setCreditDays] = useState(initialAssignment?.creditDays?.toString() ?? '');
  const [openingBalance, setOpeningBalance] = useState(initialAssignment ? String(initialAssignment.openingBalance ?? 0) : '0');
  const [contractNo, setContractNo] = useState(initialAssignment?.contractNo ?? '');
  const [contractDate, setContractDate] = useState(toDateValue(initialAssignment?.contractDate));
  const [startDate, setStartDate] = useState(toDateValue(initialAssignment?.startDate));
  const [endDate, setEndDate] = useState(toDateValue(initialAssignment?.endDate));
  const [status, setStatus] = useState(initialAssignment?.status ?? 'ACTIVE');
  const [notes, setNotes] = useState(initialAssignment?.notes ?? '');

  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [rateSheetFiles, setRateSheetFiles] = useState<File[]>([]);
  const [quotationFiles, setQuotationFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const actionUrl = useMemo(
    () => isEditing ? `/api/projects/${projectId}/suppliers/${initialAssignment!.id}` : `/api/projects/${projectId}/suppliers`,
    [initialAssignment, isEditing, projectId],
  );

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!isEditing && modeChoice === 'existing' && !existingSupplierId) nextErrors.existingSupplierId = 'Select an existing supplier.';
    if (modeChoice === 'new' || isEditing) {
      if (!name.trim()) nextErrors.name = 'Supplier name is required.';
    }
    if (creditDays && Number(creditDays) < 0) nextErrors.creditDays = 'Credit days cannot be negative.';
    if (openingBalance && Number(openingBalance) < 0) nextErrors.openingBalance = 'Opening balance cannot be negative.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function uploadFiles(projectSupplierId: string) {
    const groups = [
      { files: contractFiles, category: 'supplier agreement', title: contractNo.trim() ? `Supplier contract ${contractNo.trim()}` : 'Supplier contract / agreement' },
      { files: rateSheetFiles, category: 'rate sheet', title: 'Supplier rate sheet' },
      { files: quotationFiles, category: 'quotation', title: 'Supplier quotation' },
    ];

    for (const group of groups) {
      if (group.files.length === 0) continue;
      const formData = new FormData();
      group.files.forEach((file) => formData.append('file', file));
      formData.set('projectId', projectId);
      formData.set('projectSupplierId', projectSupplierId);
      formData.set('scope', 'PROJECT');
      formData.set('category', group.category);
      formData.set('title', group.title);
      formData.set('description', 'Uploaded during project supplier assignment setup.');
      const uploadRes = await fetch('/api/documents', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const uploadJson = await uploadRes.json().catch(() => ({}));
        throw new Error(typeof uploadJson.error === 'string' ? uploadJson.error : `Failed to upload ${group.category}.`);
      }
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);

    try {
      const body = {
        ...(modeChoice === 'existing' && !isEditing ? { existingSupplierId } : {}),
        supplier: {
          name: name.trim(),
          nameBn: nameBn.trim() || undefined,
          supplierType,
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          notes: supplierNotes.trim() || undefined,
          isActive: isActive === 'true',
        },
        materialCategory: materialCategory.trim() || undefined,
        phaseNotes: phaseNotes.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        creditDays: creditDays ? Number(creditDays) : undefined,
        openingBalance: openingBalance ? Number(openingBalance) : 0,
        contractNo: contractNo.trim() || undefined,
        contractDate: contractDate || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(actionUrl, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.error === 'string'
          ? data.error
          : typeof data.error?.formErrors?.[0] === 'string'
            ? data.error.formErrors[0]
            : 'Failed to save project supplier assignment.';
        setError(message);
        return;
      }

      await uploadFiles(data.id);
      router.push(`/projects/${projectId}/suppliers/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={error} />

      {!isEditing && (
        <FormSection title="Supplier Master">
          <Field label="Action" htmlFor="modeChoice">
            <Select value={modeChoice} onValueChange={(value: 'new' | 'existing') => setModeChoice(value)}>
              <SelectTrigger id="modeChoice"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Use existing company supplier</SelectItem>
                <SelectItem value="new">Create new company supplier</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {modeChoice === 'existing' && (
            <Field label="Existing Supplier" htmlFor="existingSupplierId" required error={errors.existingSupplierId}>
              <Select value={existingSupplierId} onValueChange={setExistingSupplierId}>
                <SelectTrigger id="existingSupplierId" className={errors.existingSupplierId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={existingSuppliers.length === 0 ? 'No company suppliers found' : 'Select supplier'} />
                </SelectTrigger>
                <SelectContent>
                  {existingSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}{supplier.phone ? ` - ${supplier.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </FormSection>
      )}

      {(modeChoice === 'new' || isEditing) && (
        <FormSection title="Supplier Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Supplier Name" id="name" required value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
            <TextField label="Bangla Name" id="nameBn" value={nameBn} onChange={(event) => setNameBn(event.target.value)} />
            <TextField label="Contact Person" id="contactPerson" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
            <TextField label="Phone" id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Field label="Supplier Type" htmlFor="supplierType">
              <Select value={supplierType} onValueChange={setSupplierType}>
                <SelectTrigger id="supplierType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPLIER_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Master Status" htmlFor="isActive">
              <Select value={isActive} onValueChange={setIsActive}>
                <SelectTrigger id="isActive"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <TextareaField label="Address" id="address" rows={2} value={address} onChange={(event) => setAddress(event.target.value)} />
          <TextareaField label="Supplier Master Notes" id="supplierNotes" rows={2} value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} />
        </FormSection>
      )}

      <FormSection title="Project Contract And Terms">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Material / Supplier Category" id="materialCategory" value={materialCategory} onChange={(event) => setMaterialCategory(event.target.value)} />
          <TextField label="Payment Terms" id="paymentTerms" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
          <TextField label="Credit Days" id="creditDays" type="number" min={0} value={creditDays} onChange={(event) => setCreditDays(event.target.value)} error={errors.creditDays} />
          <TextField label="Opening Balance (BDT)" id="openingBalance" type="number" min={0} step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} error={errors.openingBalance} />
          <TextField label="Contract Number" id="contractNo" value={contractNo} onChange={(event) => setContractNo(event.target.value)} />
          <TextField label="Contract Date" id="contractDate" type="date" value={contractDate} onChange={(event) => setContractDate(event.target.value)} />
          <TextField label="Start Date" id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <TextField label="End Date" id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <Field label="Assignment Status" htmlFor="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATUSES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <TextareaField label="Assigned Phases / Notes" id="phaseNotes" rows={2} value={phaseNotes} onChange={(event) => setPhaseNotes(event.target.value)} />
        <TextareaField label="Project Notes" id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </FormSection>

      <FormSection title="Contract And Rate Documents">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Contract / Agreement" htmlFor="contractFiles" hint="Optional PDF or image.">
            <input id="contractFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setContractFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
          <Field label="Rate Sheet" htmlFor="rateSheetFiles" hint="Optional PDF or image.">
            <input id="rateSheetFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setRateSheetFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
          <Field label="Quotation / Other" htmlFor="quotationFiles" hint="Optional PDF or image.">
            <input id="quotationFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setQuotationFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving} className="min-w-[180px]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEditing ? 'Save Assignment' : 'Create Project Supplier'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/projects/${projectId}/suppliers`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
