import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
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
  if (!can(role, 'suppliers', 'reverseAdjust') && !can(role, 'subcontractors', 'reverseAdjust')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
    include: { phase: { select: { auditLockedAt: true } }, supplier: { select: { supplierType: true } } },
  });
  if (!payable) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (payable.reversedAt || payable.status === 'WRITTEN_OFF') return NextResponse.json({ error: 'Bill is already reversed/written off.' }, { status: 400 });
  if (payable.phase?.auditLockedAt) return NextResponse.json({ error: 'This phase is audit locked. Unlock with an audit reason before changing accounting records.' }, { status: 423 });

  const updated = await prisma.supplierPayable.update({
    where: { id: payable.id },
    data: {
      status: 'WRITTEN_OFF',
      dueAmount: 0,
      reversedAt: new Date(),
      reversedById: userId,
      reversalReason: parsed.data.reason,
    },
  });

  await safeAuditLog({
    userId,
    projectId: payable.projectId,
    action: 'UPDATE',
    entityType: payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'subcontractor_bill_reversal' : 'supplier_bill_reversal',
    entityId: payable.id,
    oldValues: { status: payable.status, totalAmount: payable.totalAmount, paidAmount: payable.paidAmount, dueAmount: payable.dueAmount },
    newValues: { status: updated.status, reason: parsed.data.reason },
    context: 'supplier payable reverse',
  });

  return NextResponse.json(updated);
}
