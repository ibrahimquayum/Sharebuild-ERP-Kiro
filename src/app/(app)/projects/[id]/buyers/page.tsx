import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FileText, Plus, Receipt, Users } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { OwnershipForm } from '@/components/projects/ownership-form';

export const dynamic = 'force-dynamic';

export default async function ProjectBuyersPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [projectBuyers, allBuyers, units] = await Promise.all([
    prisma.projectBuyer.findMany({
      where: { projectId: project.id },
      include: {
        buyer: {
          include: {
            collections: { where: { phase: { projectId: project.id }, status: { not: 'REVERSED' } }, select: { amount: true } },
            demands: {
              where: { unit: { projectId: project.id } },
              include: {
                collections: { where: { status: { not: 'REVERSED' } }, select: { amount: true } },
                allocations: { where: { collection: { status: { not: 'REVERSED' } } }, select: { amount: true } },
              },
            },
            unitAllocations: {
              where: { unit: { projectId: project.id } },
              include: { unit: { select: { id: true, unitNo: true, floor: true, unitType: true } } },
            },
            documents: { where: { projectId: project.id }, select: { id: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.buyer.findMany({ where: { companyId }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true } }),
    prisma.unit.findMany({ where: { projectId: project.id }, orderBy: [{ floor: 'asc' }, { unitNo: 'asc' }], select: { id: true, unitNo: true, floor: true, status: true } }),
  ]);

  const rows = projectBuyers.map(({ id, buyer }) => {
    const totalDemand = buyer.demands.reduce((sum, demand) => sum + Number(demand.amount), 0);
    const totalPaid = buyer.collections.reduce((sum, collection) => sum + Number(collection.amount), 0);
    return { membershipId: id, buyer, totalDemand, totalPaid, due: totalDemand - totalPaid };
  });

  const totalDemand = rows.reduce((sum, row) => sum + row.totalDemand, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.totalPaid, 0);
  const withUnits = rows.filter((row) => row.buyer.unitAllocations.length > 0).length;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Buyers & Ownership</h2>
          <p className="text-xs text-muted-foreground">{project.name} · project-scoped ownership, payer, and balance view</p>
        </div>
        <Link href="/company/contacts/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted">
          <Plus className="h-3.5 w-3.5" /> New Contact
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Project Buyers" value={String(rows.length)} subtitle="Contacts linked here" icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="With Units" value={String(withUnits)} subtitle="Ownership rows" icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Demand" value={formatBDT(totalDemand)} subtitle="This project only" icon={FileText} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Total Paid" value={formatBDT(totalPaid)} subtitle="Collections in project" icon={Receipt} iconColor="text-green-600" iconBg="bg-green-50" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Assign Contact to Unit</CardTitle>
        </CardHeader>
        <CardContent>
          <OwnershipForm
            projectId={project.id}
            buyers={allBuyers.map((buyer) => ({ id: buyer.id, label: `${buyer.name}${buyer.phone ? ` · ${buyer.phone}` : ''}` }))}
            units={units.map((unit) => ({ id: unit.id, label: `Unit ${unit.unitNo}${unit.floor != null ? ` · Floor ${unit.floor}` : ''}` }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Buyer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Unit(s)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Demand</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Paid</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">Due / Advance</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Docs</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No buyers assigned to this project yet.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.membershipId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}/buyers/${row.membershipId}`} className="font-semibold hover:text-primary hover:underline">{row.buyer.name}</Link>
                      <div className="text-xs text-muted-foreground">{row.buyer.phone ?? 'No phone'}{row.buyer.nidNo ? ` · NID ${row.buyer.nidNo}` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.buyer.unitAllocations.length === 0 ? <span className="text-xs text-muted-foreground">No unit</span> : (
                        <div className="space-y-0.5">
                          {row.buyer.unitAllocations.map((allocation) => (
                            <div key={allocation.id} className="text-xs">
                              Unit {allocation.unit.unitNo} · {Number(allocation.sharePercent)}% · {allocation.relationship?.replaceAll('_', ' ').toLowerCase()}
                              {!allocation.isPayer && <span className="text-muted-foreground"> · payer differs</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatBDT(row.totalDemand)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatBDT(row.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatBDT(row.due)}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{row.buyer.documents.length}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2 text-xs">
                        <Link href={`/projects/${project.id}/buyers/${row.membershipId}`} className="text-primary hover:underline">Ledger</Link>
                        <Link href={`/projects/${project.id}/documents/upload?buyerId=${row.buyer.id}`} className="text-primary hover:underline">Upload</Link>
                        <Link href={`/projects/${project.id}/collections/new`} className="text-primary hover:underline">Pay</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
