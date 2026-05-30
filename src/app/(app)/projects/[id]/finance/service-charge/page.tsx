import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getScopedProject } from '@/lib/access-control';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ServiceChargeFinancePage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'serviceCharge', 'view');
  const ledger = await getProjectServiceChargeLedger(project.id);
  if (!ledger) return null;

  return (
    <div className="space-y-5 p-5">
      <PageHeader
        title="Service Charge Summary"
        subtitle={`${project.name} - included automatically in buyer phase demand and collected through normal buyer payments`}
      />

      <Card className="border-sky-200 bg-sky-50/70">
        <CardContent className="p-4 text-sm leading-6 text-sky-900">
          Service charge is part of phase billable cost. It is included automatically in buyer phase demand at the
          effective rate, buyer payments reduce the demand, and the service-charge portion is reported as company income.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Effective Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.effectiveTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Billed Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.billedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Collected Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.collectedTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Uncollected Service Charge</div><div className="mt-1 text-lg font-bold">{formatBDT(ledger.totals.uncollectedTotal)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phase-wise Service Charge Income Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Phase</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Construction Cost</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Service Charge %</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Effective Service Charge</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Billed</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Collected</th>
                  <th className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">Uncollected</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">Flow</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No phase cost is ready for service charge yet.
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((row) => (
                    <tr key={`${row.phaseId ?? 'project'}-${row.entryId ?? row.phaseName}`} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        <div>{row.phaseName}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{formatBDT(row.basisAmount)}</td>
                      <td className="px-3 py-2 text-right">{Number(row.percentage ?? 0).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">{formatBDT(row.serviceChargeAmount)}</td>
                      <td className="px-3 py-2 text-right">{formatBDT(row.billedAmount)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatBDT(row.collectedAmount)}</td>
                      <td className="px-3 py-2 text-right text-amber-700">{formatBDT(row.uncollectedAmount)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <div>
                          {row.billedAmount > 0
                            ? 'Billed'
                            : row.includedInDemand
                              ? 'Included in demand'
                              : 'Not billed yet'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
