import Link from 'next/link';
import { BarChart3, FileText, Users, AlertCircle } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProjectReportsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const base = `/projects/${project.id}`;

  const reports = [
    {
      title: 'Top Sheet',
      description: 'Total income, expense, and balance summary for this project.',
      href: `${base}/reports/top-sheet`,
      icon: BarChart3,
      available: true,
    },
    {
      title: 'Phase Summary',
      description: 'Per-phase financial breakdown with collection, expense, and balance.',
      href: `${base}/phases`,
      icon: FileText,
      available: true,
    },
    {
      title: 'Buyer Statement',
      description: 'Individual buyer ledger showing demands, payments, and outstanding dues.',
      href: `${base}/buyers`,
      icon: Users,
      available: true,
    },
    {
      title: 'Due Report',
      description: 'All outstanding buyer dues and overdue demands.',
      href: `${base}/due-followup`,
      icon: AlertCircle,
      available: true,
    },
  ];

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-base font-semibold">Reports</h1>
        <p className="text-xs text-muted-foreground">{project.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/40 transition-colors group"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <r.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                {r.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
