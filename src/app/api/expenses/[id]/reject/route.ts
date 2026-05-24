import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyPermission, hasProjectAccess } from '@/lib/access-control';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyPermission('expenses', 'approve');
  if (!access.ok) return apiAccessError(access);
  const userId = access.context.userId;
  const companyId = access.context.companyId;

  const body = await req.json().catch(() => ({}));
  const reason = body?.reason ?? '';

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, phase: { project: { companyId } } },
    include: { phase: { select: { projectId: true } } },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (!hasProjectAccess(access.context, expense.phase.projectId)) {
    return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  }

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: { status: 'DISPUTED', notes: reason ? `Rejected: ${reason}` : 'Rejected by reviewer' },
  });

  await safeAuditLog({
    userId,
    projectId: expense.phase.projectId,
    action: 'REJECT',
    entityType: 'expense',
    entityId: params.id,
    oldValues: { status: expense.status },
    newValues: { status: 'DISPUTED', reason },
    context: 'expense reject',
  });

  return NextResponse.json(updated);
}
