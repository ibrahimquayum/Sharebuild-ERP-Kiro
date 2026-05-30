'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Home,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  Tags,
  Truck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  module?: string;
  children?: NavItem[];
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Projects', href: '/projects', icon: Building2 },
    ],
  },
  {
    label: 'Company',
    items: [
      { title: 'Company Profile', href: '/company/settings', icon: Settings, module: 'settings' },
      { title: 'Users & Roles', href: '/company/users', icon: Shield, module: 'users' },
      { title: 'Contacts / Buyers', href: '/company/contacts', icon: Users, module: 'buyers' },
      { title: 'Suppliers', href: '/company/suppliers', icon: Truck, module: 'suppliers' },
      { title: 'Subcontractors', href: '/company/subcontractors', icon: Receipt, module: 'subcontractors' },
      { title: 'Materials', href: '/company/materials', icon: Package, module: 'settings' },
      { title: 'Categories', href: '/company/categories', icon: Tags, module: 'settings' },
      { title: 'Payment Methods', href: '/company/payment-methods', icon: Receipt, module: 'settings' },
      { title: 'Accounts / Cash & Bank', href: '/company/accounts', icon: CircleDollarSign, module: 'accounts' },
      { title: 'Cheques', href: '/company/cheques', icon: CircleDollarSign, module: 'cheques' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { title: 'Company Reports', href: '/company/reports', icon: BarChart3, module: 'reports' },
      { title: 'Audit', href: '/company/audit', icon: AlertCircle, module: 'audit' },
    ],
  },
];

function filterSections(allowedModules: string[]) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.module || allowedModules.includes(item.module)),
    }))
    .filter((section) => section.items.length > 0);
}

function NavItemComponent({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => item.children?.some((c) => c.href && pathname.startsWith(c.href)) ?? false);
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open ? (
          <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-200 pl-1">
            {item.children.map((child) => (
              <NavItemComponent key={child.title} item={child} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.title}
    </Link>
  );
}

export function Sidebar({ allowedModules }: { allowedModules: string[] }) {
  const visibleSections = filterSections(allowedModules);

  return (
    <aside data-app-shell-sidebar="true" className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-background">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Home className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-slate-900">Sharebuild</div>
          <div className="text-xs text-muted-foreground">ERP Platform</div>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavItemComponent key={item.title} item={item} />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[11px] text-slate-400">Sharebuild ERP v0.1</p>
      </div>
    </aside>
  );
}
