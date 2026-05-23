import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { safeAuditLog } from '@/lib/audit';
import { csvResponse, csvRows } from '@/lib/csv';
import { can } from '@/lib/permissions';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'reports', 'export')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, code: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const ledger = await getProjectServiceChargeLedger(project.id);
  const rows = [
    ['Phase', 'Basis Type', 'Basis Amount', 'Percent', 'Service Charge', 'Status', 'Included In Demand'],
    ...(ledger?.rows ?? []).map((row) => [
      row.phaseName,
      row.basisType,
      row.basisAmount,
      row.percentage ?? 0,
      row.serviceChargeAmount,
      row.status,
      row.includedInDemand ? 'YES' : 'NO',
    ]),
  ];

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: project.id,
    newValues: { report: 'service_charge', format: 'csv' },
    context: 'service charge csv export',
  });

  return csvResponse(`service-charge-${project.code ?? project.id}.csv`, csvRows(rows));
}
