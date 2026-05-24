'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

function monogram(name: string) {
  const tokens = name
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) return 'SB';
  return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('') || 'SB';
}

export function ReportLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(!logoUrl);
  const initials = useMemo(() => monogram(name), [name]);

  return (
    <div
      className={cn(
        'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      {!failed && logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-center">
          <div className="text-lg font-semibold tracking-wide text-slate-700">{initials}</div>
          <div className="px-2 text-[9px] uppercase tracking-[0.18em] text-slate-500">Company</div>
        </div>
      )}
    </div>
  );
}
