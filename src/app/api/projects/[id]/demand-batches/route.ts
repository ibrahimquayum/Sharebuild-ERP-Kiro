import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { isPhaseLocked, lockedPhaseMessage } from '@/lib/accounting';
import { assertApiProjectPermission } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';

const demandBatchSchema = z.object({
  title: z.string().min(1),
  phaseId: z.string().min(1),
  basisType: z.enum(['EQUAL_PER_UNIT', 'OWNERSHIP_SHARE']).default('EQUAL_PER_UNIT'),
  baseAmount: z.number().nonnegative(),
  serviceChargeEntryId: z.string().optional(),
  serviceChargeAmount: z.number().nonnegative().default(0),
  adjustmentAmount: z.number().default(0),
  carryForwardAmount: z.number().default(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'demands', action: 'create' });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = demandBatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const [phase, ownershipRows, serviceChargeEntry] = await Promise.all([
    prisma.phase.findFirst({
      where: { id: data.phaseId, projectId: access.project.id },
      select: { id: true, name: true, auditLockedAt: true },
    }),
    prisma.unitBuyer.findMany({
      where: { unit: { projectId: access.project.id }, relationship: { not: 'PAYER_ONLY' } },
      include: { unit: { select: { id: true, unitNo: true } } },
      orderBy: [{ unit: { unitNo: 'asc' } }, { assignedAt: 'asc' }],
    }),
    data.serviceChargeEntryId
      ? prisma.serviceChargeEntry.findFirst({
          where: {
            id: data.serviceChargeEntryId,
            projectId: access.project.id,
            reversedAt: null,
            status: 'APPROVED',
          },
          select: { id: true, serviceChargeAmount: true },
        })
      : Promise.resolve(null),
  ]);

  if (!phase) return NextResponse.json({ error: 'Phase not found in this project.' }, { status: 404 });
  if (isPhaseLocked(phase)) return NextResponse.json({ error: lockedPhaseMessage() }, { status: 423 });
  if (ownershipRows.length === 0) {
    return NextResponse.json({ error: 'Add unit ownership rows before issuing a demand batch.' }, { status: 400 });
  }
  if (data.serviceChargeEntryId && !serviceChargeEntry) {
    return NextResponse.json({ error: 'Selected service charge entry was not found or is not approved.' }, { status: 404 });
  }

  const totalBillableAmount = roundMoney(
    data.baseAmount + data.serviceChargeAmount + data.adjustmentAmount + data.carryForwardAmount,
  );
  if (totalBillableAmount <= 0) {
    return NextResponse.json({ error: 'Total billable amount must be greater than zero.' }, { status: 400 });
  }

  const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

  const result = await prisma.$transaction(async (tx) => {
    const batchCount = await tx.demandBatch.count({ where: { projectId: access.project.id } });
    const batch = await tx.demandBatch.create({
      data: {
        companyId: access.context.companyId,
        projectId: access.project.id,
        phaseId: phase.id,
        title: data.title.trim(),
        batchNo: `DB-${String(batchCount + 1).padStart(4, '0')}`,
        basisType: data.basisType,
        baseAmount: data.baseAmount,
        serviceChargeEntryId: serviceChargeEntry?.id,
        serviceChargeAmount: data.serviceChargeAmount,
        adjustmentAmount: data.adjustmentAmount,
        carryForwardAmount: data.carryForwardAmount,
        totalBillableAmount,
        dueDate,
        status: 'ISSUED',
        issuedAt: new Date(),
        issuedById: access.context.userId,
        notes: data.notes?.trim() || undefined,
      },
    });

    const unitGroups = new Map<string, typeof ownershipRows>();
    for (const row of ownershipRows) {
      const group = unitGroups.get(row.unitId) ?? [];
      group.push(row);
      unitGroups.set(row.unitId, group);
    }

    const unitCount = unitGroups.size || 1;
    const perUnitBase = data.baseAmount / unitCount;
    const perUnitServiceCharge = data.serviceChargeAmount / unitCount;
    const perUnitAdjustment = data.adjustmentAmount / unitCount;
    const perUnitCarryForward = data.carryForwardAmount / unitCount;

    const creates = [];
    let demandCount = 0;

    for (const [unitId, rows] of Array.from(unitGroups.entries())) {
      for (const row of rows) {
        const shareFactor =
          data.basisType === 'OWNERSHIP_SHARE'
            ? Number(row.sharePercent) / 100
            : Number(row.sharePercent) / 100;
        const baseAmount = roundMoney(perUnitBase * shareFactor);
        const serviceChargeAmount = roundMoney(perUnitServiceCharge * shareFactor);
        const adjustmentAmount = roundMoney(perUnitAdjustment * shareFactor);
        const carryForwardAmount = roundMoney(perUnitCarryForward * shareFactor);
        const amount = roundMoney(baseAmount + serviceChargeAmount + adjustmentAmount + carryForwardAmount);
        demandCount += 1;

        creates.push(
          tx.demand.create({
            data: {
              unitId,
              buyerId: row.buyerId,
              phaseId: phase.id,
              demandBatchId: batch.id,
              title: `${data.title.trim()} - Unit ${row.unit.unitNo}`,
              demandNo: `${batch.batchNo}-${String(demandCount).padStart(3, '0')}`,
              amount,
              baseAmount,
              serviceChargeAmount,
              adjustmentAmount,
              carryForwardAmount,
              dueDate,
              demandType: 'REGULAR',
              status: 'ISSUED',
              issuedAt: new Date(),
              notes: data.notes?.trim() || `Issued from demand batch ${batch.batchNo}.`,
            },
          }),
        );
      }
    }

    await Promise.all(creates);

    if (serviceChargeEntry?.id) {
      await tx.serviceChargeEntry.update({
        where: { id: serviceChargeEntry.id },
        data: {
          includedInDemand: true,
          settlementStatus: 'INCLUDED_IN_DEMAND',
        },
      });
    }

    return batch;
  });

  await safeAuditLog({
    userId: access.context.userId,
    projectId: access.project.id,
    action: 'CREATE',
    entityType: 'demand_batch',
    entityId: result.id,
    newValues: {
      title: data.title,
      phaseId: data.phaseId,
      totalBillableAmount,
      serviceChargeEntryId: data.serviceChargeEntryId ?? null,
    },
    context: 'demand batch create',
  });

  return NextResponse.json({ id: result.id }, { status: 201 });
}
