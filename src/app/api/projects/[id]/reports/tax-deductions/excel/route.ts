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
    where: { projectId: project.id, reversedAt: null, OR: [{ vatAmount: { gt: 0 } }, { aitTdsAmount: { gt: 0 } }, { otherDeductionAmount: { gt: 0 } }] },
    include: { supplier: { select: { name: true } }, phase: { select: { name: true } } },
    orderBy: [{ billDate: 'desc' }],
  });

  const rows = [
    ['Bill Date', 'Party', 'Phase', 'Gross', 'VAT', 'AIT/TDS', 'Other Deduction', 'Net Payable', 'Reference'],
    ...payables.map((payable) => [
      payable.billDate.toISOString().slice(0, 10),
      payable.supplier.name,
      payable.phase?.name ?? 'Project general',
      Number(payable.totalAmount),
      Number(payable.vatAmount ?? 0),
      Number(payable.aitTdsAmount ?? 0),
      Number(payable.otherDeductionAmount ?? 0),
      Number(payable.netPayableAmount ?? payable.totalAmount),
      payable.deductionReference ?? '',
    ]),
  ];

  await safeAuditLog({ userId: access.context.userId, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'tax_deductions', format: 'csv' }, context: 'tax deduction csv export' });
  return csvResponse(`tax-deductions-${project.code ?? project.id}.csv`, csvRows(rows));
}
