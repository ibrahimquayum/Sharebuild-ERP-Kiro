import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

const unitSchema = z.object({
  unitNo: z.string().min(1, 'Unit number is required.'),
  floor: z.number().int().optional(),
  unitType: z.enum(['FLAT', 'COMMERCIAL', 'SHOP', 'PARKING', 'COMMON', 'UTILITY', 'ROOF', 'LAND_SHARE']).default('FLAT'),
  status: z.enum(['AVAILABLE', 'BOOKED', 'SOLD', 'REGISTERED', 'HANDED_OVER', 'DISPUTED']).default('AVAILABLE'),
  sizesqft: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'units', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const parsed = unitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const unit = await prisma.unit.create({
    data: {
      projectId: project.id,
      ...parsed.data,
    },
  });

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'unit',
    entityId: unit.id,
    newValues: unit,
    context: 'unit create',
  });

  return NextResponse.json(unit, { status: 201 });
}
