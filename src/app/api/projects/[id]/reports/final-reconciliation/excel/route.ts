import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { csvResponse, csvSection } from '@/lib/csv';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, code: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const preview = await getFinalReconciliationPreview(project.id);
  if (!preview) return NextResponse.json({ error: 'Reconciliation preview not available' }, { status: 404 });

  const content = [
    csvSection('Summary', [
      ['Direction', preview.direction],
      ['Project Balance', preview.summary.projectBalance],
      ['Service Charge', preview.summary.serviceChargeAccrued],
      ['Retention Held', preview.summary.retentionHeld],
      ['Final Result', preview.finalSurplusDeficit],
      ['Posted Reconciliation Id', preview.posted?.id ?? ''],
      ['Posted Reconciliation Type', preview.posted?.type ?? ''],
      ['Generated Demand Count', preview.posted?.demands.length ?? 0],
      ['Recommendation', preview.recommendation],
    ]),
    csvSection('Buyer Distribution', [
      ['Buyer', 'Units', 'Share %', preview.direction === 'SURPLUS' ? 'Refund / Adjust' : 'Collect'],
      ...preview.distribution.map((row) => [row.buyerName, row.units, row.sharePercent, row.amount]),
    ]),
  ].join('\r\n');

  await safeAuditLog({ userId: (session.user as any).id, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'final_reconciliation', format: 'csv' }, context: 'final reconciliation csv export' });
  return csvResponse(`final-reconciliation-${project.code ?? project.id}.csv`, content);
}
