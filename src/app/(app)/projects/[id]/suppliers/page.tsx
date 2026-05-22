import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowRight, FileText, Plus, Receipt, Truck } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectSupplierAssignments } from '@/lib/project-vendor-ledger';
import { formatBDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectSuppliersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const assignments = await getProjectSupplierAssignments(project.id, companyId);
  const totals = assignments.reduce(
    (acc, assignment) => {
      acc.billed += assignment.summary.totalBilled;
      acc.paid += assignment.summary.totalPaid;
      acc.payable += assignment.summary.totalDue;
      acc.missingInvoiceCount += assignment.summary.missingInvoiceCount;
      return acc;
    },
    { billed: 0, paid: 0, payable: 0, missingInvoiceCount: 0 },
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Project Suppliers</h1>
          <p className="text-xs text-muted-foreground">{project.name} · project-assigned material vendors and supplier contracts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/payables/new`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Receipt className="h-3.5 w-3.5" /> Add Supplier Bill
          </Link>
          <Link href={`/projects/${project.id}/suppliers/new`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Assign Supplier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Assigned Suppliers</div><div className="mt-1 text-lg font-bold">{assignments.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Billed</div><div className="mt-1 text-lg font-bold">{formatBDT(totals.billed)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Paid</div><div className="mt-1 text-lg font-bold text-green-600">{formatBDT(totals.paid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Project Payable</div><div className="mt-1 text-lg font-bold text-red-600">{formatBDT(totals.payable)}</div><div className="mt-1 text-xs text-amber-600">{totals.missingInvoiceCount} bill(s) missing invoice</div></CardContent></Card>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Truck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No project suppliers assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Assign company suppliers to this project with project-specific terms, opening balance, contracts, and rate sheets.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/projects/${project.id}/suppliers/new`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Assign First Supplier
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Supplier</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Terms</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Billed</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Paid</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Payable</th>
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
                  <td className="px-4 py-3 text-xs text-muted-foreground">{assignment.materialCategory || 'General supplier'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{assignment.paymentTerms || 'Terms not set'}</div>
                    <div>{assignment.creditDays != null ? `${assignment.creditDays} credit day(s)` : 'Credit days not set'}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatBDT(assignment.summary.totalBilled)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{formatBDT(assignment.summary.totalPaid)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatBDT(assignment.summary.totalDue)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                      <FileText className="h-3 w-3" /> {assignment.summary.documentCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{assignment.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <Link href={`/projects/${project.id}/suppliers/${assignment.id}`} className="text-primary hover:underline">View</Link>
                      <Link href={`/projects/${project.id}/payables/new?projectSupplierId=${assignment.id}`} className="text-primary hover:underline">Bill</Link>
                      <Link href={`/projects/${project.id}/reports/supplier-ledger?projectSupplierId=${assignment.id}`} className="text-primary hover:underline">Ledger</Link>
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
