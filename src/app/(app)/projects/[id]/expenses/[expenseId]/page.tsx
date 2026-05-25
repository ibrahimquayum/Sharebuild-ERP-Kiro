import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, FileText, RotateCcw, Upload } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { expenseCategoryLabel, formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/accounting/status-badge';

export const dynamic = 'force-dynamic';

export default async function ExpenseDetailPage({ params }: { params: { id: string; expenseId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const role = (session?.user as any)?.role;
  const expense = await prisma.expense.findFirst({
    where: { id: params.expenseId, phase: { projectId: params.id, project: { companyId } } },
    include: {
      phase: { select: { id: true, name: true, auditLockedAt: true } },
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!expense) notFound();

  const canReverse = can(role, 'expenses', 'reverseAdjust') && !expense.reversedAt && expense.status !== 'CANCELLED' && !expense.phase.auditLockedAt;

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${params.id}/expenses`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Expense Detail</h2>
          <p className="text-xs text-muted-foreground">{expense.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/expenses/${expense.id}/voucher`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <FileText className="h-3.5 w-3.5" /> Print Voucher
          </Link>
          <Link href={`/expenses/${expense.id}/upload`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Voucher
          </Link>
          {canReverse && (
            <Link href={`/projects/${params.id}/expenses/${expense.id}/reverse`} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reverse
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Original Record</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Phase</span><div className="font-medium">{expense.phase.name}</div></div>
            <div><span className="text-muted-foreground">Date</span><div className="font-medium">{formatDate(expense.expenseDate)}</div></div>
            <div><span className="text-muted-foreground">Amount</span><div className="font-bold text-red-600">{formatBDT(Number(expense.amount))}</div></div>
            <div><span className="text-muted-foreground">Status</span><div><StatusBadge status={expense.status} tone={expense.status === 'CANCELLED' ? 'danger' : expense.status === 'PENDING_APPROVAL' ? 'warning' : 'success'} /></div></div>
            <div><span className="text-muted-foreground">Category</span><div className="font-medium">{expenseCategoryLabel(expense.category)}</div></div>
            <div><span className="text-muted-foreground">Payment Method</span><div className="font-medium">{expense.paymentMethod.replaceAll('_', ' ')}</div></div>
            <div><span className="text-muted-foreground">Supplier / Local Shop</span><div className="font-medium">{expense.supplier?.name ?? expense.localShopName ?? 'Cash / no supplier'}</div></div>
            <div><span className="text-muted-foreground">Entered By</span><div className="font-medium">{expense.createdBy.name}</div></div>
            <div><span className="text-muted-foreground">Approved By</span><div className="font-medium">{expense.approvedBy?.name ?? '-'}</div></div>
            <div><span className="text-muted-foreground">Bill No</span><div className="font-medium">{expense.billNo ?? '-'}</div></div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{expense.notes ?? '-'}</div></div>
            {expense.reversedAt && (
              <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                Reversed on {formatDate(expense.reversedAt)}. Reason: {expense.reversalReason ?? '-'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expense.documents.length === 0 ? <p className="text-muted-foreground">Missing voucher.</p> : expense.documents.map((doc) => (
              <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block rounded-md border p-2 hover:bg-muted/40">
                <div className="font-medium">{doc.title ?? doc.fileName}</div>
                <div className="text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
