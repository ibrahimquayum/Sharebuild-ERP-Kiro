import { NextResponse } from 'next/server';
import { safeAuditLog } from '@/lib/audit';
import { csvResponse, csvRows } from '@/lib/csv';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'reports', action: 'export' });
  if (!access.ok) return apiAccessError(access);

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: access.context.companyId },
    select: { id: true, code: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const ledger = await getProjectServiceChargeLedger(project.id);
  const rows = [
    ['Phase', 'Basis Type', 'Construction Cost', 'Percent', 'Calculated Service Charge', 'Billed Amount', 'Collected Amount', 'Uncollected Amount', 'Status', 'Flow Note', 'Settlement Reference', 'Included In Demand'],
    ...(ledger?.rows ?? []).map((row) => [
      row.phaseName,
      row.basisType,
      row.basisAmount,
      row.percentage ?? 0,
      row.serviceChargeAmount,
      row.billedAmount,
      row.collectedAmount,
      row.uncollectedAmount,
      row.status,
      row.includedInDemand
        ? 'Demand-linked'
        : row.settlementStatus === 'SETTLED'
          ? 'Legacy separate settlement'
          : row.settlementStatus,
      row.settlementReference ?? '',
      row.includedInDemand ? 'YES' : 'NO',
    ]),
  ];

  await safeAuditLog({
    userId: access.context.userId,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'report_export',
    entityId: project.id,
    newValues: { report: 'service_charge', format: 'csv' },
    context: 'service charge csv export',
  });

  return csvResponse(`service-charge-${project.code ?? project.id}.csv`, csvRows(rows));
}
