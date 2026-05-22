import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Building2, Plus, Truck } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectSupplierAssignments, getProjectSubcontractorAssignments } from '@/lib/project-vendor-ledger';
import { formatBDT } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function VendorTable({
  rows,
  detailHref,
  billHref,
  emptyLabel,
}: {
  rows: Array<{
    id: string;
    name: string;
    typeLabel: string;
    metaLabel: string;
    billed: number;
    paid: number;
    due: number;
    documents: number;
  }>;
  detailHref: (id: string) => string;
  billHref: (id: string) => string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Project Terms</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Billed</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Paid</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Due</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Docs</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{row.typeLabel}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{row.metaLabel}</td>
              <td className="px-4 py-3 text-right">{formatBDT(row.billed)}</td>
              <td className="px-4 py-3 text-right text-green-600">{formatBDT(row.paid)}</td>
              <td className="px-4 py-3 text-right text-red-600 font-bold">{formatBDT(row.due)}</td>
              <td className="px-4 py-3 text-center">{row.documents}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2 text-xs">
                  <Link href={detailHref(row.id)} className="text-primary hover:underline">View</Link>
                  <Link href={billHref(row.id)} className="text-primary hover:underline">Bill</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ProjectVendorsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [suppliers, subcontractors] = await Promise.all([
    getProjectSupplierAssignments(project.id, companyId),
    getProjectSubcontractorAssignments(project.id, companyId),
  ]);

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Project Vendors</h1>
          <p className="text-xs text-muted-foreground">{project.name} · assignment contracts, bills, and project-scoped vendor ledgers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/suppliers/new`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Add Supplier
          </Link>
          <Link href={`/projects/${project.id}/subcontractors/new`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Add Subcontractor
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-orange-600" />
          <h2 className="text-sm font-semibold">Suppliers / Material Vendors</h2>
        </div>
        <VendorTable
          rows={suppliers.map((assignment) => ({
            id: assignment.id,
            name: assignment.supplier.name,
            typeLabel: assignment.supplier.supplierType.replaceAll('_', ' '),
            metaLabel: assignment.materialCategory || assignment.paymentTerms || 'Project supplier assignment',
            billed: assignment.summary.totalBilled,
            paid: assignment.summary.totalPaid,
            due: assignment.summary.totalDue,
            documents: assignment.summary.documentCount,
          }))}
          detailHref={(id) => `/projects/${project.id}/suppliers/${id}`}
          billHref={(id) => `/projects/${project.id}/payables/new?projectSupplierId=${id}`}
          emptyLabel="No project suppliers assigned yet."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-semibold">Subcontractors / Service Providers</h2>
        </div>
        <VendorTable
          rows={subcontractors.map((assignment) => ({
            id: assignment.id,
            name: assignment.supplier.name,
            typeLabel: assignment.supplier.supplierType.replaceAll('_', ' '),
            metaLabel: `${assignment.workType.replaceAll('_', ' ')}${assignment.assignedPhase?.name ? ` · ${assignment.assignedPhase.name}` : ''}`,
            billed: assignment.summary.totalBilled,
            paid: assignment.summary.totalPaid,
            due: assignment.summary.totalDue,
            documents: assignment.summary.documentCount,
          }))}
          detailHref={(id) => `/projects/${project.id}/subcontractors/${id}`}
          billHref={(id) => `/projects/${project.id}/subcontractors/bills/new?projectSubcontractorId=${id}`}
          emptyLabel="No project subcontractors assigned yet."
        />
      </div>
    </div>
  );
}
