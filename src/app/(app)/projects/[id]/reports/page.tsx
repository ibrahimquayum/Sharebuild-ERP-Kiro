import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BarChart3, FileText } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const reports = [
  { title: 'Complete Project Report', href: 'complete-project', status: 'Ready' },
  { title: 'Top Sheet', href: 'top-sheet', status: 'Ready' },
  { title: 'Buyer Statement', href: 'buyer-statement', status: 'Foundation' },
  { title: 'Unit Statement', href: 'unit-statement', status: 'Foundation' },
  { title: 'Phase Summary', href: 'phase-summary', status: 'Foundation' },
  { title: 'Collection Report', href: 'collection-report', status: 'Foundation' },
  { title: 'Expense Report', href: 'expense-report', status: 'Foundation' },
  { title: 'Supplier Ledger', href: 'supplier-ledger', status: 'Foundation' },
  { title: 'Subcontractor Ledger', href: 'subcontractor-ledger', status: 'Foundation' },
  { title: 'Due Report', href: 'due-report', status: 'Foundation' },
  { title: 'Audit Report', href: 'audit-report', status: 'Foundation' },
];

export default async function ProjectReportsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Reports</h2>
        <p className="text-xs text-muted-foreground">{project.name} · branded print-ready project reports</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {reports.map((report) => (
          <Card key={report.href}>
            <CardContent className="p-4">
              <Link href={`/projects/${project.id}/reports/${report.href}`} className="flex items-start gap-3 hover:text-primary">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {report.status === 'Ready' ? <BarChart3 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-semibold">{report.title}</div>
                  <div className="text-xs text-muted-foreground">{report.status === 'Ready' ? 'Live report with export' : 'Print-ready foundation, export coming next'}</div>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
