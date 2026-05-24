import { ReportPageLayout, ReportSection } from '@/components/reports/report-page-layout';
import { Card, CardContent } from '@/components/ui/card';

export function ReportFoundationPage({
  title,
  subtitle,
  branding,
  project,
  rows,
  csvHref,
}: {
  title: string;
  subtitle: string;
  branding: any;
  project: any;
  rows: { label: string; value: string }[];
  csvHref?: string;
}) {
  return (
    <ReportPageLayout branding={branding} project={project} title={title} subtitle={subtitle} csvHref={csvHref}>
      <ReportSection title="Current Foundation">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Section</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Current Foundation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground print:hidden">
          PDF uses browser Print / Save as PDF. {csvHref ? 'CSV export is available for this report.' : 'CSV and Excel export stay disabled until real endpoints are implemented.'}
        </p>
      </ReportSection>
    </ReportPageLayout>
  );
}
