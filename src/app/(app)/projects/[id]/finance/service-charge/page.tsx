import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ServiceChargeActions } from '@/components/projects/service-charge-actions';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ServiceChargeFinancePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const ledger = await getProjectServiceChargeLedger(project.id);
  if (!ledger) notFound();

  return (
    <div className="p-5 space-y-5">
      <PageHeader title="Service Charge" subtitle={`${project.name} - company income ledger separated from project cost`} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Approved</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.approvedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Calculated</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.calculatedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Preview Basis</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.previewTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending Rows</div><div className="mt-1 text-lg font-bold">{ledger.totals.pendingCount}</div></CardContent></Card>
      </div>

      <ServiceChargeActions projectId={project.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phase-wise Service Charge Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Phase</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Basis</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">%</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Demand</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No phase cost is ready for service charge yet.</td></tr>
                ) : ledger.rows.map((row) => (
                  <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b">
                    <td className="px-3 py-2 font-medium">{row.phaseName}</td>
                    <td className="px-3 py-2 text-right">{formatBDT(row.basisAmount)}</td>
                    <td className="px-3 py-2 text-right">{row.percentage?.toFixed?.(2) ?? row.percentage ?? 0}%</td>
                    <td className="px-3 py-2 text-right">{formatBDT(row.serviceChargeAmount)}</td>
                    <td className="px-3 py-2">{row.status.replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2">{row.includedInDemand ? 'Included' : 'Separate income'}</td>
                    <td className="px-3 py-2 text-right">{row.entryId && row.status !== 'PREVIEW' ? <ServiceChargeActions projectId={project.id} entryId={row.entryId} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-xs">
        <a href={`/projects/${project.id}/reports/service-charge`} className="text-primary hover:underline">Print-ready report</a>
        <a href={`/api/projects/${project.id}/reports/service-charge/excel`} className="text-primary hover:underline">Excel-compatible CSV export</a>
      </div>
    </div>
  );
}
