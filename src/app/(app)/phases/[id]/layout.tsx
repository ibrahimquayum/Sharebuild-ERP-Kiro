import { notFound } from 'next/navigation';

import { PERMISSION_MODULES } from '@/lib/permissions';
import { hasPermission, getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { ProjectWorkspaceHeader } from '@/components/layout/project-workspace-header';
import { ProjectWorkspaceSidebar } from '@/components/layout/project-workspace-sidebar';

export default async function PhaseWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const phase = await prisma.phase.findUnique({
    where: { id: params.id },
    select: { projectId: true },
  });

  if (!phase) notFound();

  const { context, project } = await getScopedProject(phase.projectId, 'phases', 'view');
  const allowedModules = PERMISSION_MODULES.filter((module) => hasPermission(context, module, 'view'));
  const workspaceProject = {
    id: project.id,
    name: project.name,
    nameBn: project.nameBn,
    status: project.status,
    code: project.code,
    phone: project.phone,
    address: project.address,
  };

  return (
    <div data-project-workspace-shell="true" className="flex h-screen overflow-hidden bg-background">
      <ProjectWorkspaceSidebar project={workspaceProject} allowedModules={allowedModules} />
      <div data-project-workspace-content="true" className="flex flex-1 flex-col overflow-hidden">
        <ProjectWorkspaceHeader project={workspaceProject} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
