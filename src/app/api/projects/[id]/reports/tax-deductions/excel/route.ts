import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { csvResponse, csvRows } from '@/lib/csv';
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

  await safeAuditLog({ userId: (session.user as any).id, projectId: project.id, action: 'CREATE', entityType: 'report_export', entityId: project.id, newValues: { report: 'tax_deductions', format: 'csv' }, context: 'tax deduction csv export' });
  return csvResponse(`tax-deductions-${project.code ?? project.id}.csv`, csvRows(rows));
}
