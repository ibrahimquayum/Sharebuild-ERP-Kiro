import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const unitSchema = z.object({
  unitNo: z.string().min(1, 'Unit number is required.'),
  floor: z.number().int().optional(),
  unitType: z.enum(['FLAT', 'COMMERCIAL', 'SHOP', 'PARKING', 'COMMON', 'UTILITY', 'ROOF', 'LAND_SHARE']),
  status: z.enum(['AVAILABLE', 'BOOKED', 'SOLD', 'REGISTERED', 'HANDED_OVER', 'DISPUTED']),
  sizesqft: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'units', action: 'editDraft' });
  if (!access.ok) return apiAccessError(access);
  const oldUnit = await prisma.unit.findFirst({
    where: { id: params.unitId, project: { id: params.id, companyId: access.context.companyId } },
  });
  if (!oldUnit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

  const parsed = unitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const unit = await prisma.unit.update({
    where: { id: params.unitId },
    data: parsed.data,
  });

  await safeAuditLog({
    userId: access.context.userId,
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
