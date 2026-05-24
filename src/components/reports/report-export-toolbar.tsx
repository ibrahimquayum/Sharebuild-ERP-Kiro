'use client';

import Link from 'next/link';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ReportExportToolbar({
  backHref,
  backLabel = 'Back to Reports',
  workbookHref,
  csvHref,
  pdfLabel = 'Browser print / Save as PDF',
}: {
  backHref?: string;
  backLabel?: string;
  workbookHref?: string;
  csvHref?: string;
  pdfLabel?: string;
}) {
  return (
    <div
      data-report-toolbar="true"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden"
    >
      <div className="flex flex-wrap items-center gap-2">
        {backHref ? (
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Save as PDF
        </Button>
        {workbookHref ? (
          <Button asChild type="button" variant="outline" size="sm">
            <a href={workbookHref}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel Workbook
            </a>
          </Button>
        ) : null}
        {csvHref ? (
          <Button asChild type="button" variant="outline" size="sm">
            <a href={csvHref}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        ) : null}
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
          {pdfLabel}
        </div>
      </div>
    </div>
  );
}
