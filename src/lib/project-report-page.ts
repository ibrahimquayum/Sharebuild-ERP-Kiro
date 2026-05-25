import { notFound } from 'next/navigation';
import { getScopedProject } from '@/lib/access-control';
import { getCompanyBranding } from '@/lib/branding';
import { prisma } from '@/lib/prisma';
import type { PermissionAction, PermissionModule } from '@/lib/permissions';

export async function getProjectDocumentContext(
  projectId: string,
  module: PermissionModule = 'projects',
  action: PermissionAction = 'view',
) {
  const { context, project } = await getScopedProject(projectId, module, action);
  const scopedProject = await prisma.project.findFirst({
    where: { id: project.id, companyId: context.companyId },
    select: { id: true, name: true, nameBn: true, code: true, address: true, phone: true },
  });
  if (!scopedProject) notFound();
  const branding = await getCompanyBranding(context.companyId);
  return { project: scopedProject, branding, context };
}

export async function getProjectReportContext(projectId: string) {
  return getProjectDocumentContext(projectId, 'reports', 'view');
}
