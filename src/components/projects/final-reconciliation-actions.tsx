'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FinalReconciliationActions({
  projectId,
  postedReconciliationId,
}: {
  projectId: string;
  postedReconciliationId?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  async function submit(body: Record<string, unknown>, state: string) {
    setSaving(state);
    try {
      const response = await fetch(`/api/projects/${projectId}/final-reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(typeof data.error === 'string' ? data.error : 'Failed to update final reconciliation.');
        return;
      }
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">Final Reconciliation Posting</div>
        <div className="text-xs text-muted-foreground">Preview first, then post once. Posted reconciliation must be reversed before it can be posted again.</div>
      </div>
      {!postedReconciliationId ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Demand due date</span>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">Posting note / reason</span>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why is this final reconciliation being posted now?"
              />
            </label>
          </div>
          <Button
            type="button"
            disabled={Boolean(saving)}
            onClick={() => void submit({ action: 'post', dueDate: dueDate || undefined, notes: notes.trim() || undefined }, 'post')}
          >
            {saving === 'post' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Final Reconciliation'}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="destructive"
          disabled={Boolean(saving)}
          onClick={() => {
            const reason = window.prompt('Reason for reversing the posted final reconciliation?') ?? '';
            if (!reason.trim()) return;
            void submit({ action: 'reverse', reconciliationId: postedReconciliationId, reason: reason.trim() }, 'reverse');
          }}
        >
          {saving === 'reverse' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reversing...</> : 'Reverse Posted Reconciliation'}
        </Button>
      )}
    </div>
  );
}
