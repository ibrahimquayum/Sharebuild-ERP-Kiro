import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { can } from '@/lib/permissions';
import { apiAccessError, assertApiCompanyPermission, assertApiCompanyWidePermission } from '@/lib/access-control';

const optionalText = z.preprocess((value) => value === null ? undefined : value, z.string().trim().optional());
const optionalDate = z.preprocess((value) => value === null ? undefined : value, z.string().trim().optional())
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Invalid date.');

const createSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  nameBn: optionalText,
  code: optionalText,
  address: optionalText,
  addressBn: optionalText,
  area: optionalText,
  city: optionalText,
  postCode: optionalText,
  phone: optionalText,
  landSize: optionalText,
  totalFloors: z.number().int().optional(),
  residentialFloors: z.number().int().optional(),
  unitsPerFloor: z.number().int().optional(),
  totalPlannedUnits: z.number().int().optional(),
  parkingUtilityNote: optionalText,
  defaultServiceChargePct: z.number().optional(),
  notes: optionalText,
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: optionalDate,
  expectedEndDate: optionalDate,
  description: optionalText,
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

export async function GET(_req: NextRequest) {
  const access = await assertApiCompanyPermission('projects', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const projects = await prisma.project.findMany({
    where: {
      companyId,
      ...(access.context.isCompanyWide ? {} : { id: { in: access.context.activeProjectIds } }),
    },
    include: {
      _count: { select: { phases: true, buyers: true, units: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  try {
    const access = await assertApiCompanyWidePermission('projects', 'create');
    if (!access.ok) return apiAccessError(access);
    const companyId = access.context.companyId;
    const role = access.context.legacyRole;
    if (!companyId) return NextResponse.json({ error: 'Your user is not assigned to a company.' }, { status: 400 });
    if (!can(role, 'projects', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const d = parsed.data;
    const project = await prisma.project.create({
      data: {
        ...d,
        companyId,
        startDate: d.startDate ? new Date(d.startDate) : undefined,
        expectedEndDate: d.expectedEndDate ? new Date(d.expectedEndDate) : undefined,
      },
    });

    await writeProjectAudit({
      userId: access.context.userId,
      projectId: project.id,
      action: 'CREATE',
      entityId: project.id,
      newValues: project,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[projects] Failed to create project', error);
    return NextResponse.json({ error: 'Failed to create project. Check the server log for details.' }, { status: 500 });
  }
}
