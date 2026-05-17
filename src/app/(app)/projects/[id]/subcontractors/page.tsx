import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatBDT, cn } from '@/lib/utils';
import { Building2, Construction, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectSubcontractorsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;

  // Subcontractors linked to this project via SupplierPayable
  const payables = await prisma.supplierPayable.findMany({
    where: {
      projectId: project.id,
      supplier: { supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] } },
    },
    include: {
      supplier: { select: { id: true, name: true, supplierType: true, phone: true, contactPerson: true } },
      phase: { select: { id: true, name: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  const typeLabel: Record<string, string> = {
    LABOUR_CONTRACTOR: 'Labour Contractor',
    SERVICE_PROVIDER:  'Service Provider',
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Subcontractors</h1>
          <p className="text-xs text-muted-foreground">
            {project.name} · Labour contractors &amp; service providers
          </p>
        </div>
        <Link
          href={`${base}/subcontractors/bills/new`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Bill
        </Link>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-3 text-xs border-b pb-3">
        <Link href={`${base}/vendors`}              className="text-muted-foreground hover:text-foreground transition-colors">Vendors Overview</Link>
        <Link href={`${base}/subcontractors`}       className="font-semibold text-foreground border-b-2 border-primary pb-3 -mb-3">Subcontractors</Link>
        <Link href={`${base}/subcontractors/bills`} className="text-muted-foreground hover:text-foreground transition-colors">Subcontractor Bills</Link>
      </div>

      {payables.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium mb-1">No subcontractors yet</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Subcontractors provide work and services: piling, civil construction, plumbing,
            electrical, tiles, grill/window, painting, lift, and labour contracts.
          </p>
          <Link
            href={`${base}/subcontractors/bills/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Record First Bill
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Subcontractor</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Phase</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Bill Amount</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Paid</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payables.map((p, i) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.supplier.name}</p>
                    {p.supplier.contactPerson && (
                      <p className="text-xs text-muted-foreground">{p.supplier.contactPerson}</p>
                    )}
                    {p.supplier.phone && (
                      <p className="text-xs text-muted-foreground">{p.supplier.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {typeLabel[p.supplier.supplierType] ?? p.supplier.supplierType}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.phase?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">
                    {formatBDT(Number(p.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-green-600 tabular-nums">
                    {formatBDT(Number(p.paidAmount))}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right text-xs font-bold tabular-nums',
                    Number(p.dueAmount) > 0 ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    {formatBDT(Number(p.dueAmount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coming next notice */}
      <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50 p-4 text-xs text-purple-700 space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <Construction className="h-3.5 w-3.5" /> Coming Next: Full Subcontractor Module
        </p>
        <p>Planned fields per subcontractor contract:</p>
        <ul className="list-disc list-inside space-y-0.5 text-purple-600 ml-2">
          <li>Subcontractor name &amp; work type</li>
          <li>Phase &amp; contract amount</li>
          <li>Bill amount, paid, and due</li>
          <li>Measurement sheet upload</li>
          <li>Agreement file upload</li>
        </ul>
      </div>
    </div>
  );
}
