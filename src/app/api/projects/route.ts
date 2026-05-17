import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { can } from '@/lib/permissions';

const createSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  addressBn: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  postCode: z.string().optional(),
  phone: z.string().optional(),
  landSize: z.string().optional(),
  totalFloors: z.number().int().optional(),
  residentialFloors: z.number().int().optional(),
  unitsPerFloor: z.number().int().optional(),
  totalPlannedUnits: z.number().int().optional(),
  parkingUtilityNote: z.string().optional(),
  defaultServiceChargePct: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      _count: { select: { phases: true, buyers: true, units: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
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
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        ...d,
        companyId,
        startDate: d.startDate ? new Date(d.startDate) : undefined,
        expectedEndDate: d.expectedEndDate ? new Date(d.expectedEndDate) : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: (session.user as any).id,
        projectId: created.id,
        action: 'CREATE',
        entityType: 'project',
        entityId: created.id,
        newValues: created as any,
      },
    });

    return created;
  });

  return NextResponse.json(project, { status: 201 });
}
