import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LucideIcon, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-6 py-5 border-b bg-background', className)}>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {action && (
          action.href ? (
            <Button asChild size="sm">
              <Link href={action.href}>
                {action.icon ? <action.icon className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.icon ? <action.icon className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
