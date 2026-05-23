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
      <div className="flex justify-end"><ReportActions excelHref={`/api/projects/${project.id}/reports/final-reconciliation/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Final Reconciliation Preview" subtitle="Ownership-based preview before any buyer-side posting" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Project Balance</div><div className={`mt-1 font-bold ${balanceColor(preview.summary.projectBalance)}`}>{formatBDT(preview.summary.projectBalance)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Service Charge (info)</div><div className="mt-1 font-bold">{formatBDT(preview.summary.serviceChargeAccrued)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Retention Held</div><div className="mt-1 font-bold">{formatBDT(preview.summary.retentionHeld)}</div></div>
        <div className="rounded-md border p-3 text-sm"><div className="text-xs text-muted-foreground">Final Result</div><div className={`mt-1 font-bold ${balanceColor(preview.finalSurplusDeficit)}`}>{formatBDT(preview.finalSurplusDeficit)}</div></div>
      </div>
      <div className="rounded-md border p-3 text-xs text-amber-800 bg-amber-50">
        Preview only. Final reconciliation posting is intentionally held for a guarded follow-up step so buyer allocations are reviewed before demand records are created.
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
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
