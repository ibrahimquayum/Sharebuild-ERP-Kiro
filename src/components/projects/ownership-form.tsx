'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option {
  id: string;
  label: string;
}

export function OwnershipForm({ projectId, buyers, units }: { projectId: string; buyers: Option[]; units: Option[] }) {
  const router = useRouter();
  const [buyerId, setBuyerId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [sharePercent, setSharePercent] = useState('100');
  const [relationship, setRelationship] = useState('OWNER');
  const [isPayer, setIsPayer] = useState('true');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!buyerId || !unitId) {
      setError('Select both buyer/contact and unit.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId,
          unitId,
          sharePercent: Number(sharePercent),
          relationship,
          isPayer: isPayer === 'true',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to assign buyer.');
        return;
      }
      router.push(`/projects/${projectId}/buyers/${data.membershipId}`);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Contact / Buyer" htmlFor="buyerId" required>
          <Select value={buyerId} onValueChange={setBuyerId}>
            <SelectTrigger id="buyerId"><SelectValue placeholder="Select buyer" /></SelectTrigger>
            <SelectContent>
              {buyers.map((buyer) => <SelectItem key={buyer.id} value={buyer.id}>{buyer.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Unit" htmlFor="unitId" required>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger id="unitId"><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>
              {units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Ownership Share %" id="sharePercent" type="number" min={0.01} max={100} step="0.01" value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} />
        <Field label="Relationship" htmlFor="relationship">
          <Select value={relationship} onValueChange={setRelationship}>
            <SelectTrigger id="relationship"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNER">Owner</SelectItem>
              <SelectItem value="CO_OWNER">Co-owner</SelectItem>
              <SelectItem value="PAYER_ONLY">Payer only</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Payment Role" htmlFor="isPayer">
          <Select value={isPayer} onValueChange={setIsPayer}>
            <SelectTrigger id="isPayer"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Can pay for this unit</SelectItem>
              <SelectItem value="false">Owner only, payer differs</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Assign Buyer to Unit'}
      </Button>
    </form>
  );
}
