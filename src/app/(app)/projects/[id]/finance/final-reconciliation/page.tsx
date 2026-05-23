import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { balanceColor, formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FinalReconciliationPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const preview = await getFinalReconciliationPreview(project.id);
  if (!preview) notFound();

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Final Reconciliation" subtitle={`${project.name} - preview final surplus/deficit by buyer ownership share`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Demand</div><div className="mt-1 text-lg font-bold">{formatBDT(preview.summary.totalDemanded)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Collection</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(preview.summary.totalCollected)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Service Charge (info)</div><div className="mt-1 text-lg font-bold">{formatBDT(preview.summary.serviceChargeAccrued)}</div></CardContent></Card>
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
          <div className="flex justify-between border-t pt-2"><span className="font-medium">Recommendation</span><span className="text-right">{preview.recommendation}</span></div>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This page currently posts a preview only. Final reconciliation demand posting remains a guarded next step so we do not create irreversible buyer allocations without review.
          </p>
        </CardContent>
      </Card>

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

      <div className="flex gap-4 text-xs">
        <Link href={`/projects/${project.id}/reports/final-reconciliation`} className="text-primary hover:underline">Print-ready report</Link>
        <Link href={`/api/projects/${project.id}/reports/final-reconciliation/excel`} className="text-primary hover:underline">Excel-compatible CSV export</Link>
      </div>
    </div>
  );
}
