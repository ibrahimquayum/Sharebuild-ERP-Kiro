import type { ReactNode } from 'react';

import { ReportLogo } from '@/components/reports/report-logo';
import { cn, formatDate } from '@/lib/utils';

type Branding = {
  name: string;
  nameBn?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  reportFooterNote?: string | null;
};

type ProjectInfo = {
  id?: string;
  name: string;
  nameBn?: string | null;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
};

export function PrintDocumentShell({
  branding,
  project,
  title,
  generatedAt,
  children,
}: {
  branding: Branding;
  project: ProjectInfo;
  title: string;
  generatedAt: Date;
  children: ReactNode;
}) {
  return (
    <div className="print-document mx-auto w-full max-w-[1320px] bg-white px-4 py-5 print:max-w-none print:px-0 print:py-0">
      <article className="print-document bg-white text-slate-900">
        <div className="print-only mb-3 border-b border-slate-200 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {branding.name} | {project.name} | {title}
        </div>
        {children}
        <PrintGeneratedMark generatedAt={generatedAt} note={branding.reportFooterNote} />
      </article>
    </div>
  );
}

export function PrintPage({
  children,
  breakBefore = false,
  className,
}: {
  children: ReactNode;
  breakBefore?: boolean;
  className?: string;
}) {
  return (
    <section className={cn('report-page space-y-4 py-2 print:py-0', breakBefore && 'page-break-before', className)}>
      {children}
    </section>
  );
}

