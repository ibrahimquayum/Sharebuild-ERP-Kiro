import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  const companyId = (session.user as any).companyId;

  if (!['COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, phase: { project: { companyId } } },
    include: { phase: { select: { projectId: true } } },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
  });

  await safeAuditLog({
    userId,
    projectId: expense.phase.projectId,
    action: 'APPROVE',
    entityType: 'expense',
    entityId: params.id,
    oldValues: { status: expense.status },
    newValues: { status: 'APPROVED' },
    context: 'expense approve',
  });

  return NextResponse.json(updated);
}
