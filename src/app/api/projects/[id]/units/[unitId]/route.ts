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
  unitType: z.enum(['FLAT', 'COMMERCIAL', 'SHOP', 'PARKING', 'COMMON', 'UTILITY', 'ROOF', 'LAND_SHARE']),
  status: z.enum(['AVAILABLE', 'BOOKED', 'SOLD', 'REGISTERED', 'HANDED_OVER', 'DISPUTED']),
  sizesqft: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'units', 'editDraft')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const oldUnit = await prisma.unit.findFirst({
    where: { id: params.unitId, project: { id: params.id, companyId } },
  });
  if (!oldUnit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

  const parsed = unitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const unit = await prisma.unit.update({
    where: { id: params.unitId },
    data: parsed.data,
  });

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: params.id,
    action: 'UPDATE',
    entityType: 'unit',
    entityId: unit.id,
    oldValues: oldUnit,
    newValues: unit,
    context: 'unit update',
  });

  return NextResponse.json(unit);
}
