import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { safeAuditLog } from '@/lib/audit';
import { assertCan } from '@/lib/permissions';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';

const mutationSchema = z.object({
  action: z.enum(['post', 'reverse']),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  reconciliationId: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const preview = await getFinalReconciliationPreview(project.id);
  return NextResponse.json(preview);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.action === 'post') {
    assertCan(role, 'reports', 'approve');

    const existing = await prisma.finalReconciliation.findFirst({
      where: { projectId: project.id, status: 'POSTED', reversedAt: null },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Final reconciliation is already posted. Reverse it before posting again.' }, { status: 400 });
    }

    const preview = await getFinalReconciliationPreview(project.id);
    if (!preview) return NextResponse.json({ error: 'Final reconciliation preview is not available.' }, { status: 404 });
    if (!preview.canPost) {
      return NextResponse.json({ error: preview.blockingIssues[0] ?? 'Final reconciliation cannot be posted yet.' }, { status: 400 });
    }

    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
    const posted = await prisma.$transaction(async (tx) => {
      const type =
        preview.direction === 'DEFICIT'
          ? 'DEFICIT_DEMAND'
          : preview.direction === 'SURPLUS'
            ? 'SURPLUS_CREDIT'
            : 'ZERO_BALANCE';

      const reconciliation = await tx.finalReconciliation.create({
        data: {
          companyId,
          projectId: project.id,
          type,
          status: 'POSTED',
          totalDemand: preview.summary.totalDemanded,
          totalCollection: preview.summary.totalCollected,
          totalCost: preview.summary.projectCostTotal,
          totalPayable: preview.summary.supplierPayable + preview.summary.subcontractorPayable,
          totalRetention: preview.summary.retentionHeld,
          totalServiceCharge: preview.summary.serviceChargeAccrued,
          totalTaxDeduction: preview.summary.taxDeductionTotal,
          finalAmount: Math.abs(preview.finalSurplusDeficit),
          postedAt: new Date(),
          postedById: userId,
          notes: data.notes?.trim() || undefined,
        },
      });

      const membershipRows = await tx.projectBuyer.findMany({
        where: { projectId: project.id },
        select: { id: true, buyerId: true },
      });
      const membershipMap = new Map(membershipRows.map((row) => [row.buyerId, row.id]));

      const demandCreates = [];

      for (const line of preview.distributionLines) {
        if (line.amount <= 0) continue;

        await tx.finalReconciliationLine.create({
          data: {
            reconciliationId: reconciliation.id,
            buyerId: line.buyerId,
            projectBuyerId: membershipMap.get(line.buyerId),
            unitId: line.unitId,
            ownershipShare: line.ownershipShare,
            amount: line.amount,
            notes: `${line.unitNo} - ${line.ownershipShare}% ownership share`,
          },
        });

        if (type === 'DEFICIT_DEMAND') {
          demandCreates.push(
            tx.demand.create({
              data: {
                unitId: line.unitId,
                buyerId: line.buyerId,
                title: `Final Reconciliation - Unit ${line.unitNo}`,
                amount: line.amount,
                dueDate,
                demandType: 'FINAL_RECONCILIATION',
                finalReconciliationId: reconciliation.id,
                status: 'ISSUED',
                issuedAt: new Date(),
                notes: data.notes?.trim() || `Posted from final reconciliation for ${project.name}.`,
              },
            }),
          );
        }
      }

      if (demandCreates.length > 0) await Promise.all(demandCreates);

      return reconciliation;
    });

    await safeAuditLog({
      userId,
      projectId: project.id,
      action: 'APPROVE',
      entityType: 'final_reconciliation',
      entityId: posted.id,
      newValues: {
        direction: preview.direction,
        finalAmount: preview.absoluteFinalAmount,
        dueDate: data.dueDate,
        notes: data.notes,
      },
      context: 'final reconciliation post',
    });

    return NextResponse.json({ id: posted.id }, { status: 201 });
  }

  assertCan(role, 'reports', 'reverseAdjust');
  if (!data.reconciliationId) return NextResponse.json({ error: 'Select a posted reconciliation to reverse.' }, { status: 400 });
  if (!data.reason?.trim()) return NextResponse.json({ error: 'A reversal reason is required.' }, { status: 400 });

  const reconciliation = await prisma.finalReconciliation.findFirst({
    where: { id: data.reconciliationId, projectId: project.id, companyId },
    include: {
      demands: {
        include: {
          allocations: {
            where: { collection: { status: { not: 'REVERSED' } } },
            select: { id: true },
          },
          collections: {
            where: { status: { not: 'REVERSED' } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!reconciliation) return NextResponse.json({ error: 'Final reconciliation not found.' }, { status: 404 });
  if (reconciliation.status !== 'POSTED' || reconciliation.reversedAt) {
    return NextResponse.json({ error: 'Only posted final reconciliations can be reversed.' }, { status: 400 });
  }

  const collectedDemands = reconciliation.demands.some(
    (demand) => demand.allocations.length > 0 || demand.collections.length > 0,
  );
  if (collectedDemands) {
    return NextResponse.json({ error: 'Reverse or clear reconciliation collections before reversing the posted final reconciliation.' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.demand.updateMany({
      where: { finalReconciliationId: reconciliation.id, demandType: 'FINAL_RECONCILIATION' },
      data: {
        status: 'CANCELLED',
        notes: `${data.reason!.trim()} (reconciliation reversed)`,
      },
    });

    await tx.finalReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
        reversalReason: data.reason!.trim(),
      },
    });
  });

  await safeAuditLog({
    userId,
    projectId: project.id,
    action: 'UPDATE',
    entityType: 'final_reconciliation_reverse',
    entityId: reconciliation.id,
    newValues: { reason: data.reason.trim() },
    context: 'final reconciliation reverse',
  });

  return NextResponse.json({ ok: true });
}
