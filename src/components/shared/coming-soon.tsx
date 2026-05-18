import { Header } from '@/components/layout/header';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col min-h-full">
      <Header title={title} />
      <div className="flex flex-col items-center justify-center flex-1 p-12 text-center text-muted-foreground">
        <Construction className="h-12 w-12 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm max-w-sm">
          {description ?? 'This page is reserved for a future workflow and is not part of the current daily project workspace.'}
        </p>
        <p className="mt-4 text-xs font-mono bg-muted px-3 py-1 rounded">
          Status: documented future workflow
        </p>
      </div>
    </div>
  );
}
