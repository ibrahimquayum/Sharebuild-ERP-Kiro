import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { can } from '@/lib/permissions';

const updateSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  landSize: z.string().optional(),
  totalFloors: z.number().int().optional(),
  residentialFloors: z.number().int().optional(),
  unitsPerFloor: z.number().int().optional(),
  totalPlannedUnits: z.number().int().optional(),
  parkingUtilityNote: z.string().optional(),
  defaultServiceChargePct: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  startDate: z.string().optional(),
  description: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'projects', 'editDraft') && !can(role, 'settings', 'editDraft')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  const oldProject = await prisma.project.findFirst({ where: { id: params.id, companyId } });
  if (!oldProject) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...d,
      startDate: d.startDate ? new Date(d.startDate) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      projectId: project.id,
      action: 'UPDATE',
      entityType: 'project',
      entityId: project.id,
      oldValues: oldProject as any,
      newValues: project as any,
    },
  });

  return NextResponse.json(project);
}
