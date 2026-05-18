import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { refreshDemandStatus } from '@/lib/accounting';
import { can } from '@/lib/permissions';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'collections', 'reverseAdjust')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const collection = await prisma.collection.findFirst({
    where: { id: params.id, phase: { project: { companyId } } },
    include: { phase: { select: { projectId: true, auditLockedAt: true } }, allocations: { select: { demandId: true } } },
  });
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
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
