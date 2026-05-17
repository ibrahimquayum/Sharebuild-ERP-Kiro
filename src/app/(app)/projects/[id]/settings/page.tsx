import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectForm } from '@/components/projects/project-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId } });
  if (!project) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
      <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
          <CardDescription>Edit project profile and planning details. Financial totals are calculated from project work records.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm project={{
            id: project.id,
            name: project.name,
            nameBn: project.nameBn,
            code: project.code,
            address: project.address,
            phone: project.phone,
            landSize: project.landSize,
            totalFloors: project.totalFloors,
            residentialFloors: project.residentialFloors,
            unitsPerFloor: project.unitsPerFloor,
            totalPlannedUnits: project.totalPlannedUnits,
            parkingUtilityNote: project.parkingUtilityNote,
            notes: project.notes,
            status: project.status,
            startDate: project.startDate,
            description: project.description,
            defaultServiceChargePct: project.defaultServiceChargePct?.toString() ?? '',
          }} />
        </CardContent>
      </Card>
    </div>
  );
}
