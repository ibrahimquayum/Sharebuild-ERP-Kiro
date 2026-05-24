import Link from 'next/link';
import { getScopedProject } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { FinalReconciliationActions } from '@/components/projects/final-reconciliation-actions';
import { ReconciliationCreditSettlementActions } from '@/components/projects/reconciliation-credit-settlement-actions';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { balanceColor, formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinalReconciliationPage({ params }: { params: { id: string } }) {
  const { context, project } = await getScopedProject(params.id, 'finalReconciliation', 'view');

  const [preview, accounts] = await Promise.all([
    getFinalReconciliationPreview(project.id),
    prisma.cashBankAccount.findMany({
      where: { companyId: context.companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!preview) return null;

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Final Reconciliation" subtitle={`${project.name} - preview and controlled posting by buyer ownership share`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Demand</div><div className="mt-1 text-lg font-bold">{formatBDT(preview.summary.totalDemanded)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Collection</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(preview.summary.totalCollected)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(preview.summary.serviceChargeAccrued)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Final Result</div><div className={`mt-1 text-lg font-bold ${balanceColor(preview.finalSurplusDeficit)}`}>{formatBDT(preview.finalSurplusDeficit)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Preview Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Direct expense</span><span>{formatBDT(preview.summary.directExpenseTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Supplier bills</span><span>{formatBDT(preview.summary.supplierBillCost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Subcontractor bills</span><span>{formatBDT(preview.summary.subcontractorBillCost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax / deductions</span><span>{formatBDT(preview.summary.taxDeductionTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Retention held</span><span>{formatBDT(preview.summary.retentionHeld)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Buyer due</span><span>{formatBDT(preview.summary.buyerDue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Buyer advance</span><span>{formatBDT(preview.summary.buyerAdvance)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-medium">Recommendation</span><span className="text-right">{preview.recommendation}</span></div>
        </CardContent>
      </Card>

      <FinalReconciliationActions projectId={project.id} postedReconciliationId={preview.posted?.id} />

      {!preview.canPost && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Posting Blockers</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
              {preview.blockingIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Finance Readiness</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {preview.summary.financeReadiness.ready ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">Finance core is ready for reconciliation posting.</p>
          ) : (
            <>
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">Resolve these issues before you consider the project finance-ready:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {preview.summary.financeReadiness.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {preview.posted && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Posted Reconciliation</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{preview.posted.type.replaceAll('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Posted amount</span><span>{formatBDT(Number(preview.posted.finalAmount))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{preview.posted.status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Generated demands</span><span>{preview.posted.demands.length}</span></div>
          </CardContent>
        </Card>
      )}

      {preview.posted?.type === 'SURPLUS_CREDIT' ? (
        <ReconciliationCreditSettlementActions
          projectId={project.id}
          lines={preview.posted.lines.map((line) => ({
            id: line.id,
            buyerName: line.buyer.name,
            unitNo: line.unit?.unitNo ?? '-',
            amount: Number(line.amount),
            settlementStatus: line.settlementStatus,
            settlementReference: line.settlementReference,
          }))}
          accounts={accounts.map((account) => ({ id: account.id, label: `${account.name} (${account.type.replaceAll('_', ' ')})` }))}
        />
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-sm">Buyer Distribution Preview</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Buyer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Units</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Share %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">{preview.direction === 'SURPLUS' ? 'Refund / Adjust' : 'Collect'}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.distribution.map((row) => (
                  <tr key={row.buyerId}>
                    <td className="px-4 py-3 font-medium">{row.buyerName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.units}</td>
                    <td className="px-4 py-3 text-right">{row.sharePercent.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-medium">{formatBDT(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {preview.posted?.lines?.length ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Posted Reconciliation Lines</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Buyer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Share %</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.posted.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-medium">{line.buyer.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{line.unit?.unitNo ?? '-'}</td>
                      <td className="px-4 py-3 text-right">{Number(line.ownershipShare).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-medium">{formatBDT(Number(line.amount))}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {line.settlementStatus.replaceAll('_', ' ')}
                        {line.settlementReference ? <div>{line.settlementReference}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-4 text-xs">
        <Link href={`/projects/${project.id}/reports/final-reconciliation`} className="text-primary hover:underline">Print-ready report</Link>
        <Link href={`/api/projects/${project.id}/reports/final-reconciliation/excel`} className="text-primary hover:underline">Excel-compatible CSV export</Link>
      </div>
    </div>
  );
}
