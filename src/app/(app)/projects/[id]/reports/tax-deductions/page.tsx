import { prisma } from '@/lib/prisma';
import { getProjectReportContext } from '@/lib/project-report-page';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TaxDeductionReportPage({ params }: { params: { id: string } }) {
  const { project, branding } = await getProjectReportContext(params.id);

  const payables = await prisma.supplierPayable.findMany({
    where: {
      projectId: project.id,
      reversedAt: null,
      OR: [
        { vatAmount: { gt: 0 } },
        { aitTdsAmount: { gt: 0 } },
        { otherDeductionAmount: { gt: 0 } },
      ],
    },
    include: { supplier: { select: { name: true, supplierType: true } }, phase: { select: { name: true } } },
    orderBy: [{ billDate: 'desc' }],
  });

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end"><ReportActions csvHref={`/api/projects/${project.id}/reports/tax-deductions/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Tax / Deduction Report" subtitle="Gross bill, tax deduction, and current payable position by bill" />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Bill Date</th><th className="px-3 py-2 text-left">Party</th><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">VAT</th><th className="px-3 py-2 text-right">AIT/TDS</th><th className="px-3 py-2 text-right">Other</th><th className="px-3 py-2 text-right">Net Payable</th></tr></thead>
          <tbody>
            {payables.map((payable) => (
              <tr key={payable.id} className="border-b">
                <td className="px-3 py-2">{formatDate(payable.billDate)}</td>
                <td className="px-3 py-2">{payable.supplier.name}</td>
                <td className="px-3 py-2">{payable.phase?.name ?? 'Project general'}</td>
                <td className="px-3 py-2 text-right">{formatBDT(Number(payable.totalAmount))}</td>
                <td className="px-3 py-2 text-right">{formatBDT(Number(payable.vatAmount ?? 0))}</td>
                <td className="px-3 py-2 text-right">{formatBDT(Number(payable.aitTdsAmount ?? 0))}</td>
                <td className="px-3 py-2 text-right">{formatBDT(Number(payable.otherDeductionAmount ?? 0))}</td>
                <td className="px-3 py-2 text-right font-medium">{formatBDT(Number(payable.netPayableAmount ?? payable.totalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
