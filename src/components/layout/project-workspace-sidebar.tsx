'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Layers,
  Users,
  Receipt,
  ShoppingCart,
  Truck,
  FileText,
  AlertCircle,
  BarChart3,
  Building2,
  Home,
  ChevronLeft,
  MapPin,
} from 'lucide-react';

interface ProjectMeta {
  id: string;
  name: string;
  nameBn: string | null;
  status: string;
  code: string | null;
}

interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  end?: boolean; // exact match for active detection
}

function workspaceNav(projectId: string): WorkspaceNavItem[] {
  const base = `/projects/${projectId}`;
  return [
    { label: 'Overview',           href: `${base}`,                    icon: LayoutDashboard, end: true },
    { label: 'Phase Board',        href: `${base}/phases`,              icon: Layers },
    { label: 'Buyers',             href: `${base}/buyers`,              icon: Users },
    { label: 'Collections',        href: `${base}/collections`,         icon: Receipt },
    { label: 'Expenses',           href: `${base}/expenses`,            icon: ShoppingCart },
    { label: 'Supplier Payables',  href: `${base}/payables`,            icon: Truck },
    { label: 'Demands',            href: `${base}/demands`,             icon: FileText },
    { label: 'Due Follow-up',      href: `${base}/due-followup`,        icon: AlertCircle },
    { label: 'Documents',          href: `${base}/documents`,           icon: FileText },
    { label: 'Top Sheet',          href: `${base}/reports/top-sheet`,   icon: BarChart3 },
  ];
}

function NavItem({ item }: { item: WorkspaceNavItem }) {
  const pathname = usePathname();
  const isActive = item.end
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function ProjectWorkspaceSidebar({ project }: { project: ProjectMeta }) {
  const navItems = workspaceNav(project.id);

  const statusColor: Record<string, string> = {
    ACTIVE:    'bg-green-100 text-green-700',
    PLANNING:  'bg-yellow-100 text-yellow-700',
    ON_HOLD:   'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r bg-background">
      {/* Back to company */}
      <div className="border-b px-3 py-3">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All Projects
        </Link>
      </div>

      {/* Project identity */}
      <div className="px-3 py-3 border-b">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{project.name}</p>
            {project.nameBn && (
              <p className="text-xs bn text-muted-foreground truncate">{project.nameBn}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', statusColor[project.status] ?? 'bg-gray-100 text-gray-600')}>
                {project.status}
              </span>
              {project.code && (
                <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          Company Dashboard
        </Link>
      </div>
    </aside>
  );
}
