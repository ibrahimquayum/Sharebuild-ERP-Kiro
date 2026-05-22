import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Building2, FileText, Plus, Receipt } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectSubcontractorAssignments } from '@/lib/project-vendor-ledger';
import { formatBDT } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectSubcontractorsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const assignments = await getProjectSubcontractorAssignments(project.id, companyId);
  const totals = assignments.reduce(
    (acc, assignment) => {
      acc.contractAmount += Number(assignment.contractAmount ?? 0);
      acc.extraWorkAmount += Number(assignment.extraWorkAmount ?? 0);
      acc.billed += assignment.summary.totalBilled;
      acc.paid += assignment.summary.totalPaid;
      acc.due += assignment.summary.totalDue;
      acc.missingAgreement += assignment.summary.missingAgreement ? 1 : 0;
      acc.missingMeasurement += assignment.summary.missingMeasurement ? 1 : 0;
      return acc;
    },
    { contractAmount: 0, extraWorkAmount: 0, billed: 0, paid: 0, due: 0, missingAgreement: 0, missingMeasurement: 0 },
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Project Subcontractors</h1>
          <p className="text-xs text-muted-foreground">{project.name} · service-provider contracts, bills, and due ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/subcontractors/bills/new`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Receipt className="h-3.5 w-3.5" /> Add Bill
          </Link>
          <Link href={`/projects/${project.id}/subcontractors/new`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Assign Subcontractor
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Assigned Subcontractors</div><div className="mt-1 text-lg font-bold">{assignments.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Contract Amount</div><div className="mt-1 text-lg font-bold">{formatBDT(totals.contractAmount)}</div><div className="mt-1 text-xs text-muted-foreground">Extra work {formatBDT(totals.extraWorkAmount)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Billed / Paid</div><div className="mt-1 text-lg font-bold">{formatBDT(totals.billed)}</div><div className="mt-1 text-xs text-green-600">Paid {formatBDT(totals.paid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Due</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(totals.due)}</div><div className="mt-1 text-xs text-amber-600">{totals.missingAgreement} missing agreement · {totals.missingMeasurement} missing measurement</div></CardContent></Card>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No subcontractors assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Assign a piling, civil, plumbing, tiles, painting, or other service provider with project-specific contract terms and documents.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/projects/${project.id}/subcontractors/new`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Assign First Subcontractor
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Subcontractor</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Work Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Assigned Phase</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Contract</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Billed</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Due</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Docs</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{assignment.supplier.name}</div>
                    {assignment.supplier.phone && <div className="text-xs text-muted-foreground">{assignment.supplier.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{assignment.workType.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{assignment.assignedPhase?.name || 'Project-wide'}</td>
                  <td className="px-4 py-3 text-right">{formatBDT(Number(assignment.contractAmount ?? 0) + Number(assignment.extraWorkAmount ?? 0))}</td>
                  <td className="px-4 py-3 text-right">{formatBDT(assignment.summary.totalBilled)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatBDT(assignment.summary.totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-bold">{formatBDT(assignment.summary.totalDue)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                      <FileText className="h-3 w-3" /> {assignment.summary.documentCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{assignment.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <Link href={`/projects/${project.id}/subcontractors/${assignment.id}`} className="text-primary hover:underline">View</Link>
                      <Link href={`/projects/${project.id}/subcontractors/bills/new?projectSubcontractorId=${assignment.id}`} className="text-primary hover:underline">Bill</Link>
                      <Link href={`/projects/${project.id}/reports/subcontractor-ledger?projectSubcontractorId=${assignment.id}`} className="text-primary hover:underline">Ledger</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
