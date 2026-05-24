import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const nullableText = z.preprocess((value) => value === undefined ? null : value, z.string().trim().nullable());
const nullableNumber = z.preprocess((value) => value === undefined ? null : value, z.number().nullable());
const nullableInt = z.preprocess((value) => value === undefined ? null : value, z.number().int().nullable());
const nullableDate = z.preprocess((value) => value === undefined ? null : value, z.string().trim().nullable())
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Invalid date.');

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  nameBn: nullableText,
  code: nullableText,
  address: nullableText,
  phone: nullableText,
  landSize: nullableText,
  totalFloors: nullableInt,
  residentialFloors: nullableInt,
  unitsPerFloor: nullableInt,
  totalPlannedUnits: nullableInt,
  parkingUtilityNote: nullableText,
  defaultServiceChargePct: nullableNumber,
  notes: nullableText,
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  startDate: nullableDate,
  description: nullableText,
});

function auditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function writeProjectAudit(data: {
  userId?: string;
  projectId: string;
  action: 'CREATE' | 'UPDATE';
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        action: data.action,
        entityType: 'project',
        entityId: data.entityId,
        oldValues: data.oldValues === undefined ? undefined : auditJson(data.oldValues),
        newValues: data.newValues === undefined ? undefined : auditJson(data.newValues),
      },
    });
  } catch (error) {
    console.error('[projects] Audit log failed after project save', error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await assertApiProjectPermission({ projectId: params.id, module: 'projects', action: 'editDraft' });
    if (!access.ok) return apiAccessError(access);
    const companyId = access.context.companyId;
    if (!companyId) return NextResponse.json({ error: 'Your user is not assigned to a company.' }, { status: 400 });
    const oldProject = await prisma.project.findFirst({ where: { id: params.id, companyId } });
    if (!oldProject) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const d = parsed.data;
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...d,
        startDate: d.startDate ? new Date(d.startDate) : null,
      },
    });

    await writeProjectAudit({
      userId: access.context.userId,
      projectId: project.id,
      action: 'UPDATE',
      entityId: project.id,
      oldValues: oldProject,
      newValues: project,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('[projects] Failed to update project', error);
    return NextResponse.json({ error: 'Failed to update project. Check the server log for details.' }, { status: 500 });
  }
}
