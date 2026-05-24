import { notFound } from 'next/navigation';
import { getScopedProject } from '@/lib/access-control';
import { getCompanyBranding } from '@/lib/branding';
import { prisma } from '@/lib/prisma';

export async function getProjectReportContext(projectId: string) {
  const { context, project } = await getScopedProject(projectId, 'reports', 'view');
  const scopedProject = await prisma.project.findFirst({
    where: { id: project.id, companyId: context.companyId },
    select: { id: true, name: true, nameBn: true, code: true, address: true, phone: true },
  });
  if (!scopedProject) notFound();
  const branding = await getCompanyBranding(context.companyId);
  return { project: scopedProject, branding, context };
}
