import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatDate, cn } from '@/lib/utils';
import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SubcontractorBillsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;

  const bills = await prisma.supplierPayable.findMany({
    where: {
      projectId: project.id,
      supplier: { supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] } },
    },
    include: {
      supplier: { select: { name: true, supplierType: true } },
      phase: { select: { name: true } },
      _count: { select: { documents: true, payments: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  const statusColor: Record<string, string> = {
    UNPAID: 'bg-red-100 text-red-700',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-orange-100 text-orange-700',
    WRITTEN_OFF: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Subcontractor Bills</h1>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>
        <Link
          href={`${base}/subcontractors/bills/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Bill
        </Link>
      </div>

      <div className="flex gap-3 text-xs border-b pb-3">
        <Link href={`${base}/vendors`} className="text-muted-foreground hover:text-foreground transition-colors">Vendors Overview</Link>
        <Link href={`${base}/subcontractors`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractors</Link>
        <Link href={`${base}/subcontractors/bills`} className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Subcontractor Bills</Link>
        <Link href={`${base}/payables/payments?type=subcontractor`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractor Payments</Link>
      </div>

      {bills.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">No subcontractor bills recorded yet.</p>
          <Link
            href={`${base}/subcontractors/bills/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Record First Bill
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Subcontractor</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Phase</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Bill No</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Bill Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paid</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bills.map((bill, index) => (
                <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{bill.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'Labour Contractor' : 'Service Provider'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{bill.phase?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{bill.billNo ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(bill.billDate)}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">{formatBDT(Number(bill.totalAmount))}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600 tabular-nums">{formatBDT(Number(bill.paidAmount))}</td>
                  <td className={cn('px-4 py-3 text-right text-xs font-bold tabular-nums', Number(bill.dueAmount) > 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {formatBDT(Number(bill.dueAmount))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor[bill.status] ?? 'bg-gray-100 text-gray-600')}>
                      {bill.status.replace(/_/g, ' ')}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {bill._count.documents} doc{bill._count.documents === 1 ? '' : 's'} - {bill._count.payments} payment{bill._count.payments === 1 ? '' : 's'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`${base}/payables/${bill.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
