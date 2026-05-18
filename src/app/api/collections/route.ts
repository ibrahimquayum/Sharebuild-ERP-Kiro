import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { getDemandPaidAmount, isPhaseLocked, lockedPhaseMessage, refreshDemandStatus } from '@/lib/accounting';

const createSchema = z.object({
  phaseId: z.string(),
  buyerId: z.string(),
  demandId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).default('CASH'),
  transactionType: z.enum(['COLLECTION','REFUND','ADJUSTMENT']).default('COLLECTION'),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  receiptNo: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
  allocationMode: z.enum(['FIFO', 'SINGLE', 'MANUAL']).default('FIFO'),
  allocations: z.array(z.object({
    demandId: z.string().min(1),
    amount: z.number().positive(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const phaseId = searchParams.get('phaseId');
  const buyerId = searchParams.get('buyerId');

  const collections = await prisma.collection.findMany({
    where: {
      phase: { project: { companyId } },
      ...(phaseId ? { phaseId } : {}),
      ...(buyerId ? { buyerId } : {}),
    },
    include: {
      buyer: { select: { id: true, name: true, nameBn: true, phone: true } },
      phase: { select: { id: true, name: true } },
      allocations: { select: { id: true, amount: true, demandId: true } },
    },
    orderBy: { receivedDate: 'desc' },
  });

  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify phase belongs to company
  const phase = await prisma.phase.findFirst({ where: { id: d.phaseId, project: { companyId } } });
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  if (isPhaseLocked(phase)) return NextResponse.json({ error: lockedPhaseMessage() }, { status: 423 });

  // Verify buyer belongs to company
  const buyer = await prisma.buyer.findFirst({ where: { id: d.buyerId, companyId } });
  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  if (d.demandId) {
    const demand = await prisma.demand.findFirst({ where: { id: d.demandId, buyerId: d.buyerId, phaseId: d.phaseId, unit: { projectId: phase.projectId } } });
    if (!demand) return NextResponse.json({ error: 'Demand not found for this buyer, phase, and project.' }, { status: 404 });
  }
  if (d.allocationMode === 'MANUAL') {
    if (!d.allocations?.length) return NextResponse.json({ error: 'Manual allocation requires at least one demand allocation.' }, { status: 400 });
    const allocationTotal = d.allocations.reduce((sum, item) => sum + item.amount, 0);
    if (allocationTotal - d.amount > 0.01) return NextResponse.json({ error: 'Allocated amount cannot exceed received amount.' }, { status: 400 });
    const demandIds = d.allocations.map((item) => item.demandId);
    const demands = await prisma.demand.findMany({ where: { id: { in: demandIds }, buyerId: d.buyerId, phaseId: d.phaseId, unit: { projectId: phase.projectId }, status: { not: 'CANCELLED' } }, select: { id: true } });
    if (demands.length !== demandIds.length) return NextResponse.json({ error: 'One or more allocated demands were not found for this buyer, phase, and project.' }, { status: 400 });
  }

  const receivedDate = d.receivedDate ? new Date(d.receivedDate) : new Date();
  const baseCollectionData = {
    buyerId: d.buyerId,
    paymentMethod: d.paymentMethod,
    transactionType: d.transactionType,
    chequeNo: d.chequeNo,
    chequeDate: d.chequeDate ? new Date(d.chequeDate) : undefined,
    bankName: d.bankName,
    reference: d.reference,
    receiptNo: d.receiptNo,
    receivedDate,
    notes: d.notes,
  };

  let collections;
  try {
    collections = await prisma.$transaction(async (tx) => {
    if (d.allocationMode === 'MANUAL' && d.allocations?.length) {
      const allocationTotal = d.allocations.reduce((sum, item) => sum + item.amount, 0);
      const collection = await tx.collection.create({
        data: {
          ...baseCollectionData,
          phaseId: d.phaseId,
          amount: d.amount,
          notes: [d.notes, allocationTotal < d.amount ? 'Includes buyer advance/credit after manual allocation.' : undefined].filter(Boolean).join(' '),
        },
      });
      for (const allocation of d.allocations) {
        const demand = await tx.demand.findUnique({ where: { id: allocation.demandId }, select: { amount: true } });
        const paid = await getDemandPaidAmount(tx, allocation.demandId);
        const due = Math.max(Number(demand?.amount ?? 0) - paid, 0);
        if (allocation.amount - due > 0.01) throw new Error('Allocated amount cannot exceed the selected demand due.');
        await tx.collectionAllocation.create({ data: { collectionId: collection.id, demandId: allocation.demandId, amount: allocation.amount } });
        await refreshDemandStatus(tx, allocation.demandId);
      }
      return [collection];
    }

    if (d.demandId || d.allocationMode === 'SINGLE') {
      const selectedDemandId = d.demandId;
      const allocatable = selectedDemandId
        ? await (async () => {
          const demand = await tx.demand.findUnique({ where: { id: selectedDemandId }, select: { amount: true } });
          const paid = await getDemandPaidAmount(tx, selectedDemandId);
          return Math.min(d.amount, Math.max(Number(demand?.amount ?? 0) - paid, 0));
        })()
        : 0;
      const collection = await tx.collection.create({
        data: {
          ...baseCollectionData,
          phaseId: d.phaseId,
          demandId: selectedDemandId,
          amount: d.amount,
          notes: [d.notes, selectedDemandId && allocatable < d.amount ? 'Includes buyer advance/credit after selected demand allocation.' : undefined].filter(Boolean).join(' '),
        },
      });
      if (selectedDemandId && allocatable > 0) {
        await tx.collectionAllocation.create({ data: { collectionId: collection.id, demandId: selectedDemandId, amount: allocatable } });
        await refreshDemandStatus(tx, selectedDemandId);
      }
      return [collection];
    }

    let remaining = d.amount;
    const created = [];
    const demands = await tx.demand.findMany({
      where: {
        buyerId: d.buyerId,
        phaseId: d.phaseId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    for (const demand of demands) {
      if (remaining <= 0) break;
      const paid = await getDemandPaidAmount(tx, demand.id);
      const due = Math.max(Number(demand.amount) - paid, 0);
      if (due <= 0) continue;
      const allocated = Math.min(remaining, due);
      const collection = await tx.collection.create({
        data: { ...baseCollectionData, phaseId: d.phaseId, demandId: demand.id, amount: allocated },
      });
      await tx.collectionAllocation.create({ data: { collectionId: collection.id, demandId: demand.id, amount: allocated } });
      created.push(collection);
      remaining -= allocated;
      await refreshDemandStatus(tx, demand.id);
    }

    if (remaining > 0 || created.length === 0) {
      created.push(await tx.collection.create({
        data: {
          ...baseCollectionData,
          phaseId: d.phaseId,
          amount: remaining > 0 ? remaining : d.amount,
          notes: [d.notes, remaining > 0 ? 'Advance/credit after FIFO demand allocation.' : 'Unallocated collection.'].filter(Boolean).join(' '),
        },
      }));
    }

      return created;
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to record collection.' }, { status: 400 });
  }

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: phase.projectId,
    action: 'CREATE',
    entityType: 'collection',
    entityId: collections[0]?.id,
    newValues: { count: collections.length, amount: d.amount, buyerId: d.buyerId, phaseId: d.phaseId, allocationMode: d.allocationMode },
    context: 'collection create',
  });

  return NextResponse.json(collections.length === 1 ? collections[0] : { count: collections.length, collections }, { status: 201 });
}
