import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';

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
  allocationMode: z.enum(['FIFO', 'SINGLE']).default('FIFO'),
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

  // Verify buyer belongs to company
  const buyer = await prisma.buyer.findFirst({ where: { id: d.buyerId, companyId } });
  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  if (d.demandId) {
    const demand = await prisma.demand.findFirst({ where: { id: d.demandId, buyerId: d.buyerId, phaseId: d.phaseId, unit: { projectId: phase.projectId } } });
    if (!demand) return NextResponse.json({ error: 'Demand not found for this buyer, phase, and project.' }, { status: 404 });
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

  const collections = await prisma.$transaction(async (tx) => {
    if (d.demandId || d.allocationMode === 'SINGLE') {
      const collection = await tx.collection.create({
        data: { ...baseCollectionData, phaseId: d.phaseId, demandId: d.demandId, amount: d.amount },
      });
      if (d.demandId) {
        const demand = await tx.demand.findUnique({
          where: { id: d.demandId },
          include: { collections: { select: { amount: true } } },
        });
        if (demand) {
          const paid = demand.collections.reduce((sum, item) => sum + Number(item.amount), 0);
          const amount = Number(demand.amount);
          await tx.demand.update({
            where: { id: demand.id },
            data: { status: paid >= amount ? 'FULLY_PAID' : paid > 0 ? 'PARTIALLY_PAID' : demand.status },
          });
        }
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
      include: { collections: { select: { amount: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    for (const demand of demands) {
      if (remaining <= 0) break;
      const paid = demand.collections.reduce((sum, item) => sum + Number(item.amount), 0);
      const due = Math.max(Number(demand.amount) - paid, 0);
      if (due <= 0) continue;
      const allocated = Math.min(remaining, due);
      created.push(await tx.collection.create({
        data: { ...baseCollectionData, phaseId: d.phaseId, demandId: demand.id, amount: allocated },
      }));
      remaining -= allocated;
      const newPaid = paid + allocated;
      await tx.demand.update({
        where: { id: demand.id },
        data: { status: newPaid >= Number(demand.amount) ? 'FULLY_PAID' : 'PARTIALLY_PAID' },
      });
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
