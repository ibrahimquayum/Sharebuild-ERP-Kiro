import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';

const lockSchema = z.object({
  locked: z.boolean(),
  reason: z.string().trim().min(3, 'Audit lock/unlock reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
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
