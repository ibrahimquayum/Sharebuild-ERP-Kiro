import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChequeSummary } from '@/lib/cash-bank';
import { getProjectReportContext } from '@/lib/project-report-page';
import { ReportHeader } from '@/components/shared/report-header';
import { ReportFooter } from '@/components/shared/report-footer';
import { ReportActions } from '@/components/shared/report-actions';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectChequeRegisterReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const { project, branding } = await getProjectReportContext(params.id);
  const summary = await getChequeSummary(companyId, project.id);

  return (
    <div className="p-5 space-y-5 print:p-0">
      <div className="flex justify-end"><ReportActions excelHref={`/api/projects/${project.id}/reports/cheque-register/excel`} /></div>
      <ReportHeader branding={branding} project={project} title="Cheque Register" subtitle="Issued and received cheque tracking for this project" />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left">Cheque</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Party</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {summary.cheques.map((cheque) => (
              <tr key={cheque.id} className="border-b">
                <td className="px-3 py-2">{cheque.chequeNo}<div className="text-xs text-muted-foreground">{cheque.bankName}</div></td>
                <td className="px-3 py-2">{cheque.chequeType}</td>
                <td className="px-3 py-2">{cheque.partyName ?? cheque.partyType}</td>
                <td className="px-3 py-2">{formatDate(cheque.chequeDate)}</td>
                <td className="px-3 py-2 text-right">{formatBDT(Number(cheque.amount))}</td>
                <td className="px-3 py-2">{cheque.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportFooter note={branding.reportFooterNote} />
    </div>
  );
}
