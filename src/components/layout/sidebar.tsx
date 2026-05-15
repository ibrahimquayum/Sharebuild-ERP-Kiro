'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Layers,
  Users,
  ShoppingCart,
  FileText,
  BarChart3,
  AlertCircle,
  Truck,
  Receipt,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: Building2,
  },
  {
    title: 'Phases',
    icon: Layers,
    children: [
      { title: 'All Phases', href: '/phases', icon: Layers },
      { title: 'Add Phase', href: '/phases/new', icon: Layers },
    ],
  },
  {
    title: 'Buyers',
    icon: Users,
    children: [
      { title: 'Buyer List', href: '/buyers', icon: Users },
      { title: 'Add Buyer', href: '/buyers/new', icon: Users },
      { title: 'Due List', href: '/buyers/dues', icon: AlertCircle },
    ],
  },
  {
    title: 'Collections',
    icon: Receipt,
    children: [
      { title: 'All Collections', href: '/collections', icon: Receipt },
      { title: 'Record Payment', href: '/collections/new', icon: Receipt },
      { title: 'Demand Notices', href: '/demands', icon: FileText },
    ],
  },
  {
    title: 'Expenses',
    icon: ShoppingCart,
    children: [
      { title: 'All Expenses', href: '/expenses', icon: ShoppingCart },
      { title: 'Add Expense', href: '/expenses/new', icon: ShoppingCart },
      { title: 'Material Purchase', href: '/materials', icon: Truck },
      { title: 'Pending Approvals', href: '/expenses/approvals', icon: AlertCircle },
    ],
  },
  {
    title: 'Suppliers',
    icon: Truck,
    children: [
      { title: 'Supplier List', href: '/suppliers', icon: Truck },
      { title: 'Payables', href: '/suppliers/payables', icon: Receipt },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    children: [
      { title: 'Top Sheet', href: '/reports/top-sheet', icon: BarChart3 },
      { title: 'Phase Summary', href: '/reports/phase-summary', icon: Layers },
      { title: 'Buyer Statement', href: '/reports/buyer-statement', icon: Users },
      { title: 'Due Report', href: '/reports/due-report', icon: AlertCircle },
      { title: 'Expense Report', href: '/reports/expenses', icon: ShoppingCart },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.href && pathname.startsWith(c.href));
    }
    return false;
  });

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            depth > 0 && 'pl-6'
          )}
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && (
          <div className="ml-3 border-l border-border pl-1 mt-1 space-y-0.5">
            {item.children.map((child) => (
              <NavItemComponent key={child.title} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        depth > 0 && 'pl-6 text-xs'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.title}
      {item.badge && (
        <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Home className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Sharebuild</div>
          <div className="text-xs text-muted-foreground">ERP Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent key={item.title} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">Sharebuild ERP v0.1</p>
      </div>
    </aside>
  );
}
