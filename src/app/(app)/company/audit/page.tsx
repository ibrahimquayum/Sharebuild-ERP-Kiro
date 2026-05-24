import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function CompanyAuditPage() {
  const context = await requireCompanyWidePageAccess('audit', 'auditAccess');
  const companyId = context.companyId;
  const logs = await prisma.auditLog.findMany({
    where: { OR: [{ user: { companyId } }, { project: { companyId } }] },
    include: { user: { select: { name: true, email: true } }, project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Audit" />
      <PageHeader title="Audit" subtitle="Latest company and project setup changes." />
      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Date', 'User', 'Project', 'Action', 'Entity'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {logs.map(log => <tr key={log.id} className="border-b last:border-0"><td className="px-4 py-3">{formatDate(log.createdAt)}</td><td className="px-4 py-3">{log.user?.name ?? log.user?.email ?? '-'}</td><td className="px-4 py-3">{log.project?.name ?? '-'}</td><td className="px-4 py-3">{log.action}</td><td className="px-4 py-3">{log.entityType}</td></tr>)}
                {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No audit logs yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
