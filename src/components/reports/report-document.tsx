import type { ReactNode } from 'react';

import { ReportExportToolbar } from '@/components/reports/report-export-toolbar';
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

export function ReportDocumentLayout({
  branding,
  project,
  title,
  subtitle,
  generatedAt,
  backHref,
  backLabel,
  workbookHref,
  csvHref,
  showHeader = true,
  children,
}: {
  branding: Branding;
  project?: ProjectInfo;
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  backHref?: string;
  backLabel?: string;
  workbookHref?: string;
  csvHref?: string;
  showHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 px-4 py-5 print:max-w-none print:px-0 print:py-0">
      <ReportExportToolbar backHref={backHref} backLabel={backLabel} workbookHref={workbookHref} csvHref={csvHref} />
      <article
        data-report-document="true"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
      >
        {showHeader ? (
          <ReportHeader
            branding={branding}
            project={project}
            title={title}
            subtitle={subtitle}
            generatedAt={generatedAt}
          />
        ) : null}
        <div className="space-y-8 px-6 py-6 print:px-0 print:py-0">{children}</div>
        <ReportFooter note={branding.reportFooterNote} generatedAt={generatedAt} />
      </article>
    </div>
  );
}

export function ReportCoverPage({
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
    <section className="report-avoid-break flex min-h-[920px] flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-8 py-8 print:min-h-[250mm] print:rounded-none print:border-0 print:bg-white print:px-0 print:py-2">
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <ReportLogo name={branding.name} logoUrl={branding.logoUrl} className="h-20 w-20 rounded-xl" />
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Client Report</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{branding.name}</h1>
              {branding.nameBn ? <p className="bn text-base text-slate-600">{branding.nameBn}</p> : null}
              <p className="max-w-2xl text-sm text-slate-600">
                {[branding.address, branding.phone, branding.email].filter(Boolean).join(' | ') || 'Company branding not fully configured yet.'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-xs text-slate-600 shadow-sm">
            <div className="font-semibold text-slate-800">Generated</div>
            <div>{formatDate(generatedAt)}</div>
            <div>{generatedAt.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className="space-y-3 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sharebuild ERP Reporting Suite</p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Consolidated financial, billing, treasury, vendor, and audit reporting for professional client review.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Project</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{project.name}</div>
            {project.nameBn ? <div className="bn mt-1 text-sm text-slate-600">{project.nameBn}</div> : null}
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div><span className="font-medium text-slate-900">Code:</span> {project.code || 'Not assigned'}</div>
              <div><span className="font-medium text-slate-900">Address:</span> {project.address || 'Project address not recorded'}</div>
              {project.phone ? <div><span className="font-medium text-slate-900">Phone:</span> {project.phone}</div> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Report Metadata</div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div><span className="font-medium text-slate-900">Reporting period:</span> {reportingPeriod || 'Full available project history'}</div>
              <div><span className="font-medium text-slate-900">Prepared on:</span> {formatDate(generatedAt)}</div>
              <div><span className="font-medium text-slate-900">Prepared by:</span> {generatedBy || 'Authorized report user'}</div>
              <div><span className="font-medium text-slate-900">Confidentiality:</span> Internal management and audit use</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
        <div className="font-medium text-slate-900">Report note</div>
        <p>{note || 'This report combines historical imported balances with current system-ledger reporting where transactional history exists.'}</p>
      </div>
    </section>
  );
}

export function ReportHeader({
  branding,
  project,
  title,
  subtitle,
  generatedAt,
}: {
  branding: Branding;
  project?: ProjectInfo;
  title: string;
  subtitle?: string;
  generatedAt?: Date;
}) {
  return (
    <header className="border-b border-slate-200 px-6 py-5 print:px-0 print:py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <ReportLogo name={branding.name} logoUrl={branding.logoUrl} />
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Professional Report</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">{branding.name}</div>
            {branding.nameBn ? <div className="bn text-sm text-slate-600">{branding.nameBn}</div> : null}
            <div className="text-xs text-slate-500">
              {[branding.address, branding.phone, branding.email, branding.website].filter(Boolean).join(' | ') || 'Company identity is partially configured.'}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs text-slate-600">
          <div className="font-medium text-slate-900">{title}</div>
          {generatedAt ? (
            <>
              <div>{formatDate(generatedAt)}</div>
              <div>{generatedAt.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}</div>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Document</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </div>
        {project ? (
          <div className="min-w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="font-semibold text-slate-900">
              {project.name}
              {project.code ? ` (${project.code})` : ''}
            </div>
            {project.nameBn ? <div className="bn text-xs text-slate-500">{project.nameBn}</div> : null}
            <div className="mt-2 text-xs">
              {[project.address, project.phone].filter(Boolean).join(' | ') || 'Project contact details are partially configured.'}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ReportFooter({
  note,
  generatedAt,
}: {
  note?: string | null;
  generatedAt?: Date;
}) {
  return (
    <footer className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 print:px-0 print:py-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>{note || 'Generated from Sharebuild ERP reporting data.'}</div>
        <div>
          Generated by Sharebuild ERP{generatedAt ? ` on ${formatDate(generatedAt)}` : ''}
        </div>
      </div>
    </footer>
  );
}

export function ReportSection({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={cn('report-avoid-break space-y-4', compact ? 'space-y-3' : 'space-y-4')}>
      <div className="space-y-1 border-b border-slate-200 pb-3">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ReportSummaryGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function ReportKpiCard({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'info';
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'border-slate-200 bg-white',
    positive: 'border-emerald-200 bg-emerald-50/70',
    negative: 'border-rose-200 bg-rose-50/70',
    warning: 'border-amber-200 bg-amber-50/70',
    info: 'border-sky-200 bg-sky-50/70',
  };

  return (
    <div className={cn('rounded-2xl border px-4 py-4 shadow-sm', toneClasses[tone])}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {caption ? <div className="mt-2 text-xs leading-5 text-slate-600">{caption}</div> : null}
    </div>
  );
}

export function ReportTable({
  children,
  dense = false,
}: {
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className={cn('w-full text-sm', dense ? 'text-xs' : 'text-sm')}>{children}</table>
    </div>
  );
}

export function ReportAmount({
  value,
  tone = 'default',
  align = 'right',
}: {
  value: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'muted' | 'warning' | 'info';
  align?: 'left' | 'right';
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'text-slate-900',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
    muted: 'text-slate-600',
    warning: 'text-amber-700',
    info: 'text-sky-700',
  };

  return <span className={cn('font-medium tabular-nums', align === 'right' ? 'text-right' : 'text-left', toneClasses[tone])}>{value}</span>;
}

export function ReportStatusBadge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'info';
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'border-slate-200 bg-slate-50 text-slate-700',
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    negative: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide', toneClasses[tone])}>
      {label}
    </span>
  );
}

export function ReportSignatureBlock({
  labels = ['Prepared by', 'Checked by', 'Approved by / Seal'],
}: {
  labels?: string[];
}) {
  return (
    <div className="grid gap-6 pt-6 md:grid-cols-3">
      {labels.map((label) => (
        <div key={label} className="pt-10 text-center">
          <div className="border-t border-slate-300 pt-2 text-sm font-medium text-slate-700">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function ReportPageBreak() {
  return <div className="report-page-break h-0" aria-hidden="true" />;
}

export function ReportNoteBox({
  title = 'Report note',
  children,
  tone = 'default',
}: {
  title?: string;
  children: ReactNode;
  tone?: 'default' | 'warning' | 'info';
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'border-slate-200 bg-slate-50 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <div className={cn('rounded-2xl border px-4 py-4 shadow-sm', toneClasses[tone])}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</div>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </div>
  );
}
