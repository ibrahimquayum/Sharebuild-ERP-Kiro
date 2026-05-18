import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, FileUp, RotateCcw } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/accounting/status-badge';

export const dynamic = 'force-dynamic';

export default async function PayableDetailPage({ params }: { params: { id: string; payableId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const role = (session?.user as any)?.role;
  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.payableId, projectId: params.id, supplier: { companyId } },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true } },
      phase: { select: { id: true, name: true, auditLockedAt: true } },
      billItems: true,
      payments: { orderBy: { paidAt: 'desc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!payable) notFound();
  const isSubcontractor = ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'].includes(payable.supplier.supplierType);
  const module = isSubcontractor ? 'subcontractors' : 'suppliers';
  const canReverse = can(role, module, 'reverseAdjust') && !payable.reversedAt && payable.status !== 'WRITTEN_OFF' && !payable.phase?.auditLockedAt;
  const backHref = isSubcontractor ? `/projects/${params.id}/subcontractors/bills` : `/projects/${params.id}/payables`;
  const uploadHref = `/projects/${params.id}/documents/upload?payableId=${payable.id}&scope=${isSubcontractor ? 'SUBCONTRACTOR_BILL' : 'SUPPLIER_BILL'}&category=${encodeURIComponent(isSubcontractor ? 'subcontractor invoice' : 'supplier invoice')}&returnTo=${encodeURIComponent(`/projects/${params.id}/payables/${payable.id}`)}`;

  return (
    <div className="p-5 space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {isSubcontractor ? 'Subcontractor Bills' : 'Payables'}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{isSubcontractor ? 'Subcontractor Bill' : 'Supplier Bill'}</h2>
          <p className="text-xs text-muted-foreground">{payable.supplier.name} · Bill {payable.billNo ?? payable.id}</p>
        </div>
        {canReverse && (
          <Link href={`/projects/${params.id}/payables/${payable.id}/reverse`} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
            <RotateCcw className="h-3.5 w-3.5" /> Reverse Bill
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Bill Summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">{isSubcontractor ? 'Subcontractor' : 'Vendor'}</span><div className="font-medium">{payable.supplier.name}</div></div>
            <div><span className="text-muted-foreground">Phase</span><div className="font-medium">{payable.phase?.name ?? 'Project general'}</div></div>
            <div><span className="text-muted-foreground">Bill Date</span><div className="font-medium">{formatDate(payable.billDate)}</div></div>
            <div><span className="text-muted-foreground">Status</span><div><StatusBadge status={payable.status} tone={payable.status === 'WRITTEN_OFF' ? 'danger' : payable.status === 'PAID' ? 'success' : 'warning'} /></div></div>
            <div><span className="text-muted-foreground">Total</span><div className="font-bold">{formatBDT(Number(payable.totalAmount))}</div></div>
            <div><span className="text-muted-foreground">Paid</span><div className="font-bold text-green-600">{formatBDT(Number(payable.paidAmount))}</div></div>
            <div><span className="text-muted-foreground">Due</span><div className="font-bold text-red-600">{formatBDT(Number(payable.dueAmount))}</div></div>
            <div><span className="text-muted-foreground">Due Date</span><div className="font-medium">{formatDate(payable.dueDate)}</div></div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{payable.notes ?? '-'}</div></div>
            {payable.reversedAt && <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">Reversed on {formatDate(payable.reversedAt)}. Reason: {payable.reversalReason ?? '-'}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">Documents</CardTitle>
              <Link href={uploadHref} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
                <FileUp className="h-3.5 w-3.5" /> Upload
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payable.documents.length === 0 ? <p className="text-muted-foreground">No bill documents attached.</p> : payable.documents.map((doc) => (
              <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block rounded-md border p-2 hover:bg-muted/40">{doc.title ?? doc.fileName}</a>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
              <tbody>
                {payable.billItems.length === 0 ? <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No line items.</td></tr> : payable.billItems.map((item) => (
                  <tr key={item.id} className="border-b"><td className="px-4 py-2">{item.description}<div className="text-xs text-muted-foreground">{expenseCategoryLabel(item.category)}</div></td><td className="px-4 py-2 text-right">{formatBDT(Number(item.amount))}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-right">Action</th></tr></thead>
              <tbody>
                {payable.payments.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No payments.</td></tr> : payable.payments.map((payment) => (
                  <tr key={payment.id} className="border-b">
                    <td className="px-4 py-2">{formatDate(payment.paidAt)}<div className="text-xs text-muted-foreground">{payment.paymentMethod.replaceAll('_', ' ')}</div></td>
                    <td className="px-4 py-2 text-right text-green-600">{formatBDT(Number(payment.amount))}</td>
                    <td className="px-4 py-2 text-center"><StatusBadge status={payment.status} tone={payment.status === 'REVERSED' ? 'danger' : 'success'} /></td>
                    <td className="px-4 py-2 text-right">{payment.status !== 'REVERSED' && <Link href={`/projects/${params.id}/payables/${payable.id}/payments/${payment.id}/reverse`} className="text-xs text-red-700 hover:underline">Reverse</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
