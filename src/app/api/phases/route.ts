import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyWidePermission, assertApiProjectPermission } from '@/lib/access-control';

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
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const access = projectId
    ? await assertApiProjectPermission({ projectId, module: 'phases', action: 'view' })
    : await assertApiCompanyWidePermission('phases', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

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
  const body = await req.json();
  const parsed = createPhaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const access = await assertApiProjectPermission({ projectId: d.projectId, module: 'phases', action: 'create' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

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

  await safeAuditLog({
    userId: access.context.userId,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'phase',
    entityId: phase.id,
    newValues: phase,
    context: 'phase create',
  });

  return NextResponse.json(phase, { status: 201 });
}
