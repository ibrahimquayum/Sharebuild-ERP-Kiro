'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ApprovalActions({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(action);
    try {
      const res = await fetch(`/api/expenses/${expenseId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.error ?? res.statusText}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert('Network error — please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-1 justify-center">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading !== null}
        className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading === 'approve' ? '…' : 'Approve'}
      </button>
      <button
        onClick={() => handleAction('reject')}
        disabled={loading !== null}
        className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        {loading === 'reject' ? '…' : 'Reject'}
      </button>
    </div>
  );
}
