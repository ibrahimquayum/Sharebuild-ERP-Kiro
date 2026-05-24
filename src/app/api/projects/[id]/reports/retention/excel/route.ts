import { NextResponse } from 'next/server';
import { csvResponse, csvRows } from '@/lib/csv';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const project = await prisma.project.findFirst({ where: { id: params.id, companyId: access.context.companyId }, select: { id: true, code: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const payables = await prisma.supplierPayable.findMany({
    where: { projectId: project.id, reversedAt: null, retentionAmount: { gt: 0 } },
    include: { supplier: { select: { name: true } }, phase: { select: { name: true } } },
    orderBy: [{ billDate: 'desc' }],
  });

  const rows = [
    ['Bill Date', 'Party', 'Phase', 'Retention Type', 'Held', 'Released', 'Outstanding', 'Status', 'Release Date'],
    ...payables.map((payable) => [
      payable.billDate.toISOString().slice(0, 10),
      payable.supplier.name,
      payable.phase?.name ?? 'Project general',
      payable.retentionType,
      Number(payable.retentionAmount ?? 0),
      Number(payable.retentionReleasedAmount ?? 0),
      Math.max(Number(payable.retentionAmount ?? 0) - Number(payable.retentionReleasedAmount ?? 0), 0),
      payable.retentionStatus,
      payable.retentionReleaseDate?.toISOString().slice(0, 10) ?? '',
    ]),
  ];

  await safeAuditLog({ userId: access.context.userId, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'retention', format: 'csv' }, context: 'retention csv export' });
  return csvResponse(`retention-${project.code ?? project.id}.csv`, csvRows(rows));
}