export function PrintCoverPage({
  branding,
  project,
  title,
  reportingPeriod,
  generatedAt,
  generatedBy,
  note,
}: {
  branding: Branding;
  project: ProjectInfo;
  title: string;
  reportingPeriod?: string;
  generatedAt: Date;
  generatedBy?: string;
  note?: string;
}) {
  return (
    <PrintPage className="flex min-h-[760px] flex-col justify-between print:min-h-[257mm]">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-5">
          <div className="flex items-start gap-4">
            <ReportLogo name={branding.name} logoUrl={branding.logoUrl} className="h-16 w-16 rounded-lg border-slate-300 shadow-none" />
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Confidential business report</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{branding.name}</h1>
              {branding.nameBn ? <p className="bn text-sm text-slate-600">{branding.nameBn}</p> : null}
              <p className="text-sm leading-6 text-slate-600">
                {[branding.address, branding.phone, branding.email, branding.website].filter(Boolean).join(' | ') || 'Branding contact details are partially configured.'}
              </p>
            </div>
          </div>
          <div className="w-[230px] shrink-0 border border-slate-300 px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold uppercase tracking-wide text-slate-900">Generated</div>
            <div className="mt-2">{formatDate(generatedAt)}</div>
            <div>{generatedAt.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="font-medium text-slate-900">Prepared by</div>
              <div>{generatedBy || 'Authorized report user'}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sharebuild ERP project file</div>
          <h2 className="text-[34px] font-semibold leading-tight tracking-tight text-slate-950">{title}</h2>
          <p className="max-w-4xl text-sm leading-6 text-slate-600">
            Project billing, construction cost, vendor, treasury, reconciliation, and audit reporting arranged for client, management, and audit review.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <PrintMetadataBlock
            title="Project reference"
            rows={[
              ['Project name', project.name],
              ['Project name (Bangla)', project.nameBn || 'Not recorded'],
              ['Project code', project.code || 'Not assigned'],
              ['Project address', project.address || 'Project address not recorded'],
              ['Project phone', project.phone || 'Not recorded'],
            ]}
          />
          <PrintMetadataBlock
            title="Report metadata"
            rows={[
              ['Report title', title],
              ['Reporting period', reportingPeriod || 'Full available project history'],
              ['Generated on', formatDate(generatedAt)],
              ['Confidentiality', 'Internal management and audit use'],
            ]}
          />
        </div>
      </div>

      <PrintNoteBox title="Report note">
        {note || 'Supplier bill items appear inside daily project cost details and phase breakdowns. Supplier ledger remains the separate supplier-wise payable and payment relationship report.'}
      </PrintNoteBox>
    </PrintPage>
  );
}

export function PrintMetadataBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, ReactNode]>;
}) {
  return (
    <section className="avoid-break border border-slate-300">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
        {title}
      </div>
      <div className="divide-y divide-slate-200">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-2 px-4 py-2.5 md:grid-cols-[180px_1fr]">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-sm text-slate-800">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrintSection({
  title,
  description,
  children,
  breakBefore = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={cn('report-section space-y-3', breakBefore && 'page-break-before')}>
      <div className="report-section-heading border-b border-slate-300 pb-2">
        <h2 className="text-[18px] font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PrintSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="avoid-break space-y-2">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PrintTable({
  children,
  dense = false,
}: {
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className="avoid-break overflow-x-auto border border-slate-300 print:overflow-visible">
      <table className={cn('w-full border-collapse text-sm', dense ? 'text-[11px]' : 'text-sm')}>{children}</table>
    </div>
  );
}

export function PrintSummaryTable({
  rows,
}: {
  rows: Array<{
    label: ReactNode;
    value: ReactNode;
    note?: ReactNode;
    tone?: 'default' | 'positive' | 'negative' | 'info' | 'warning';
  }>;
}) {
  return (
    <PrintTable dense>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${index}-${String(row.label)}`} className="border-b border-slate-200 last:border-b-0">
            <td className="w-[32%] px-3 py-2.5 font-medium text-slate-900">{row.label}</td>
            <td className="w-[22%] px-3 py-2.5 text-right">
              <PrintAmount value={row.value} tone={row.tone} />
            </td>
            <td className="px-3 py-2.5 text-xs leading-5 text-slate-600">{row.note ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </PrintTable>
  );
}

export function PrintAmount({
  value,
  tone = 'default',
}: {
  value: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'info' | 'muted';
}) {
  const toneClass = {
    default: 'text-slate-900',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
    warning: 'text-amber-700',
    info: 'text-sky-700',
    muted: 'text-slate-600',
  }[tone];

  return <span className={cn('font-semibold tabular-nums', toneClass)}>{value}</span>;
}

export function PrintStatusPill({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'info';
}) {
  const toneClass = {
    default: 'border-slate-300 text-slate-700',
    positive: 'border-emerald-300 text-emerald-700',
    negative: 'border-rose-300 text-rose-700',
    warning: 'border-amber-300 text-amber-700',
    info: 'border-sky-300 text-sky-700',
  }[tone];

  return <span className={cn('inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', toneClass)}>{label}</span>;
}

export function PrintNoteBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="avoid-break border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function PrintCompactEmptyState({
  title,
  message = 'No records found for this report scope.',
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="avoid-break rounded-sm border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
      <span className="font-medium text-slate-800">{title}:</span> {message}
    </div>
  );
}

export function PrintSignatureBlock({
  labels,
}: {
  labels: string[];
}) {
  return (
    <div className="space-y-8 pt-8">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sign-off</div>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">Prepared, checked, and approved</h3>
      </div>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {labels.map((label) => (
          <div key={label} className="pt-12 text-center">
            <div className="border-t border-slate-400 pt-2 text-sm font-medium text-slate-700">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="pt-8 text-center">
          <div className="border-t border-slate-400 pt-2 text-sm font-medium text-slate-700">Date</div>
        </div>
      </div>
    </div>
  );
}

export function PrintPageBreak() {
  return <div className="page-break-before h-0" aria-hidden="true" />;
}

function PrintGeneratedMark({
  generatedAt,
  note,
}: {
  generatedAt: Date;
  note?: string | null;
}) {
  return (
    <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-500">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>{note || 'Generated from Sharebuild ERP reporting data.'}</div>
        <div>Generated by Sharebuild ERP on {formatDate(generatedAt)}</div>
      </div>
    </footer>
  );
}
