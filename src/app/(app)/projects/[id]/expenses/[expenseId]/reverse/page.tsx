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

export default async function ExpenseReversePage({ params }: { params: { id: string; expenseId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const expense = await prisma.expense.findFirst({
    where: { id: params.expenseId, phase: { projectId: params.id, project: { companyId } } },
    include: { phase: { select: { name: true } } },
  });
  if (!expense) notFound();

  return (
    <div className="p-5 max-w-3xl space-y-5">
      <Link href={`/projects/${params.id}/expenses/${params.expenseId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to expense
      </Link>
      <Card>
        <CardHeader><CardTitle>Reverse Expense</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-semibold">{expense.description} · {formatBDT(Number(expense.amount))}</div>
            <div className="text-muted-foreground">{expense.phase.name} · {formatDate(expense.expenseDate)}</div>
          </div>
          <p className="text-sm text-muted-foreground">This keeps the original expense visible, marks it cancelled/reversed, removes it from official finance totals, and writes an audit log.</p>
          <ReversalForm endpoint={`/api/expenses/${expense.id}/reverse`} returnHref={`/projects/${params.id}/expenses/${expense.id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
