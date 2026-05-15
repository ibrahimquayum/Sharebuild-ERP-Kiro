import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT, formatDate, expenseCategoryLabel, cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { ApprovalActions } from './approval-actions';

export const dynamic = 'force-dynamic';

export default async function ExpenseApprovalsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const userRole  = (session?.user as any)?.role ?? '';

  const canApprove = ['COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);

  const pending = await prisma.expense.findMany({
    where: { phase: { project: { companyId } }, status: 'PENDING_APPROVAL' },
    include: {
      phase:     { select: { id: true, name: true } },
      supplier:  { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalPending = pending.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Expense Approvals" />
      <PageHeader
        title="Pending Expense Approvals"
        subtitle={`${pending.length} expense(s) awaiting review — Total: ${formatBDT(totalPending)}`}
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No pending approvals</p>
                <p className="text-sm mt-1">All expenses have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">By</th>
                      {canApprove && (
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((e, i) => (
                      <tr key={e.id} className="border-b last:border-0 bg-yellow-50/40 hover:bg-yellow-50/70 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(e.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{e.description}</div>
                          {e.descriptionBn && <div className="bn text-xs text-muted-foreground">{e.descriptionBn}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/phases/${e.phase.id}`} className="text-xs hover:text-primary hover:underline">
                            {e.phase.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{expenseCategoryLabel(e.category)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">{formatBDT(Number(e.amount))}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{e.createdBy.name}</td>
                        {canApprove && (
                          <td className="px-4 py-3 text-center">
                            <ApprovalActions expenseId={e.id} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/60 font-bold border-t-2">
                      <td colSpan={5} className="px-4 py-3">Total Pending</td>
                      <td className="px-4 py-3 text-right text-red-500">{formatBDT(totalPending)}</td>
                      <td colSpan={canApprove ? 2 : 1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
