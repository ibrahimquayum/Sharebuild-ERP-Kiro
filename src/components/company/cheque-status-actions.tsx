'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChequeStatusActions({ chequeId }: { chequeId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function updateStatus(status: 'CLEARED' | 'BOUNCED' | 'CANCELLED') {
    const reason = status === 'CLEARED' ? '' : (window.prompt(`Reason for marking cheque ${status.toLowerCase()}?`) ?? '');
    if (status !== 'CLEARED' && !reason.trim()) return;

    setSaving(status);
    try {
      const response = await fetch(`/api/company/cheques/${chequeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reason?.trim() || undefined }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        window.alert(typeof data.error === 'string' ? data.error : 'Failed to update cheque.');
        return;
      }
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={Boolean(saving)} onClick={() => updateStatus('CLEARED')}>
        {saving === 'CLEARED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Cleared'}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={Boolean(saving)} onClick={() => updateStatus('BOUNCED')}>
        {saving === 'BOUNCED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Bounced'}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={Boolean(saving)} onClick={() => updateStatus('CANCELLED')}>
        {saving === 'CANCELLED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel'}
      </Button>
    </div>
  );
}
