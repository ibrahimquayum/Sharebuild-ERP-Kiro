import { prisma } from '@/lib/prisma';
import { getProjectReportContext } from '@/lib/project-report-page';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function RetentionReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);

  const payables = await prisma.supplierPayable.findMany({
    where: { projectId: project.id, reversedAt: null, retentionAmount: { gt: 0 } },
    include: { supplier: { select: { name: true } }, phase: { select: { name: true } } },
    orderBy: [{ billDate: 'desc' }],
  });

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end"><ReportActions excelHref={`/api/projects/${project.id}/reports/retention/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Retention Report" subtitle="Held, released, and outstanding retention/security money" />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Bill Date</th><th className="px-3 py-2 text-left">Party</th><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-right">Held</th><th className="px-3 py-2 text-right">Released</th><th className="px-3 py-2 text-right">Outstanding</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Release Date</th></tr></thead>
          <tbody>
            {payables.map((payable) => {
              const outstanding = Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0);
              return (
                <tr key={payable.id} className="border-b">
                  <td className="px-3 py-2">{formatDate(payable.billDate)}</td>
                  <td className="px-3 py-2">{payable.supplier.name}</td>
                  <td className="px-3 py-2">{payable.phase?.name ?? 'Project general'}</td>
                  <td className="px-3 py-2 text-right">{formatBDT(Number(payable.retentionAmount ?? 0))}</td>
                  <td className="px-3 py-2 text-right">{formatBDT(Number(payable.retentionReleasedAmount ?? 0))}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(outstanding)}</td>
                  <td className="px-3 py-2">{payable.retentionStatus.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-2">{formatDate(payable.retentionReleaseDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
