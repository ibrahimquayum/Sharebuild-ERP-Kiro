import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, FileUp, Pencil, Receipt } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectSubcontractorAssignments } from '@/lib/project-vendor-ledger';

export const dynamic = 'force-dynamic';

export default async function ProjectSubcontractorDetailPage({
  params,
}: {
  params: { id: string; projectSubcontractorId: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const assignments = await getProjectSubcontractorAssignments(project.id, companyId);
  const assignment = assignments.find((item) => item.id === params.projectSubcontractorId);
  if (!assignment) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      projectId: project.id,
      OR: [
        { entityType: 'project_subcontractor', entityId: assignment.id },
        { entityType: 'supplier_payable', entityId: { in: assignment.payables.map((payable) => payable.id) } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const uploadHref = `/projects/${project.id}/documents/upload?projectSubcontractorId=${assignment.id}&projectId=${project.id}&scope=PROJECT&category=${encodeURIComponent('subcontractor agreement')}&returnTo=${encodeURIComponent(`/projects/${project.id}/subcontractors/${assignment.id}`)}`;

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${project.id}/subcontractors`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Project Subcontractors
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">{assignment.supplier.name}</h1>
          <p className="text-xs text-muted-foreground">{project.name} · subcontractor contract and bill ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/subcontractors/bills/new?projectSubcontractorId=${assignment.id}`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Receipt className="h-3.5 w-3.5" /> Add Bill
          </Link>
          <Link href={`/projects/${project.id}/subcontractors/${assignment.id}/edit`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Pencil className="h-3.5 w-3.5" /> Edit Assignment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Contract Terms</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Subcontractor type</span><div className="font-medium">{assignment.supplier.supplierType.replaceAll('_', ' ')}</div></div>
            <div><span className="text-muted-foreground">Work type</span><div className="font-medium">{assignment.workType.replaceAll('_', ' ')}</div></div>
            <div><span className="text-muted-foreground">Contact person</span><div className="font-medium">{assignment.supplier.contactPerson || '-'}</div></div>
            <div><span className="text-muted-foreground">Phone</span><div className="font-medium">{assignment.supplier.phone || '-'}</div></div>
            <div><span className="text-muted-foreground">Assigned phase</span><div className="font-medium">{assignment.assignedPhase?.name || 'Project-wide'}</div></div>
            <div><span className="text-muted-foreground">Status</span><div className="font-medium">{assignment.status}</div></div>
            <div><span className="text-muted-foreground">Contract amount</span><div className="font-medium">{formatBDT(Number(assignment.contractAmount ?? 0))}</div></div>
            <div><span className="text-muted-foreground">Extra work amount</span><div className="font-medium">{formatBDT(Number(assignment.extraWorkAmount ?? 0))}</div></div>
            <div><span className="text-muted-foreground">Payment terms</span><div className="font-medium">{assignment.paymentTerms || '-'}</div></div>
            <div><span className="text-muted-foreground">Contract no</span><div className="font-medium">{assignment.contractNo || '-'}</div></div>
            <div><span className="text-muted-foreground">Contract date</span><div className="font-medium">{formatDate(assignment.contractDate)}</div></div>
            <div><span className="text-muted-foreground">Deadline</span><div className="font-medium">{formatDate(assignment.deadline)}</div></div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Assignment notes</span><div className="font-medium whitespace-pre-wrap">{assignment.notes || '-'}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Documents</CardTitle>
            <Link href={uploadHref} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
              <FileUp className="h-3.5 w-3.5" /> Upload
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assignment.documents.length === 0 ? <p className="text-muted-foreground">No agreement or measurement documents attached.</p> : assignment.documents.map((document) => (
              <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="block rounded-md border p-2 hover:bg-muted/40">
                <div className="font-medium">{document.title || document.fileName}</div>
                <div className="text-xs text-muted-foreground">{document.category || 'other'}</div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Contract + Extra Work</div><div className="mt-1 text-lg font-bold">{formatBDT(Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0))}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Billed</div><div className="mt-1 text-lg font-bold">{formatBDT(assignment.summary.totalBilled)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Paid</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(assignment.summary.totalPaid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Due</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(assignment.summary.totalDue)}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Progress Bills</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2 text-left">Bill</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-right">Paid</th><th className="px-4 py-2 text-right">Due</th></tr></thead>
              <tbody>
                {assignment.payables.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No subcontractor bills yet.</td></tr> : assignment.payables.map((payable) => (
                  <tr key={payable.id} className="border-b">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${project.id}/payables/${payable.id}`} className="font-medium text-primary hover:underline">{payable.billNo || 'Subcontractor bill'}</Link>
                      <div className="text-xs text-muted-foreground">{payable.phase?.name || 'Project general'} · {formatDate(payable.billDate)}</div>
                    </td>
                    <td className="px-4 py-2 text-right">{formatBDT(Number(payable.totalAmount))}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatBDT(payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatBDT(Number(payable.dueAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Phase Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40"><th className="px-4 py-2 text-left">Phase</th><th className="px-4 py-2 text-right">Billed</th><th className="px-4 py-2 text-right">Paid</th><th className="px-4 py-2 text-right">Due</th></tr></thead>
              <tbody>
                {assignment.summary.phaseBreakdown.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No phase-linked bills yet.</td></tr> : assignment.summary.phaseBreakdown.map((row) => (
                  <tr key={row.phaseId} className="border-b">
                    <td className="px-4 py-2 font-medium">{row.phaseName}</td>
                    <td className="px-4 py-2 text-right">{formatBDT(row.billed)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatBDT(row.paid)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatBDT(row.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Audit History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {auditLogs.length === 0 ? <p className="text-muted-foreground">No audit entries yet.</p> : auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="font-medium">{entry.action} · {entry.entityType}</div>
              <div className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
