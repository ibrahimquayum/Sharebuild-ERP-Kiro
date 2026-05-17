import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompanyBranding } from '@/lib/branding';
import { prisma } from '@/lib/prisma';

export async function getProjectReportContext(projectId: string) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true, name: true, nameBn: true, code: true, address: true, phone: true },
  });
  if (!project) notFound();
  const branding = await getCompanyBranding(companyId);
  return { project, branding };
}
