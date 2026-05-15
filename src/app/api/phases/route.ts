import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPhaseSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  nameBn: z.string().optional(),
  phaseType: z.enum(['PILING','BASEMENT','SLAB','HALF_SLAB','GATHUNI','SANITARY','FINISHING','CUSTOM']),
  floorNo: z.number().int().optional(),
  status: z.enum(['DRAFT','ACTIVE','APPROVED','INCLUDED_IN_SUMMARY','EXCLUDED_FROM_SUMMARY','CANCELLED','DUPLICATE']).default('DRAFT'),
  sequence: z.number().int().default(0),
  workDesc: z.string().optional(),
  workDescBn: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  serviceChargePct: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const phases = await prisma.phase.findMany({
    where: {
      project: { companyId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { collections: true, expenses: true } },
    },
    orderBy: [{ projectId: 'asc' }, { sequence: 'asc' }],
  });

  return NextResponse.json(phases);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = createPhaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify project belongs to this company
  const project = await prisma.project.findFirst({ where: { id: d.projectId, companyId } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const phase = await prisma.phase.create({
    data: {
      projectId: d.projectId,
      name: d.name,
      nameBn: d.nameBn,
      phaseType: d.phaseType,
      floorNo: d.floorNo,
      status: d.status,
      sequence: d.sequence,
      workDesc: d.workDesc,
      workDescBn: d.workDescBn,
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      endDate: d.endDate ? new Date(d.endDate) : undefined,
      serviceChargePct: d.serviceChargePct,
      notes: d.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'CREATE',
      entityType: 'phase',
      entityId: phase.id,
      newValues: phase as any,
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
