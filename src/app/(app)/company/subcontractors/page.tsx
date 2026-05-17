import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function SubcontractorsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const subcontractors = await prisma.supplier.findMany({
    where: { companyId, supplierType: { in: ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER', 'CONSULTANT'] } },
    include: { _count: { select: { payables: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Subcontractors" />
      <PageHeader title="Subcontractors" subtitle="Company-level work and service providers. Use type Labour Contractor or Service Provider." action={{ label: 'New Subcontractor', href: '/company/suppliers/new' }} />
      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Name', 'Phone', 'Work Type', 'Address', 'Bills', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {subcontractors.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.phone ?? '-'}</td>
                    <td className="px-4 py-3">{s.supplierType.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">{s.address ?? '-'}</td>
                    <td className="px-4 py-3">{s._count.payables}</td>
                    <td className="px-4 py-3">{s.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/company/suppliers/${s.id}`}>View</Link></td>
                  </tr>
                ))}
                {subcontractors.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>No subcontractors yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
