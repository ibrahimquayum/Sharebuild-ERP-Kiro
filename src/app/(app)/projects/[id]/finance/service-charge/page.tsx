import { getScopedProject } from '@/lib/access-control';
import { ServiceChargeActions } from '@/components/projects/service-charge-actions';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ServiceChargeFinancePage({ params }: { params: { id: string } }) {
  const { context, project } = await getScopedProject(params.id, 'serviceCharge', 'view');

  const [ledger, accounts] = await Promise.all([
    getProjectServiceChargeLedger(project.id),
    prisma.cashBankAccount.findMany({
      where: { companyId: context.companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!ledger) return null;

  const settlementEntries = ledger.rows
    .filter((row) => row.status === 'APPROVED' && !row.includedInDemand && row.settlementStatus !== 'SETTLED' && row.entryId)
    .map((row) => ({
      entryId: row.entryId!,
      phaseName: row.phaseName,
      amount: row.serviceChargeAmount,
      settlementStatus: row.settlementStatus,
    }));

  return (
    <div className="p-5 space-y-5">
      <PageHeader title="Service Charge" subtitle={`${project.name} - company income ledger separated from project cost`} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Approved</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.approvedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Calculated</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.calculatedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Included In Demand</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.includedInDemandTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Settled Separately</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.settledTotal)}</div></CardContent></Card>
      </div>

      <ServiceChargeActions
        projectId={project.id}
        accounts={accounts.map((account) => ({ id: account.id, label: `${account.name} (${account.type.replaceAll('_', ' ')})` }))}
        settlementEntries={settlementEntries}
      />

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
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Settlement</th>
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.settlementStatus.replaceAll('_', ' ')}
                      {row.settlementReference ? <div>{row.settlementReference}</div> : null}
                    </td>
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
