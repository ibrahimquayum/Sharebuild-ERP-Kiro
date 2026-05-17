import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectAuditPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { projectId: project.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Project Audit</h2>
        <p className="text-xs text-muted-foreground">{project.name} · create, update, approve, upload, and sensitive changes</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">User</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Action</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Entity</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No audit events yet for this project.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.user?.name ?? 'System'}<div className="text-xs text-muted-foreground">{log.user?.email ?? ''}</div></td>
                  <td className="px-4 py-3 font-semibold">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.entityType}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.entityId ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
