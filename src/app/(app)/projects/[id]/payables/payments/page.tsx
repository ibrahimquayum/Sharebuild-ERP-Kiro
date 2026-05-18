import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, formatDate } from '@/lib/utils';
import Link from 'next/link';
import type { SupplierType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function SupplierPaymentsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const isSubcontractor = searchParams?.type === 'subcontractor';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;
  const subcontractorTypes: SupplierType[] = ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'];
  const supplierTypeFilter = isSubcontractor
    ? { in: subcontractorTypes }
    : { notIn: subcontractorTypes };

  const payments = await prisma.supplierPayment.findMany({
    where: {
      payable: {
        projectId: project.id,
        supplier: { supplierType: supplierTypeFilter },
      },
    },
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

  const title = isSubcontractor ? 'Subcontractor Payments' : 'Supplier Payments';
  const emptyLabel = isSubcontractor ? 'No subcontractor payments recorded yet.' : 'No supplier payments recorded yet.';

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <div className="flex gap-3 text-xs border-b pb-3">
        <Link href={`${base}/vendors`} className="text-muted-foreground hover:text-foreground transition-colors">Vendors Overview</Link>
        {isSubcontractor ? (
          <>
            <Link href={`${base}/subcontractors`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractors</Link>
            <Link href={`${base}/subcontractors/bills`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractor Bills</Link>
            <Link href={`${base}/payables/payments?type=subcontractor`} className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Subcontractor Payments</Link>
          </>
        ) : (
          <>
            <Link href={`${base}/payables`} className="text-muted-foreground hover:text-foreground transition-colors">Supplier Bills</Link>
            <Link href={`${base}/payables/payments`} className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Supplier Payments</Link>
          </>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{isSubcontractor ? 'Subcontractor' : 'Supplier'}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paid On</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Method</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment, index) => (
                <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{payment.payable.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.payable.supplier.supplierType.replace(/_/g, ' ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {payment.paymentMethod.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-green-600 tabular-nums">
                    {formatBDT(Number(payment.amount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {payment.reference ?? payment.chequeNo ?? '-'}
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
