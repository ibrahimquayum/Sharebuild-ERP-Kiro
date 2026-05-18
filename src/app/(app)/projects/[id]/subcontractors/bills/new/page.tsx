import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubcontractorBillForm } from '@/components/projects/subcontractor-bill-form';

export const dynamic = 'force-dynamic';

export default async function NewSubcontractorBillPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [subcontractors, phases] = await Promise.all([
    prisma.supplier.findMany({
      where: {
        companyId,
        isActive: true,
        supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.phase.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true },
      orderBy: { sequence: 'asc' },
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
          <SubcontractorBillForm projectId={project.id} subcontractors={subcontractors} phases={phases} />
        </CardContent>
      </Card>
    </div>
  );
}
