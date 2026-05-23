'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBDT } from '@/lib/utils';

type Option = {
  id: string;
  label: string;
};

type CreditLine = {
  id: string;
  buyerName: string;
  unitNo: string;
  amount: number;
  settlementStatus: string;
  settlementReference?: string | null;
};

export function ReconciliationCreditSettlementActions({
  projectId,
  lines,
  accounts,
}: {
  projectId: string;
  lines: CreditLine[];
  accounts: Option[];
}) {
  const router = useRouter();
  const [lineId, setLineId] = useState('');
  const [settlementStatus, setSettlementStatus] = useState('KEPT_AS_ADVANCE');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeLine = useMemo(() => lines.find((line) => line.id === lineId), [lineId, lines]);
  const openLines = lines.filter((line) => line.settlementStatus === 'OPEN_CREDIT');

  async function handleSubmit() {
    setError('');
    if (!lineId) {
      setError('Select a posted surplus credit line first.');
      return;
    }
    if (settlementStatus === 'REFUNDED' && (!accountId || !paymentMethod)) {
      setError('Select account and payment method for a refund settlement.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/final-reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settleCredit',
          lineId,
          settlementStatus,
          accountId: settlementStatus === 'REFUNDED' ? accountId || undefined : undefined,
          paymentMethod: settlementStatus === 'REFUNDED' ? paymentMethod : undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to settle surplus credit.');
        return;
      }
      setReference('');
      setNotes('');
      setLineId('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">Surplus Credit Settlement</div>
        <div className="text-xs text-muted-foreground">Use this after posting a surplus reconciliation. Credits can stay as advance, be refunded, or be marked adjusted.</div>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {openLines.length === 0 ? (
        <p className="text-xs text-muted-foreground">No open surplus credit lines are waiting for settlement.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">Buyer credit line</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={lineId}
                onChange={(event) => setLineId(event.target.value)}
              >
                <option value="">Select credit line</option>
                {openLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.buyerName} - Unit {line.unitNo} - {formatBDT(line.amount)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Settlement outcome</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={settlementStatus}
                onChange={(event) => setSettlementStatus(event.target.value)}
              >
                <option value="KEPT_AS_ADVANCE">Keep as advance</option>
                <option value="REFUNDED">Refund to buyer</option>
                <option value="ADJUSTED">Adjusted manually</option>
              </select>
            </label>
            {settlementStatus === 'REFUNDED' ? (
              <>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Paid from account</span>
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
              </>
            ) : null}
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Reference</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder={settlementStatus === 'REFUNDED' ? 'Refund voucher / transfer reference' : 'Adjustment / note reference'}
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted-foreground">Settlement note</span>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={activeLine ? `${activeLine.buyerName} - ${formatBDT(activeLine.amount)}` : 'Optional note'}
              />
            </label>
          </div>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Apply Credit Settlement'}
          </Button>
        </>
      )}
    </div>
  );
}
