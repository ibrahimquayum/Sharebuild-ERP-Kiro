import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubcontractorBillForm } from '@/components/projects/subcontractor-bill-form';

export const dynamic = 'force-dynamic';

export default async function NewSubcontractorBillPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { subcontractorId?: string; supplierId?: string; projectSubcontractorId?: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [subcontractors, phases, accounts] = await Promise.all([
    prisma.projectSubcontractor.findMany({
      where: {
        companyId,
        projectId: project.id,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        workType: true,
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ supplier: { name: 'asc' } }, { createdAt: 'asc' }],
    }),
    prisma.phase.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true },
      orderBy: { sequence: 'asc' },
    }),
    prisma.cashBankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/subcontractors/bills`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Subcontractor Bills
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Record Subcontractor Bill</CardTitle>
          <CardDescription>
            Record labour and service-provider bills separately from material supplier bills. Use documents after saving for measurement sheets, agreements, invoices, and vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubcontractorBillForm
            projectId={project.id}
            subcontractors={subcontractors}
            phases={phases}
            accounts={accounts.map((account) => ({ id: account.id, label: `${account.name} - ${account.type.replaceAll('_', ' ')}` }))}
            initialProjectSubcontractorId={searchParams?.projectSubcontractorId}
            initialSubcontractorId={searchParams?.subcontractorId ?? searchParams?.supplierId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
