import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

type StatAccent = 'blue' | 'green' | 'red' | 'amber' | 'violet' | 'sky' | 'slate';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
  accent?: StatAccent;
}

const accentTopBorder: Record<StatAccent, string> = {
  blue: 'border-t-2 border-t-blue-500',
  green: 'border-t-2 border-t-emerald-500',
  red: 'border-t-2 border-t-red-500',
  amber: 'border-t-2 border-t-amber-500',
  violet: 'border-t-2 border-t-violet-500',
  sky: 'border-t-2 border-t-sky-500',
  slate: 'border-t-2 border-t-slate-400',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  className,
  accent,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'h-full rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        accent && accentTopBorder[accent],
        className,
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>

        <p className="mt-2 break-words text-xl font-bold leading-tight tabular-nums text-slate-900">{value}</p>

        {subtitle && <p className="mt-1 break-words text-xs text-muted-foreground">{subtitle}</p>}

        {trend && (
          <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
            {trend.positive ? '▲' : '▼'} {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
