'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * AppShell — renders the global sidebar only for non-project-workspace routes.
 * Project workspace routes (/projects/[id]/*) have their own compact sidebar
 * rendered by the project layout, so the global sidebar must be hidden there.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Match /projects/[id] and any sub-route
  const isProjectWorkspace = /^\/projects\/[^/]+(\/|$)/.test(pathname);

  if (isProjectWorkspace) {
    // Project workspace: no global sidebar, full-width
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
