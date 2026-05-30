'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * Returns true for routes that own their sidebar via a dedicated workspace layout.
 *
 * Project workspace routes render their own sidebar through a route-level layout:
 *  - /projects/[projectId] and nested  (projects/[id]/layout.tsx)
 *  - /phases/[phaseId] and nested      (phases/[id]/layout.tsx)
 *
 * The global AppShell sidebar must be suppressed for these routes to avoid
 * rendering a duplicate sidebar alongside the workspace sidebar.
 */
export function isProjectWorkspaceRoute(pathname: string): boolean {
  return /^\/projects\/[^/]+(\/|$)/.test(pathname) || /^\/phases\/[^/]+(\/|$)/.test(pathname);
}

/**
 * AppShell — renders the global sidebar for every route except the project
 * workspace routes that already supply their own sidebar via a dedicated layout.
 *
 * Both /projects/[id]/* and /phases/[id]/* mount a workspace layout that renders
 * the ProjectWorkspaceSidebar, so the global sidebar is suppressed for them to
 * avoid a duplicate sidebar. All other routes (e.g. /dashboard, /projects,
 * /buyers/[id], /suppliers/[id], /reports/*, /finance/*, /company/*) receive the
 * global sidebar — no route is left without a sidebar.
 */
export function AppShell({
  children,
  allowedModules,
}: {
  children: React.ReactNode;
  allowedModules: string[];
}) {
  const pathname = usePathname();

  if (isProjectWorkspaceRoute(pathname)) {
    // Project workspace: no global sidebar, full-width (workspace layout owns the sidebar)
    return <>{children}</>;
  }

  return (
    <div data-app-shell="true" className="flex h-screen overflow-hidden bg-background">
      <Sidebar allowedModules={allowedModules} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
