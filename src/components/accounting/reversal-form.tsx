'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReversalForm({
  endpoint,
  returnHref,
  label = 'Reverse record',
}: {
  endpoint: string;
  returnHref: string;
  label?: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to reverse record.');
      router.push(returnHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="reason" className="text-sm font-medium">Reversal reason</label>
        <textarea
          id="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          minLength={3}
          rows={4}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Explain why this correction is required for audit history."
        />
      </div>
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={saving || reason.trim().length < 3}>{saving ? 'Reversing...' : label}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(returnHref)} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}
