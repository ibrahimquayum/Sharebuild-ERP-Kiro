'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ServiceChargeActions({
  projectId,
  entryId,
}: {
  projectId: string;
  entryId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [includedInDemand, setIncludedInDemand] = useState(false);
  const [notes, setNotes] = useState('');

  async function submit(body: Record<string, unknown>, savingState: string) {
    setSaving(savingState);
    try {
      const response = await fetch(`/api/projects/${projectId}/service-charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(typeof data.error === 'string' ? data.error : 'Failed to update service charge.');
        return;
      }
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  if (entryId) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={Boolean(saving)}
        onClick={() => {
          const reason = window.prompt('Reason for reversing this service charge entry?') ?? '';
          if (!reason.trim()) return;
          void submit({ action: 'reverse', entryId, reason: reason.trim() }, 'reverse');
        }}
      >
        {saving === 'reverse' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reverse'}
      </Button>
    );
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">Service Charge Ledger</div>
          <div className="text-xs text-muted-foreground">Calculate phase-wise service charge entries, then approve them for official finance totals.</div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includedInDemand}
            onChange={(event) => setIncludedInDemand(event.target.checked)}
          />
          Included in buyer demand
        </label>
      </div>
      <textarea
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Optional note for this calculation or approval"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(saving)}
          onClick={() => void submit({ action: 'calculate', includedInDemand, notes }, 'calculate')}
        >
          {saving === 'calculate' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating...</> : 'Calculate Entries'}
        </Button>
        <Button
          type="button"
          disabled={Boolean(saving)}
          onClick={() => void submit({ action: 'approve', includedInDemand, notes }, 'approve')}
        >
          {saving === 'approve' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</> : 'Approve Service Charge'}
        </Button>
      </div>
    </div>
  );
}
