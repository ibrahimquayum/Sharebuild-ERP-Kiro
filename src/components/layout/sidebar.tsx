'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Home,
  LayoutDashboard,
  Package,
  Tags,
  Receipt,
  Settings,
  Shield,
  Truck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
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
      { title: 'Company Profile', href: '/company/settings', icon: Settings },
      { title: 'Users & Roles', href: '/company/users', icon: Shield },
      { title: 'Contacts / Buyers', href: '/company/contacts', icon: Users },
      { title: 'Suppliers', href: '/company/suppliers', icon: Truck },
      { title: 'Subcontractors', href: '/company/subcontractors', icon: Receipt },
      { title: 'Materials', href: '/company/materials', icon: Package },
      { title: 'Categories', href: '/company/categories', icon: Tags },
      { title: 'Payment Methods', href: '/company/payment-methods', icon: Receipt },
    ],
  },
  {
    label: 'Reports',
    items: [
      { title: 'Company Reports', href: '/company/reports', icon: BarChart3 },
      { title: 'Audit', href: '/company/audit', icon: AlertCircle },
    ],
  },
];

function NavItemComponent({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => item.children?.some((c) => c.href && pathname.startsWith(c.href)) ?? false);
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;

  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
          <span className="flex items-center gap-3"><item.icon className="h-4 w-4 shrink-0" />{item.title}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && <div className="ml-3 border-l border-border pl-1 mt-1 space-y-0.5">{item.children.map((child) => <NavItemComponent key={child.title} item={child} />)}</div>}
      </div>
    );
  }

  return (
    <Link href={item.href!} className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
      <item.icon className="h-4 w-4 shrink-0" />
      {item.title}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r bg-background">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"><Home className="h-4 w-4 text-primary-foreground" /></div>
        <div><div className="text-sm font-bold leading-tight">Sharebuild</div><div className="text-xs text-muted-foreground">ERP Platform</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">{section.label}</p>
            {section.items.map((item) => <NavItemComponent key={item.title} item={item} />)}
          </div>
        ))}
      </nav>
      <div className="border-t px-4 py-3"><p className="text-xs text-muted-foreground">Sharebuild ERP v0.1</p></div>
    </aside>
  );
}
