import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitForm } from '@/components/projects/unit-form';

export const dynamic = 'force-dynamic';

export default async function NewProjectUnitPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <Link href={`/projects/${project.id}/units`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Units
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New Unit</CardTitle>
          <CardDescription>Create an apartment, parking, shop, common, or utility unit for {project.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitForm projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
