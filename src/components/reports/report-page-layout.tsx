import { ReportActions } from '@/components/shared/report-actions';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportHeader } from '@/components/shared/report-header';

export function ReportPageLayout({
  branding,
  project,
  title,
  subtitle,
  excelHref,
  children,
}: {
  branding: any;
  project?: any;
  title: string;
  subtitle?: string;
  excelHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 space-y-6 print:p-0 print:text-black">
      <div className="flex justify-end">
        <ReportActions pdfReady excelHref={excelHref} />
      </div>
      <ReportHeader branding={branding} project={project} title={title} subtitle={subtitle} />
      {children}
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 print:break-inside-avoid">
      <h3 className="border-b pb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function ReportSignatureBlock() {
  return (
    <section className="grid grid-cols-3 gap-6 pt-10 text-center text-sm">
      <div className="border-t pt-2">Prepared by</div>
      <div className="border-t pt-2">Checked by</div>
      <div className="border-t pt-2">Approved by / Seal</div>
    </section>
  );
}
