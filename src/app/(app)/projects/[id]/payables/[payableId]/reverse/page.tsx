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

export default async function PayableReversePage({ params }: { params: { id: string; payableId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.payableId, projectId: params.id, supplier: { companyId } },
    include: { supplier: { select: { name: true, supplierType: true } }, phase: { select: { name: true } } },
  });
  if (!payable) notFound();
  return (
    <div className="p-5 max-w-3xl space-y-5">
      <Link href={`/projects/${params.id}/payables/${params.payableId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to bill
      </Link>
      <Card>
        <CardHeader><CardTitle>Reverse {payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'Subcontractor' : 'Supplier'} Bill</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-semibold">{payable.supplier.name} · {formatBDT(Number(payable.totalAmount))}</div>
            <div className="text-muted-foreground">{payable.phase?.name ?? 'Project general'} · {formatDate(payable.billDate)} · Bill {payable.billNo ?? '-'}</div>
          </div>
          <p className="text-sm text-muted-foreground">This keeps the original bill visible, marks it written off/reversed, clears outstanding due, and writes an audit log. Enter a corrected bill separately if needed.</p>
          <ReversalForm endpoint={`/api/suppliers/payables/${payable.id}/reverse`} returnHref={`/projects/${params.id}/payables/${payable.id}`} label="Reverse bill" />
        </CardContent>
      </Card>
    </div>
  );
}
