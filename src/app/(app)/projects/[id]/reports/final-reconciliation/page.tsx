import { getProjectReportContext } from '@/lib/project-report-page';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { balanceColor, formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinalReconciliationReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);
  const preview = await getFinalReconciliationPreview(project.id);
  if (!preview) return null;

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end"><ReportActions csvHref={`/api/projects/${project.id}/reports/final-reconciliation/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Final Reconciliation Report" subtitle="Ownership-based preview and posted reconciliation status" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Project Balance</div><div className={`mt-1 font-bold ${balanceColor(preview.summary.projectBalance)}`}>{formatBDT(preview.summary.projectBalance)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Service Charge</div><div className="mt-1 font-bold">{formatBDT(preview.summary.serviceChargeAccrued)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Retention Held</div><div className="mt-1 font-bold">{formatBDT(preview.summary.retentionHeld)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Final Result</div><div className={`mt-1 font-bold ${balanceColor(preview.finalSurplusDeficit)}`}>{formatBDT(preview.finalSurplusDeficit)}</div></div>
      </div>
      <div className={`rounded-md border p-3 text-xs ${preview.posted ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        {preview.posted
          ? `Posted reconciliation: ${preview.posted.type.replaceAll('_', ' ')} for ${formatBDT(Number(preview.posted.finalAmount))}. Generated demand rows: ${preview.posted.demands.length}.`
          : 'Preview only. Post final reconciliation from the finance page after management review.'}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Buyer</th><th className="px-3 py-2 text-left">Units</th><th className="px-3 py-2 text-right">Share %</th><th className="px-3 py-2 text-right">{preview.direction === 'SURPLUS' ? 'Refund / Adjust' : 'Collect'}</th></tr></thead>
          <tbody>
            {preview.distribution.map((row) => (
              <tr key={row.buyerId} className="border-b">
                <td className="px-3 py-2">{row.buyerName}</td>
                <td className="px-3 py-2">{row.units}</td>
                <td className="px-3 py-2 text-right">{row.sharePercent.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right font-medium">{formatBDT(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.posted?.lines?.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left">Buyer</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Settlement</th>
              </tr>
            </thead>
            <tbody>
              {preview.posted.lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="px-3 py-2">{line.buyer.name}</td>
                  <td className="px-3 py-2">{line.unit?.unitNo ?? '-'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(Number(line.amount))}</td>
                  <td className="px-3 py-2">{line.settlementStatus.replaceAll('_', ' ')}{line.settlementReference ? ` - ${line.settlementReference}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
