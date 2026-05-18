import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkExpenseForm } from '@/components/projects/bulk-expense-form';

export const dynamic = 'force-dynamic';

export default async function BulkExpensePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [phases, suppliers] = await Promise.all([
    prisma.phase.findMany({
      where: { projectId: project.id },
      orderBy: { sequence: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, supplierType: true },
    }),
  ]);

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${project.id}/expenses`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <div>
        <h2 className="text-base font-semibold">Bulk Expense Entry</h2>
        <p className="text-xs text-muted-foreground">{project.name} · field engineer/site staff daily expense submission</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daily Site Expenses</CardTitle>
          <CardDescription>Enter multiple project/phase costs at once. Missing vouchers are allowed but remain visible for audit follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkExpenseForm
            projectId={project.id}
            phases={phases.map((phase) => ({ id: phase.id, label: phase.name }))}
            suppliers={suppliers.map((supplier) => ({ id: supplier.id, label: `${supplier.name} · ${supplier.supplierType.replaceAll('_', ' ').toLowerCase()}` }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
