import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupplierPaymentsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;

  const payments = await prisma.supplierPayment.findMany({
    where: { payable: { projectId: project.id } },
    include: {
      payable: {
        include: {
          supplier: { select: { name: true, supplierType: true } },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
    take: 200,
  });

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Supplier Payments</h1>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-3 text-xs border-b pb-3">
        <Link href={`${base}/vendors`}           className="text-muted-foreground hover:text-foreground transition-colors">Vendors Overview</Link>
        <Link href={`${base}/payables`}          className="text-muted-foreground hover:text-foreground transition-colors">Supplier Bills</Link>
        <Link href={`${base}/payables/payments`} className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Supplier Payments</Link>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No supplier payments recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Supplier</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paid On</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Method</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p, i) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.payable.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payable.supplier.supplierType.replace(/_/g, ' ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.paidAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.paymentMethod.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-green-600 tabular-nums">
                    {formatBDT(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.reference ?? p.chequeNo ?? '—'}
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
