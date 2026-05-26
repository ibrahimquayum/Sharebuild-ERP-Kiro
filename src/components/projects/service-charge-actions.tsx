'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBDT } from '@/lib/utils';

type Option = {
  id: string;
  label: string;
};

type SettlementEntry = {
  entryId: string;
  phaseName: string;
  amount: number;
  settlementStatus: string;
};

export function ServiceChargeActions({
  projectId,
  entryId,
  accounts = [],
  settlementEntries = [],
}: {
  projectId: string;
  entryId?: string;
  accounts?: Option[];
  settlementEntries?: SettlementEntry[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [includedInDemand, setIncludedInDemand] = useState(true);
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
      <div className="rounded-md border border-dashed border-amber-200 bg-amber-50/70 p-3 space-y-2">
        <div>
          <div className="text-sm font-medium text-amber-900">Separate settlement is deprecated</div>
          <div className="text-xs text-amber-800">
            Service charge should be included in buyer demand and collected through normal receipts. Keep any older
            separate-settlement records only for legacy audit history or internal adjustment review.
          </div>
        </div>
        {settlementEntries.length === 0 ? (
          <p className="text-xs text-amber-800">No legacy separate-settlement rows need review right now.</p>
        ) : (
          <ul className="space-y-1 text-xs text-amber-900">
            {settlementEntries.map((entry) => (
              <li key={entry.entryId}>
                {entry.phaseName} - {formatBDT(entry.amount)} ({entry.settlementStatus.replaceAll('_', ' ')})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
