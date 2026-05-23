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
  const [includedInDemand, setIncludedInDemand] = useState(false);
  const [notes, setNotes] = useState('');
  const [settlementEntryId, setSettlementEntryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [settlementNote, setSettlementNote] = useState('');

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
      <div className="rounded-md border border-dashed p-3 space-y-3">
        <div>
          <div className="text-sm font-medium">Settle Approved Service Charge</div>
          <div className="text-xs text-muted-foreground">Use this only for service charge kept separate from buyer demand. Included-in-demand rows should stay linked to demand, not settled again.</div>
        </div>
        {settlementEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No approved separate-income service charge rows are waiting for settlement.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Approved entry</span>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={settlementEntryId}
                  onChange={(event) => setSettlementEntryId(event.target.value)}
                >
                  <option value="">Select an approved entry</option>
                  {settlementEntries.map((entry) => (
                    <option key={entry.entryId} value={entry.entryId}>
                      {entry.phaseName} - {formatBDT(entry.amount)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Received into account</span>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Payment method</span>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_BANKING">Mobile banking</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Reference</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Receipt / transfer / note reference"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-xs text-muted-foreground">Settlement note</span>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={2}
                  value={settlementNote}
                  onChange={(event) => setSettlementNote(event.target.value)}
                  placeholder="Optional note for this service charge settlement"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(saving)}
              onClick={() => void submit({
                action: 'settle',
                entryId: settlementEntryId || undefined,
                accountId: accountId || undefined,
                paymentMethod,
                reference: reference.trim() || undefined,
                notes: settlementNote.trim() || undefined,
              }, 'settle')}
            >
              {saving === 'settle' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Settling...</> : 'Mark as Settled'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
