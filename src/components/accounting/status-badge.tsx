import { cn } from '@/lib/utils';

export function StatusBadge({ status, tone = 'default' }: { status: string; tone?: 'default' | 'danger' | 'success' | 'warning' }) {
  const color = tone === 'danger'
    ? 'bg-red-100 text-red-700'
    : tone === 'success'
      ? 'bg-green-100 text-green-700'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-muted text-muted-foreground';
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', color)}>{status.replaceAll('_', ' ')}</span>;
}
