import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { refreshDemandStatus } from '@/lib/accounting';
import { reverseCashBankTransaction } from '@/lib/cash-bank';
import { apiAccessError, assertApiCompanyPermission, hasProjectAccess } from '@/lib/access-control';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyPermission('collections', 'reverseAdjust');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;
  const userId = access.context.userId;
  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const collection = await prisma.collection.findFirst({
    where: { id: params.id, phase: { project: { companyId } } },
    include: { phase: { select: { projectId: true, auditLockedAt: true } }, allocations: { select: { demandId: true } } },
  });
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  if (!hasProjectAccess(access.context, collection.phase.projectId)) {
    return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  }
  if (collection.status === 'REVERSED' || collection.reversedAt) return NextResponse.json({ error: 'Collection is already reversed.' }, { status: 400 });
  if (collection.phase.auditLockedAt) return NextResponse.json({ error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' }, { status: 423 });

  const updated = await prisma.$transaction(async (tx) => {
    const reversed = await tx.collection.update({
      where: { id: collection.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
        reversalReason: parsed.data.reason,
      },
    });
    await reverseCashBankTransaction(tx, {
      sourceType: 'BUYER_COLLECTION',
      sourceId: collection.id,
      userId,
      reason: parsed.data.reason,
    });
    const demandIds = new Set(collection.allocations.map((allocation) => allocation.demandId));
    if (collection.demandId) demandIds.add(collection.demandId);
    for (const demandId of Array.from(demandIds)) await refreshDemandStatus(tx, demandId);
    return reversed;
  });

  await safeAuditLog({
    userId,
    projectId: collection.phase.projectId,
    action: 'UPDATE',
    entityType: 'collection_reversal',
    entityId: collection.id,
    oldValues: { status: collection.status, amount: collection.amount },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'collection reverse',
  });

  return NextResponse.json(updated);
}
