import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

const statusSchema = z.object({
  status: z.enum(['CLEARED', 'BOUNCED', 'CANCELLED']),
  reason: z.string().trim().min(2).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'reverseAdjust')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const parsed = statusSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cheque = await prisma.chequeLog.findFirst({
    where: { id: params.id, companyId },
  });
  if (!cheque) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 });

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    notes: parsed.data.reason ?? cheque.notes ?? undefined,
  };
  if (parsed.data.status === 'CLEARED') updateData.clearedDate = new Date();
  if (parsed.data.status === 'BOUNCED') updateData.bouncedDate = new Date();
  if (parsed.data.status === 'CANCELLED') updateData.cancelledDate = new Date();

  const updated = await prisma.chequeLog.update({
    where: { id: cheque.id },
    data: updateData,
  });

  await safeAuditLog({
    userId,
    projectId: cheque.projectId,
    action: 'UPDATE',
    entityType: 'cheque_status',
    entityId: cheque.id,
    oldValues: { status: cheque.status },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'cheque status update',
  });

  return NextResponse.json(updated);
}
