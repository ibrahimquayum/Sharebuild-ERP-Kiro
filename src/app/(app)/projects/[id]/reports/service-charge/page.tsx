import { getProjectReportContext } from '@/lib/project-report-page';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { ReportActions } from '@/components/shared/report-actions';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportHeader } from '@/components/shared/report-header';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ServiceChargeReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  const ledger = await getProjectServiceChargeLedger(project.id);

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end">
        <ReportActions excelHref={`/api/projects/${project.id}/reports/service-charge/excel`} />
      </div>
      <ReportHeader
        branding={branding}
        project={project}
        title="Service Charge Income Report"
        subtitle="Company income ledger kept separate from project material and labour cost"
      />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Approved</div><div className="mt-1 font-bold">{formatBDT(ledger?.totals.approvedTotal ?? 0)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Calculated</div><div className="mt-1 font-bold">{formatBDT(ledger?.totals.calculatedTotal ?? 0)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Preview</div><div className="mt-1 font-bold">{formatBDT(ledger?.totals.previewTotal ?? 0)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Effective Total</div><div className="mt-1 font-bold">{formatBDT(ledger?.totals.effectiveTotal ?? 0)}</div></div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-right">Basis Amount</th>
              <th className="px-3 py-2 text-right">Percent</th>
              <th className="px-3 py-2 text-right">Charge</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Included In Demand</th>
            </tr>
          </thead>
          <tbody>
            {ledger?.rows.map((row) => (
              <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b">
                <td className="px-3 py-2">{row.phaseName}</td>
                <td className="px-3 py-2 text-right">{formatBDT(row.basisAmount)}</td>
                <td className="px-3 py-2 text-right">{row.percentage?.toFixed?.(2) ?? row.percentage ?? 0}%</td>
                <td className="px-3 py-2 text-right font-medium">{formatBDT(row.serviceChargeAmount)}</td>
                <td className="px-3 py-2">{row.status.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2">{row.includedInDemand ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
