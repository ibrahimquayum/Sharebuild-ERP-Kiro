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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ProjectWorkspaceSidebar project={project} allowedModules={allowedModules} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectWorkspaceHeader project={project} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
