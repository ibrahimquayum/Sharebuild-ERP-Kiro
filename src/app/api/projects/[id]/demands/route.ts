import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

const demandSchema = z.object({
  title: z.string().min(1),
  phaseId: z.string().min(1),
  allocationIds: z.array(z.string().min(1)).min(1),
  amount: z.number().positive(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

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

  const phase = await prisma.phase.findFirst({ where: { id: parsed.data.phaseId, projectId: project.id }, select: { id: true } });
  if (!phase) return NextResponse.json({ error: 'Phase not found in this project' }, { status: 404 });

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

  const sequenceStart = await prisma.demand.count({ where: { unit: { projectId: project.id } } });
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;

  const demands = await prisma.$transaction(
    allocations.map((allocation, index) => prisma.demand.create({
      data: {
        unitId: allocation.unitId,
        buyerId: allocation.buyerId,
        phaseId: phase.id,
        title: parsed.data.title,
        amount: parsed.data.amount,
        dueDate,
        status: 'ISSUED',
        issuedAt: new Date(),
        notes: parsed.data.notes,
        demandNo: `DN-${String(sequenceStart + index + 1).padStart(4, '0')}`,
      },
    }))
  );

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      projectId: project.id,
      action: 'CREATE',
      entityType: 'demand',
      entityId: demands[0]?.id,
      newValues: { count: demands.length, ...parsed.data } as any,
    },
  });

  return NextResponse.json({ count: demands.length }, { status: 201 });
}
