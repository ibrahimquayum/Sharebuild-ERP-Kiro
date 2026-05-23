'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectMeta {
  id: string;
  name: string;
  nameBn: string | null;
  status: string;
  code: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PLANNING: 'bg-yellow-100 text-yellow-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  end?: boolean;
  children?: SubItem[];
}

function buildNav(projectId: string): NavItem[] {
  const base = `/projects/${projectId}`;

  return [
    {
      label: 'Overview',
      href: base,
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: 'Setup',
      icon: Building2,
      children: [
        { label: 'Project Profile', href: `${base}/settings` },
        { label: 'Land & Building', href: `${base}/settings#land-building` },
        { label: 'Units', href: `${base}/units` },
        { label: 'Buyers & Ownership', href: `${base}/buyers` },
      ],
    },
    {
      label: 'Finance',
      icon: DollarSign,
      children: [
        { label: 'Overview', href: `${base}/finance` },
        { label: 'Demands & Due', href: `${base}/demands` },
        { label: 'Collections', href: `${base}/collections` },
        { label: 'Expenses', href: `${base}/expenses` },
        { label: 'Supplier Bills', href: `${base}/payables` },
        { label: 'Supplier Payments', href: `${base}/payables/payments` },
        { label: 'Subcontractor Bills', href: `${base}/subcontractors/bills` },
        { label: 'Subcontractor Payments', href: `${base}/payables/payments?type=subcontractor` },
        { label: 'Cash / Bank', href: `${base}/finance/cash-bank` },
        { label: 'Cheques', href: `${base}/finance/cheques` },
        { label: 'Project Balance', href: `${base}/reports/top-sheet` },
      ],
    },
    {
      label: 'Work',
      icon: Layers,
      children: [
        { label: 'Phases', href: `${base}/phases` },
        { label: 'Vendors', href: `${base}/vendors` },
        { label: 'Subcontractors', href: `${base}/subcontractors` },
      ],
    },
    {
      label: 'Documents',
      href: `${base}/documents`,
      icon: FileText,
    },
    {
      label: 'Reports',
      href: `${base}/reports`,
      icon: BarChart3,
    },
    {
      label: 'Audit',
      href: `${base}/audit`,
      icon: Shield,
    },
    {
      label: 'Settings',
      href: `${base}/settings`,
      icon: Settings,
    },
  ];
}

function NavItemRow({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const childActive =
    item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href + '/')) ?? false;
  const [open, setOpen] = useState(childActive);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            childActive ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </span>
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </button>
        {open ? (
          <div className="ml-4 mt-0.5 border-l border-border pl-2 space-y-0.5">
            {item.children.map((child) => {
              const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  const isActive = item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href! + '/');

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function ProjectWorkspaceSidebar({ project }: { project: ProjectMeta }) {
  const navItems = buildNav(project.id);
  const displayName = project.name.length > 30 ? `${project.name.slice(0, 30)}…` : project.name;

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r bg-background">
      <div className="border-b px-3 py-2.5 flex items-center justify-between gap-2">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All Projects
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-3 w-3" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </div>

      <div className="px-3 py-3 border-b">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate" title={project.name}>
              {displayName}
            </p>
            {project.nameBn ? <p className="text-xs bn text-muted-foreground truncate">{project.nameBn}</p> : null}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded font-medium',
                  STATUS_COLOR[project.status] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {project.status}
              </span>
              {project.code ? <span className="text-xs font-mono text-muted-foreground">{project.code}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItemRow key={item.label} item={item} />
        ))}
      </nav>

      <div className="border-t px-3 py-2.5">
        <p className="text-xs text-muted-foreground">Sharebuild ERP v0.1</p>
      </div>
    </aside>
  );
}
