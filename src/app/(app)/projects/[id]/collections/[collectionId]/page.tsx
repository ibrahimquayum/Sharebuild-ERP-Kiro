import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/accounting/status-badge';

export const dynamic = 'force-dynamic';

export default async function CollectionDetailPage({ params }: { params: { id: string; collectionId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const role = (session?.user as any)?.role;

  const collection = await prisma.collection.findFirst({
    where: { id: params.collectionId, phase: { projectId: params.id, project: { companyId } } },
    include: {
      buyer: { select: { id: true, name: true, phone: true } },
      phase: { select: { id: true, name: true, auditLockedAt: true } },
      demand: { select: { id: true, title: true, demandNo: true } },
      allocations: { include: { demand: { select: { id: true, title: true, demandNo: true, amount: true } } } },
    },
  });
  if (!collection) notFound();

  const canReverse = can(role, 'collections', 'reverseAdjust') && !collection.reversedAt && collection.status !== 'REVERSED' && !collection.phase.auditLockedAt;

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${params.id}/collections`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Collections
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Collection Detail</h2>
          <p className="text-xs text-muted-foreground">Receipt {collection.receiptNo ?? collection.id}</p>
        </div>
        {canReverse && (
          <Link href={`/projects/${params.id}/collections/${collection.id}/reverse`} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
            <RotateCcw className="h-3.5 w-3.5" /> Reverse
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Original Record</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Buyer</span><div className="font-medium">{collection.buyer.name}</div></div>
            <div><span className="text-muted-foreground">Phase</span><div className="font-medium">{collection.phase.name}</div></div>
            <div><span className="text-muted-foreground">Amount</span><div className="font-bold text-green-600">{formatBDT(Number(collection.amount))}</div></div>
            <div><span className="text-muted-foreground">Received</span><div className="font-medium">{formatDate(collection.receivedDate)}</div></div>
            <div><span className="text-muted-foreground">Method</span><div className="font-medium">{collection.paymentMethod.replaceAll('_', ' ')}</div></div>
            <div><span className="text-muted-foreground">Status</span><div><StatusBadge status={collection.status} tone={collection.status === 'REVERSED' ? 'danger' : 'success'} /></div></div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{collection.notes ?? '-'}</div></div>
            {collection.reversedAt && (
              <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                Reversed on {formatDate(collection.reversedAt)}. Reason: {collection.reversalReason ?? '-'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Audit Effect</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Allocated</span><span>{formatBDT(collection.allocations.reduce((sum, item) => sum + Number(item.amount), 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Advance</span><span>{formatBDT(Math.max(Number(collection.amount) - collection.allocations.reduce((sum, item) => sum + Number(item.amount), 0), 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phase lock</span><span>{collection.phase.auditLockedAt ? 'Locked' : 'Open'}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Demand Allocations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2 text-left">Demand</th><th className="px-4 py-2 text-right">Allocated</th></tr></thead>
            <tbody>
              {collection.allocations.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">Unallocated advance/collection.</td></tr>
              ) : collection.allocations.map((allocation) => (
                <tr key={allocation.id} className="border-b">
                  <td className="px-4 py-2">{allocation.demand.title}<div className="text-xs text-muted-foreground">{allocation.demand.demandNo ?? allocation.demand.id}</div></td>
                  <td className="px-4 py-2 text-right font-medium">{formatBDT(Number(allocation.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
