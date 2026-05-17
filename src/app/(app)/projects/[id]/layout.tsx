import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectWorkspaceSidebar } from '@/components/layout/project-workspace-sidebar';
import { ProjectWorkspaceHeader } from '@/components/layout/project-workspace-header';

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const companyId = (session.user as any)?.companyId ?? '';

  // Load minimal project info for the chrome (name, status)
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: {
      id: true,
      name: true,
      nameBn: true,
      status: true,
      code: true,
      phone: true,
      address: true,
    },
  });

  if (!project) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ProjectWorkspaceSidebar project={project} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectWorkspaceHeader project={project} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
