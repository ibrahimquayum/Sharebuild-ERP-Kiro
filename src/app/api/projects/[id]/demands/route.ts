import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';
import { isPhaseLocked, lockedPhaseMessage } from '@/lib/accounting';

const demandSchema = z.object({
  title: z.string().min(1),
  phaseId: z.string().min(1),
  allocationIds: z.array(z.string().min(1)).min(1),
  amount: z.number().positive(),
  dueDate: z.string().optional().refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Invalid due date.'),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(req.url);
  const buyerId = searchParams.get('buyerId');
  const unpaidOnly = searchParams.get('unpaidOnly') === 'true';

  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const demands = await prisma.demand.findMany({
    where: {
      unit: { projectId: project.id },
      ...(buyerId ? { buyerId } : {}),
      ...(unpaidOnly ? { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } } : {}),
    },
    include: {
      phase: { select: { id: true, name: true, sequence: true } },
      unit: { select: { id: true, unitNo: true } },
      buyer: { select: { id: true, name: true } },
      collections: { where: { status: { not: 'REVERSED' } }, select: { amount: true } },
      allocations: { where: { collection: { status: { not: 'REVERSED' } } }, select: { amount: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(demands.map((demand) => {
    const allocated = demand.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    const paid = allocated > 0 ? allocated : demand.collections.reduce((sum, collection) => sum + Number(collection.amount), 0);
    const amount = Number(demand.amount);
    return {
      id: demand.id,
      demandNo: demand.demandNo,
      title: demand.title,
      phaseId: demand.phaseId,
      phaseName: demand.phase?.name ?? 'No phase',
      unitNo: demand.unit.unitNo,
      buyerId: demand.buyerId,
      buyerName: demand.buyer.name,
      amount,
      paid,
      due: amount - paid,
      dueDate: demand.dueDate,
      status: demand.status,
    };
  }));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'demands', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const parsed = demandSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const phase = await prisma.phase.findFirst({ where: { id: parsed.data.phaseId, projectId: project.id }, select: { id: true, auditLockedAt: true } });
  if (!phase) return NextResponse.json({ error: 'Phase not found in this project' }, { status: 404 });
  if (isPhaseLocked(phase)) return NextResponse.json({ error: lockedPhaseMessage() }, { status: 423 });

  const allocations = await prisma.unitBuyer.findMany({
    where: {
      id: { in: parsed.data.allocationIds },
      unit: { projectId: project.id },
    },
    include: { unit: true, buyer: true },
  });
  if (allocations.length !== parsed.data.allocationIds.length) {
    return NextResponse.json({ error: 'One or more buyer/unit allocations were not found in this project.' }, { status: 400 });
  }
  const payerOnly = allocations.find((allocation) => allocation.relationship === 'PAYER_ONLY');
  if (payerOnly) {
    return NextResponse.json({ error: 'Payer-only rows cannot receive ownership demands. Select owner or co-owner rows.' }, { status: 400 });
  }

  const sequenceStart = await prisma.demand.count({ where: { unit: { projectId: project.id } } });
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;
  const perUnitAmount = parsed.data.amount;

  const demands = await prisma.$transaction(
    allocations.map((allocation, index) => prisma.demand.create({
      data: {
        unitId: allocation.unitId,
        buyerId: allocation.buyerId,
        phaseId: phase.id,
        title: parsed.data.title,
        amount: perUnitAmount * (Number(allocation.sharePercent) / 100),
        dueDate,
        status: 'ISSUED',
        issuedAt: new Date(),
        notes: parsed.data.notes ?? `Generated from per-unit amount ${perUnitAmount} and ${Number(allocation.sharePercent)}% ownership share.`,
        demandNo: `DN-${String(sequenceStart + index + 1).padStart(4, '0')}`,
      },
    }))
  );

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'demand',
    entityId: demands[0]?.id,
    newValues: { count: demands.length, perUnitAmount, ...parsed.data },
    context: 'demand create',
  });

  return NextResponse.json({ count: demands.length, totalAmount: demands.reduce((sum, demand) => sum + Number(demand.amount), 0) }, { status: 201 });
}
