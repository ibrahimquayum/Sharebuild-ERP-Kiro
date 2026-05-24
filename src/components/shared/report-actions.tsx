'use client';

import { ReportExportToolbar } from '@/components/reports/report-export-toolbar';

export function ReportActions({
  workbookHref,
  csvHref,
  backHref,
}: {
  pdfReady?: boolean;
  workbookHref?: string;
  csvHref?: string;
  backHref?: string;
}) {
  return <ReportExportToolbar backHref={backHref} workbookHref={workbookHref} csvHref={csvHref} />;
}
