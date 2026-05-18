import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectVendorCreateForm } from '@/components/projects/project-vendor-create-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSubcontractorNewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const existingVendors = await prisma.supplier.findMany({
    where: {
      companyId,
      isActive: true,
      supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] },
    },
    select: { id: true, name: true, phone: true, supplierType: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/vendors`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project Vendors
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Subcontractor To Project</CardTitle>
          <CardDescription>
            Create a labour or service subcontractor, or select an existing one, then continue directly to a project subcontractor bill for {project.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectVendorCreateForm projectId={project.id} mode="subcontractor" existingVendors={existingVendors} />
        </CardContent>
      </Card>
    </div>
  );
}
