'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ExistingSubcontractor = {
  id: string;
  name: string;
  phone: string | null;
  supplierType: string;
};

type PhaseOption = { id: string; name: string };

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
  workType: string;
  assignedPhaseId: string | null;
  contractAmount: number | null;
  extraWorkAmount: number;
  paymentTerms: string | null;
  contractNo: string | null;
  contractDate: string | null;
  startDate: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
};

const SUPPLIER_TYPES = [
  ['LABOUR_CONTRACTOR', 'Labour contractor'],
  ['SERVICE_PROVIDER', 'Service provider'],
] as const;

const WORK_TYPES = [
  ['PILING', 'Piling'],
  ['STRUCTURE_CIVIL', 'Structure / Civil'],
  ['BRICK_WORK', 'Brick work'],
  ['PLASTER', 'Plaster'],
  ['PLUMBING', 'Plumbing'],
  ['ELECTRICAL', 'Electrical'],
  ['TILES_FITTING', 'Tiles fitting'],
  ['GRILL_WINDOW', 'Grill / Window'],
  ['PAINTING', 'Painting'],
  ['LIFT', 'Lift'],
  ['LABOUR_SERVICE', 'Labour / Service'],
  ['OTHER', 'Other'],
] as const;

const ASSIGNMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const NO_PHASE = '__none';

function toDateValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function ProjectSubcontractorAssignmentForm({
  projectId,
  existingSubcontractors,
  phases,
  initialAssignment,
}: {
  projectId: string;
  existingSubcontractors: ExistingSubcontractor[];
  phases: PhaseOption[];
  initialAssignment?: InitialAssignment;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialAssignment);

  const [modeChoice, setModeChoice] = useState<'new' | 'existing'>(initialAssignment ? 'existing' : 'existing');
  const [existingSupplierId, setExistingSupplierId] = useState(initialAssignment?.supplier.id ?? '');
  const [name, setName] = useState(initialAssignment?.supplier.name ?? '');
  const [nameBn, setNameBn] = useState(initialAssignment?.supplier.nameBn ?? '');
  const [supplierType, setSupplierType] = useState(initialAssignment?.supplier.supplierType ?? 'LABOUR_CONTRACTOR');
  const [contactPerson, setContactPerson] = useState(initialAssignment?.supplier.contactPerson ?? '');
  const [phone, setPhone] = useState(initialAssignment?.supplier.phone ?? '');
  const [address, setAddress] = useState(initialAssignment?.supplier.address ?? '');
  const [supplierNotes, setSupplierNotes] = useState(initialAssignment?.supplier.notes ?? '');
  const [isActive, setIsActive] = useState(initialAssignment?.supplier.isActive === false ? 'false' : 'true');

  const [workType, setWorkType] = useState(initialAssignment?.workType ?? 'STRUCTURE_CIVIL');
  const [assignedPhaseId, setAssignedPhaseId] = useState(initialAssignment?.assignedPhaseId ?? NO_PHASE);
  const [contractAmount, setContractAmount] = useState(initialAssignment?.contractAmount?.toString() ?? '');
  const [extraWorkAmount, setExtraWorkAmount] = useState(initialAssignment ? String(initialAssignment.extraWorkAmount ?? 0) : '0');
  const [paymentTerms, setPaymentTerms] = useState(initialAssignment?.paymentTerms ?? '');
  const [contractNo, setContractNo] = useState(initialAssignment?.contractNo ?? '');
  const [contractDate, setContractDate] = useState(toDateValue(initialAssignment?.contractDate));
  const [startDate, setStartDate] = useState(toDateValue(initialAssignment?.startDate));
  const [deadline, setDeadline] = useState(toDateValue(initialAssignment?.deadline));
  const [status, setStatus] = useState(initialAssignment?.status ?? 'ACTIVE');
  const [notes, setNotes] = useState(initialAssignment?.notes ?? '');

  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [measurementFiles, setMeasurementFiles] = useState<File[]>([]);
  const [scheduleFiles, setScheduleFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const actionUrl = useMemo(
    () => isEditing ? `/api/projects/${projectId}/subcontractors/${initialAssignment!.id}` : `/api/projects/${projectId}/subcontractors`,
    [initialAssignment, isEditing, projectId],
  );

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!isEditing && modeChoice === 'existing' && !existingSupplierId) nextErrors.existingSupplierId = 'Select an existing subcontractor.';
    if (modeChoice === 'new' || isEditing) {
      if (!name.trim()) nextErrors.name = 'Subcontractor name is required.';
    }
    if (!workType) nextErrors.workType = 'Work type is required.';
    if (contractAmount && Number(contractAmount) < 0) nextErrors.contractAmount = 'Contract amount cannot be negative.';
    if (extraWorkAmount && Number(extraWorkAmount) < 0) nextErrors.extraWorkAmount = 'Extra work amount cannot be negative.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function uploadFiles(projectSubcontractorId: string) {
    const groups = [
      { files: agreementFiles, category: 'subcontractor agreement', title: contractNo.trim() ? `Subcontractor contract ${contractNo.trim()}` : 'Subcontractor contract / agreement' },
      { files: measurementFiles, category: 'subcontractor measurement sheet', title: 'Measurement basis / sheet' },
      { files: scheduleFiles, category: 'work schedule / deadline paper', title: 'Work schedule / deadline paper' },
    ];

    for (const group of groups) {
      if (group.files.length === 0) continue;
      const formData = new FormData();
      group.files.forEach((file) => formData.append('file', file));
      formData.set('projectId', projectId);
      formData.set('projectSubcontractorId', projectSubcontractorId);
      formData.set('scope', 'PROJECT');
      formData.set('category', group.category);
      formData.set('title', group.title);
      formData.set('description', 'Uploaded during project subcontractor contract setup.');
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
        workType,
        assignedPhaseId: assignedPhaseId === NO_PHASE ? undefined : assignedPhaseId,
        contractAmount: contractAmount ? Number(contractAmount) : undefined,
        extraWorkAmount: extraWorkAmount ? Number(extraWorkAmount) : 0,
        paymentTerms: paymentTerms.trim() || undefined,
        contractNo: contractNo.trim() || undefined,
        contractDate: contractDate || undefined,
        startDate: startDate || undefined,
        deadline: deadline || undefined,
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
            : 'Failed to save project subcontractor assignment.';
        setError(message);
        return;
      }

      await uploadFiles(data.id);
      router.push(`/projects/${projectId}/subcontractors/${data.id}`);
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
        <FormSection title="Subcontractor Master">
          <Field label="Action" htmlFor="modeChoice">
            <Select value={modeChoice} onValueChange={(value: 'new' | 'existing') => setModeChoice(value)}>
              <SelectTrigger id="modeChoice"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Use existing company subcontractor</SelectItem>
                <SelectItem value="new">Create new company subcontractor</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {modeChoice === 'existing' && (
            <Field label="Existing Subcontractor" htmlFor="existingSupplierId" required error={errors.existingSupplierId}>
              <Select value={existingSupplierId} onValueChange={setExistingSupplierId}>
                <SelectTrigger id="existingSupplierId" className={errors.existingSupplierId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={existingSubcontractors.length === 0 ? 'No company subcontractors found' : 'Select subcontractor'} />
                </SelectTrigger>
                <SelectContent>
                  {existingSubcontractors.map((supplier) => (
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
        <FormSection title="Subcontractor Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Subcontractor Name" id="name" required value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
            <TextField label="Bangla Name" id="nameBn" value={nameBn} onChange={(event) => setNameBn(event.target.value)} />
            <TextField label="Contact Person" id="contactPerson" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
            <TextField label="Phone" id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Field label="Subcontractor Type" htmlFor="supplierType">
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
          <TextareaField label="Subcontractor Master Notes" id="supplierNotes" rows={2} value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} />
        </FormSection>
      )}

      <FormSection title="Project Contract">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Work Type" htmlFor="workType" required error={errors.workType}>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger id="workType" className={errors.workType ? 'border-destructive' : ''}><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assigned Phase" htmlFor="assignedPhaseId">
            <Select value={assignedPhaseId} onValueChange={setAssignedPhaseId}>
              <SelectTrigger id="assignedPhaseId"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PHASE}>Project-wide / no fixed phase</SelectItem>
                {phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Contract Amount (BDT)" id="contractAmount" type="number" min={0} step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} error={errors.contractAmount} />
          <TextField label="Extra Work Amount (BDT)" id="extraWorkAmount" type="number" min={0} step="0.01" value={extraWorkAmount} onChange={(event) => setExtraWorkAmount(event.target.value)} error={errors.extraWorkAmount} />
          <TextField label="Payment Terms" id="paymentTerms" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
          <TextField label="Contract Number" id="contractNo" value={contractNo} onChange={(event) => setContractNo(event.target.value)} />
          <TextField label="Contract Date" id="contractDate" type="date" value={contractDate} onChange={(event) => setContractDate(event.target.value)} />
          <TextField label="Start Date" id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <TextField label="Deadline" id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          <Field label="Assignment Status" htmlFor="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATUSES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <TextareaField label="Project Notes" id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </FormSection>

      <FormSection title="Agreement And Measurement Documents">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Contract / Agreement" htmlFor="agreementFiles" hint="Optional PDF or image.">
            <input id="agreementFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setAgreementFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
          <Field label="Measurement Basis" htmlFor="measurementFiles" hint="Optional PDF or image.">
            <input id="measurementFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setMeasurementFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
          <Field label="Work Schedule / Deadline Paper" htmlFor="scheduleFiles" hint="Optional PDF or image.">
            <input id="scheduleFiles" type="file" accept="application/pdf,image/*" multiple onChange={(event) => setScheduleFiles(Array.from(event.target.files ?? []))} className="text-sm" />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving} className="min-w-[200px]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEditing ? 'Save Assignment' : 'Create Project Subcontractor'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/projects/${projectId}/subcontractors`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
