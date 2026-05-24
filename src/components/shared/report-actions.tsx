'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';

export function ReportActions({
  pdfReady = false,
  workbookHref,
  csvHref,
}: {
  pdfReady?: boolean;
  workbookHref?: string;
  csvHref?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
      </Button>
      <Button type="button" variant="outline" size="sm" disabled title={pdfReady ? 'Use Print / Save as PDF for this print-ready report' : 'Server PDF export is documented for a future implementation step'}>
        <Download className="mr-2 h-4 w-4" /> PDF
      </Button>
      {workbookHref ? (
        <Button asChild type="button" variant="outline" size="sm">
          <a href={workbookHref}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel workbook
          </a>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled title="Excel export is documented for the next implementation step">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
        </Button>
      )}
      {csvHref ? (
        <Button asChild type="button" variant="outline" size="sm">
          <a href={csvHref}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </a>
        </Button>
      ) : null}
    </div>
  );
}
