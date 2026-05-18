import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Building2, Plus, Users } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { BulkUnitForm } from '@/components/projects/bulk-unit-form';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  BOOKED: 'bg-yellow-100 text-yellow-700',
  SOLD: 'bg-blue-100 text-blue-700',
  REGISTERED: 'bg-violet-100 text-violet-700',
  HANDED_OVER: 'bg-emerald-100 text-emerald-700',
  DISPUTED: 'bg-red-100 text-red-600',
};

export default async function ProjectUnitsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true, totalPlannedUnits: true, residentialFloors: true, unitsPerFloor: true },
  });
  if (!project) notFound();

  const units = await prisma.unit.findMany({
    where: { projectId: project.id },
    include: {
      buyerAllocations: {
        include: { buyer: { select: { id: true, name: true } } },
      },
      _count: { select: { documents: true, demands: true } },
    },
    orderBy: [{ floor: 'asc' }, { unitNo: 'asc' }],
  });

  const allocated = units.filter((unit) => unit.buyerAllocations.length > 0).length;
  const available = units.filter((unit) => unit.status === 'AVAILABLE').length;
  const saleValue = units.reduce((sum, unit) => sum + Number(unit.agreedPrice ?? 0), 0);

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Units</h2>
          <p className="text-xs text-muted-foreground">{project.name} · apartment, parking, shop, common, and utility plan</p>
        </div>
        <Link href={`/projects/${project.id}/units/new`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New Unit
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Created Units" value={String(units.length)} subtitle={`${project.totalPlannedUnits ?? 0} planned`} icon={Building2} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Available" value={String(available)} subtitle="Ready to assign" icon={Building2} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="With Buyers" value={String(allocated)} subtitle="Has owner/payer rows" icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="Sale Value" value={formatBDT(saleValue)} subtitle="From agreed price" icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bulk Unit Generation</CardTitle>
          <CardDescription>Generate apartment, parking, shop, common, or utility units from the project plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkUnitForm projectId={project.id} defaultFloors={project.residentialFloors} defaultUnitsPerFloor={project.unitsPerFloor} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Floor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Owners / Payers</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Docs</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No units yet. <Link href={`/projects/${project.id}/units/new`} className="text-primary hover:underline">Create the first unit</Link>.</td></tr>
                ) : units.map((unit) => (
                  <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}/units/${unit.id}`} className="font-semibold hover:text-primary hover:underline">{unit.unitNo}</Link>
                      {unit.sizesqft && <div className="text-xs text-muted-foreground">{Number(unit.sizesqft).toLocaleString()} sqft</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{unit.floor ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{unit.unitType.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {unit.buyerAllocations.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Not assigned</span>
                      ) : (
                        <div className="space-y-0.5">
                          {unit.buyerAllocations.map((allocation) => (
                            <div key={allocation.id} className="text-xs">
                              {allocation.buyer.name} · {Number(allocation.sharePercent)}% {allocation.relationship?.replaceAll('_', ' ').toLowerCase()}
                              {!allocation.isPayer && <span className="text-muted-foreground"> · payer differs</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[unit.status] ?? 'bg-gray-100 text-gray-600')}>
                        {unit.status.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{unit._count.documents}</td>
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
