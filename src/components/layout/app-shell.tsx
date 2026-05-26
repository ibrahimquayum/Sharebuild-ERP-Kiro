'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * AppShell — renders the global sidebar only for non-project-workspace routes.
 * Project workspace routes (/projects/[id]/*) have their own compact sidebar
 * rendered by the project layout, so the global sidebar must be hidden there.
 */
export function AppShell({
  children,
  allowedModules,
}: {
  children: React.ReactNode;
  allowedModules: string[];
}) {
  const pathname = usePathname();

  // Match project workspace routes and phase detail routes that should reuse the project shell.
  const isProjectWorkspace = /^\/projects\/[^/]+(\/|$)/.test(pathname) || /^\/phases\/[^/]+(\/|$)/.test(pathname);

  if (isProjectWorkspace) {
    // Project workspace: no global sidebar, full-width
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
