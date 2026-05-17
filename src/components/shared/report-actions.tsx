'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';

export function ReportActions({ exportReady = false }: { exportReady?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" /> Print
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!exportReady} title={exportReady ? 'Export PDF' : 'PDF export is documented for the next implementation step'}>
        <Download className="mr-2 h-4 w-4" /> PDF
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!exportReady} title={exportReady ? 'Export Excel' : 'Excel export is documented for the next implementation step'}>
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
      </Button>
    </div>
  );
}
