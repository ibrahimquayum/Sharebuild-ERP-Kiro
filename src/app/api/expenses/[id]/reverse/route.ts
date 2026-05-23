import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { can } from '@/lib/permissions';
import { reverseCashBankTransaction } from '@/lib/cash-bank';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'expenses', 'reverseAdjust')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, phase: { project: { companyId } } },
    include: { phase: { select: { projectId: true, auditLockedAt: true } } },
  });
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (expense.reversedAt || expense.status === 'CANCELLED') return NextResponse.json({ error: 'Expense is already reversed/cancelled.' }, { status: 400 });
  if (expense.phase.auditLockedAt) return NextResponse.json({ error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' }, { status: 423 });

  const updated = await prisma.$transaction(async (tx) => {
    const reversed = await tx.expense.update({
      where: { id: expense.id },
      data: {
        status: 'CANCELLED',
        reversedAt: new Date(),
        reversedById: userId,
        reversalReason: parsed.data.reason,
      },
    });
    await reverseCashBankTransaction(tx, {
      sourceType: 'DIRECT_EXPENSE',
      sourceId: expense.id,
      userId,
      reason: parsed.data.reason,
    });
    return reversed;
  });

  await safeAuditLog({
    userId,
    projectId: expense.phase.projectId,
    action: 'UPDATE',
    entityType: 'expense_reversal',
    entityId: expense.id,
    oldValues: { status: expense.status, amount: expense.amount },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'expense reverse',
  });

  return NextResponse.json(updated);
}
