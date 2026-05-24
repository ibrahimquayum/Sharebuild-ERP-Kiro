import {
  ReportDocumentLayout,
  ReportSection,
  ReportSignatureBlock,
} from '@/components/reports/report-document';

export function ReportPageLayout({
  branding,
  project,
  title,
  subtitle,
  backHref,
  workbookHref,
  csvHref,
  children,
}: {
  branding: any;
  project?: any;
  title: string;
  subtitle?: string;
  backHref?: string;
  workbookHref?: string;
  csvHref?: string;
  children: React.ReactNode;
}) {
  return (
    <ReportDocumentLayout
      branding={branding}
      project={project}
      title={title}
      subtitle={subtitle}
      generatedAt={new Date()}
      backHref={backHref}
      workbookHref={workbookHref}
      csvHref={csvHref}
    >
      {children}
    </ReportDocumentLayout>
  );
}
export { ReportSection, ReportSignatureBlock };
