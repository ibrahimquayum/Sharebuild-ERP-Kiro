import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { getAccessContext, hasPermission, hasProjectAccess } from '@/lib/access-control';
import { isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

const reverseSchema = z.object({
  reason: z.string().trim().min(3, 'A reversal reason is required.'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const context = await getAccessContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = context.companyId;
  const userId = context.userId;

  const parsed = reverseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
    include: { phase: { select: { auditLockedAt: true } }, supplier: { select: { supplierType: true } } },
  });
  if (!payable) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  const module = isSubcontractorSupplierType(payable.supplier.supplierType) ? 'subcontractors' : 'suppliers';
  if (!hasPermission(context, module, 'reverseAdjust')) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  if (!hasProjectAccess(context, payable.projectId)) return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
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
