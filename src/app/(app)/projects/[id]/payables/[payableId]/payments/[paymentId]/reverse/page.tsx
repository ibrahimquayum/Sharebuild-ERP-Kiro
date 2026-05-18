import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReversalForm } from '@/components/accounting/reversal-form';

export const dynamic = 'force-dynamic';

export default async function PayablePaymentReversePage({ params }: { params: { id: string; payableId: string; paymentId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const payment = await prisma.supplierPayment.findFirst({
    where: { id: params.paymentId, payableId: params.payableId, payable: { projectId: params.id, supplier: { companyId } } },
    include: { payable: { include: { supplier: { select: { name: true } } } } },
  });
  if (!payment) notFound();
  return (
    <div className="p-5 max-w-3xl space-y-5">
      <Link href={`/projects/${params.id}/payables/${params.payableId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bill
      </Link>
      <Card>
        <CardHeader><CardTitle>Reverse Supplier Payment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-semibold">{payment.payable.supplier.name} · {formatBDT(Number(payment.amount))}</div>
            <div className="text-muted-foreground">{formatDate(payment.paidAt)} · {payment.paymentMethod.replaceAll('_', ' ')} · Bill {payment.payable.billNo ?? '-'}</div>
          </div>
          <p className="text-sm text-muted-foreground">This keeps the original payment visible, marks it reversed, restores bill paid/due amounts, and writes an audit log.</p>
          <ReversalForm endpoint={`/api/suppliers/payables/${params.payableId}/payments/${params.paymentId}/reverse`} returnHref={`/projects/${params.id}/payables/${params.payableId}`} label="Reverse payment" />
        </CardContent>
      </Card>
    </div>
  );
}
