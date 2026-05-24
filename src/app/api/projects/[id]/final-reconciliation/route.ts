import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertApiProjectPermission } from '@/lib/access-control';
import { safeAuditLog } from '@/lib/audit';
import { createCashBankTransactionFromReconciliationRefund } from '@/lib/cash-bank';
import { getFinalReconciliationPreview } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';

const mutationSchema = z.object({
  action: z.enum(['post', 'reverse', 'settleCredit']),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  reconciliationId: z.string().optional(),
  lineId: z.string().optional(),
  settlementStatus: z.enum(['KEPT_AS_ADVANCE', 'REFUNDED', 'ADJUSTED']).optional(),
  accountId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_BANKING', 'OTHER']).optional(),
  reference: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'finalReconciliation', action: 'view' });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const preview = await getFinalReconciliationPreview(access.project.id);
  return NextResponse.json(preview);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'finalReconciliation', action: 'create' });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;
  const userId = access.context.userId;
  const project = access.project;

  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.action === 'post') {
    const approveAccess = await assertApiProjectPermission({ projectId: project.id, module: 'finalReconciliation', action: 'approve' });
    if (!approveAccess.ok) return NextResponse.json({ error: approveAccess.error }, { status: approveAccess.status });

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
            settlementStatus: type === 'SURPLUS_CREDIT' ? 'OPEN_CREDIT' : 'NOT_APPLICABLE',
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

  if (data.action === 'settleCredit') {
    const settleAccess = await assertApiProjectPermission({ projectId: project.id, module: 'accounts', action: 'create' });
    if (!settleAccess.ok) return NextResponse.json({ error: settleAccess.error }, { status: settleAccess.status });
    if (!data.lineId) return NextResponse.json({ error: 'Select a posted surplus credit line first.' }, { status: 400 });
    if (!data.settlementStatus) return NextResponse.json({ error: 'Select how this surplus credit is being settled.' }, { status: 400 });

    const line = await prisma.finalReconciliationLine.findFirst({
      where: {
        id: data.lineId,
        reconciliation: {
          projectId: project.id,
          companyId,
          type: 'SURPLUS_CREDIT',
          status: 'POSTED',
          reversedAt: null,
        },
      },
      include: {
        buyer: { select: { id: true, name: true } },
        reconciliation: { select: { id: true, status: true, reversedAt: true } },
      },
    });
    if (!line) return NextResponse.json({ error: 'Surplus credit line not found.' }, { status: 404 });
    if (line.settlementStatus && line.settlementStatus !== 'OPEN_CREDIT') {
      return NextResponse.json({ error: 'This surplus credit has already been settled.' }, { status: 400 });
    }
    if (data.settlementStatus === 'REFUNDED') {
      if (!data.accountId) return NextResponse.json({ error: 'Select the paying account for the refund.' }, { status: 400 });
      if (!data.paymentMethod) return NextResponse.json({ error: 'Select the refund payment method.' }, { status: 400 });
    }
    const paymentMethod = data.paymentMethod;

    const account = data.accountId
      ? await prisma.cashBankAccount.findFirst({
          where: { id: data.accountId, companyId, isActive: true },
          select: { id: true },
        })
      : null;
    if (data.accountId && !account) return NextResponse.json({ error: 'Selected refund account was not found.' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.finalReconciliationLine.update({
        where: { id: line.id },
        data: {
          settlementStatus: data.settlementStatus,
          settlementAccountId: account?.id ?? undefined,
          settlementMethod: paymentMethod,
          settlementReference: data.reference?.trim() || undefined,
          settledAt: new Date(),
          settledById: userId,
          settlementNote: data.notes?.trim() || undefined,
        },
      });

      if (data.settlementStatus === 'REFUNDED' && account?.id && paymentMethod) {
        const refundPaymentMethod = paymentMethod;
        await createCashBankTransactionFromReconciliationRefund(tx, {
          lineId: line.id,
          accountId: account.id,
          paymentMethod: refundPaymentMethod,
          referenceNo: data.reference?.trim() || undefined,
          description: data.notes?.trim() || `Final reconciliation surplus refund for ${line.buyer.name}.`,
          createdById: userId,
        });
      }
    });

    await safeAuditLog({
      userId,
      projectId: project.id,
      action: 'CREATE',
      entityType: 'final_reconciliation_credit_settlement',
      entityId: line.id,
      newValues: {
        settlementStatus: data.settlementStatus,
        accountId: account?.id ?? null,
        paymentMethod: paymentMethod ?? null,
        reference: data.reference?.trim() || null,
      },
      context: 'final reconciliation credit settlement',
    });

    return NextResponse.json({ ok: true });
  }

  const reverseAccess = await assertApiProjectPermission({ projectId: project.id, module: 'finalReconciliation', action: 'reverseAdjust' });
  if (!reverseAccess.ok) return NextResponse.json({ error: reverseAccess.error }, { status: reverseAccess.status });
  if (!data.reconciliationId) return NextResponse.json({ error: 'Select a posted reconciliation to reverse.' }, { status: 400 });
  if (!data.reason?.trim()) return NextResponse.json({ error: 'A reversal reason is required.' }, { status: 400 });

  const reconciliation = await prisma.finalReconciliation.findFirst({
    where: { id: data.reconciliationId, projectId: project.id, companyId },
    include: {
      lines: {
        select: { id: true, settlementStatus: true, settlementReference: true },
      },
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
  const settledCredits = reconciliation.lines.some((line) => ['REFUNDED', 'ADJUSTED'].includes(line.settlementStatus));
  if (settledCredits) {
    return NextResponse.json({ error: 'Reverse refunded or adjusted surplus credit settlements before reversing the posted final reconciliation.' }, { status: 400 });
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
