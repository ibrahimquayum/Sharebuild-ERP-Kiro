'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SCOPES = [
  'PROJECT',
  'BUYER',
  'UNIT',
  'PHASE',
  'EXPENSE',
  'SUPPLIER_BILL',
  'SUBCONTRACTOR_BILL',
  'AUDIT',
];

const CATEGORIES = [
  'land deed',
  'bayna',
  'mutation/kharij',
  'RAJUK approval',
  'design/drawing',
  'utility permission',
  'supplier agreement',
  'subcontractor agreement',
  'audit document',
  'NID front',
  'NID back',
  'photo',
  'agreement',
  'payment proof',
  'expense voucher',
  'supplier invoice',
  'supplier payment proof',
  'subcontractor measurement sheet',
  'subcontractor invoice',
  'registration paper',
  'other',
];

interface Option {
  id: string;
  label: string;
}

export function DocumentUploadForm({
  projectId,
  buyers,
  units,
  phases,
  initialBuyerId,
  initialUnitId,
  initialPhaseId,
  initialExpenseId,
  initialPayableId,
  initialProjectSupplierId,
  initialProjectSubcontractorId,
  initialScope,
  initialCategory,
  returnTo,
}: {
  projectId: string;
  buyers: Option[];
  units: Option[];
  phases: Option[];
  initialBuyerId?: string;
  initialUnitId?: string;
  initialPhaseId?: string;
  initialExpenseId?: string;
  initialPayableId?: string;
  initialProjectSupplierId?: string;
  initialProjectSubcontractorId?: string;
  initialScope?: string;
  initialCategory?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const safeInitialScope = initialScope && SCOPES.includes(initialScope) ? initialScope : initialBuyerId ? 'BUYER' : initialPayableId ? 'SUPPLIER_BILL' : 'PROJECT';
  const [category, setCategory] = useState(initialCategory || 'other');
  const [scope, setScope] = useState(safeInitialScope);
  const [buyerId, setBuyerId] = useState(initialBuyerId ?? '');
  const [unitId, setUnitId] = useState(initialUnitId ?? '');
  const [phaseId, setPhaseId] = useState(initialPhaseId ?? '');
  const [sortOrder, setSortOrder] = useState('0');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (files.length === 0) {
      setError('Choose at least one PDF or image to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    const data = new FormData();
    files.forEach((file) => data.append('file', file));
    data.set('projectId', projectId);
    data.set('title', title.trim());
    data.set('category', category);
    data.set('scope', scope);
    data.set('sortOrder', sortOrder);
    if (description.trim()) data.set('description', description.trim());
    if (buyerId) data.set('buyerId', buyerId);
    if (unitId) data.set('unitId', unitId);
    if (phaseId) data.set('phaseId', phaseId);
    if (initialExpenseId) data.set('expenseId', initialExpenseId);
    if (initialPayableId) data.set('payableId', initialPayableId);
    if (initialProjectSupplierId) data.set('projectSupplierId', initialProjectSupplierId);
    if (initialProjectSubcontractorId) data.set('projectSubcontractorId', initialProjectSubcontractorId);

    setSaving(true);
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to upload document.');
        return;
      }
      router.push(returnTo || (initialBuyerId ? `/projects/${projectId}/buyers/${initialBuyerId}` : `/projects/${projectId}/documents`));
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Title" id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label="Category" htmlFor="category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Scope" htmlFor="scope">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id="scope"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCOPES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {(initialExpenseId || initialPayableId || initialProjectSupplierId || initialProjectSubcontractorId) && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground md:col-span-2">
            This upload will be linked directly to the selected {initialExpenseId ? 'expense' : initialPayableId ? 'bill/payable' : initialProjectSupplierId ? 'project supplier assignment' : 'project subcontractor assignment'} record.
          </div>
        )}
        <TextField label="Manual Sort Order" id="sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        <Field label="Linked Buyer" htmlFor="buyerId">
          <Select value={buyerId || 'none'} onValueChange={(value) => setBuyerId(value === 'none' ? '' : value)}>
            <SelectTrigger id="buyerId"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No buyer link</SelectItem>
              {buyers.map((buyer) => <SelectItem key={buyer.id} value={buyer.id}>{buyer.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Linked Unit" htmlFor="unitId">
          <Select value={unitId || 'none'} onValueChange={(value) => setUnitId(value === 'none' ? '' : value)}>
            <SelectTrigger id="unitId"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No unit link</SelectItem>
              {units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Linked Phase" htmlFor="phaseId">
          <Select value={phaseId || 'none'} onValueChange={(value) => setPhaseId(value === 'none' ? '' : value)}>
            <SelectTrigger id="phaseId"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No phase link</SelectItem>
              {phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="File" htmlFor="file" required hint="PDF, JPG, PNG, or WebP up to 10 MB.">
              <input id="file" type="file" accept="application/pdf,image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm" />
              {files.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{files.length} file{files.length === 1 ? '' : 's'} selected</p>}
            </Field>
      </div>
      <TextareaField label="Notes" id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload Document'}
      </Button>
    </form>
  );
}
