import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiPhasePermission } from '@/lib/access-control';

const lockSchema = z.object({
  locked: z.boolean(),
  reason: z.string().trim().min(3, 'Audit lock/unlock reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiPhasePermission({ phaseId: params.id, module: 'audit', action: 'auditAccess' });
  if (!access.ok) return apiAccessError(access);

  const companyId = access.context.companyId;
  const userId = access.context.userId;
  const parsed = lockSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const phase = await prisma.phase.findFirst({ where: { id: params.id, project: { companyId } }, select: { id: true, projectId: true, auditLockedAt: true } });
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });

  const updated = await prisma.phase.update({
    where: { id: phase.id },
    data: parsed.data.locked
      ? { auditLockedAt: new Date(), auditLockedById: userId, auditLockReason: parsed.data.reason }
      : { auditLockedAt: null, auditLockedById: userId, auditLockReason: parsed.data.reason },
  });

  await safeAuditLog({
    userId,
    projectId: phase.projectId,
    action: 'UPDATE',
    entityType: parsed.data.locked ? 'phase_audit_lock' : 'phase_audit_unlock',
    entityId: phase.id,
    oldValues: { auditLockedAt: phase.auditLockedAt },
    newValues: { auditLockedAt: updated.auditLockedAt, reason: parsed.data.reason },
    context: 'phase audit lock',
  });

  return NextResponse.json(updated);
}
