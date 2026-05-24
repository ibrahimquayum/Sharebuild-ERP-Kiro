import { PERMISSION_MODULES } from '@/lib/permissions';
import { getScopedProject, hasPermission } from '@/lib/access-control';
import { ProjectWorkspaceSidebar } from '@/components/layout/project-workspace-sidebar';
import { ProjectWorkspaceHeader } from '@/components/layout/project-workspace-header';

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const { context, project } = await getScopedProject(params.id, 'projects', 'view');
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
    <div className="flex h-screen overflow-hidden bg-background">
      <ProjectWorkspaceSidebar project={workspaceProject} allowedModules={allowedModules} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectWorkspaceHeader project={workspaceProject} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
