import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const unitSchema = z.object({
  unitNo: z.string().min(1, 'Unit number is required.'),
  floor: z.number().int().optional(),
  unitType: z.enum(['FLAT', 'COMMERCIAL', 'SHOP', 'PARKING', 'COMMON', 'UTILITY', 'ROOF', 'LAND_SHARE']).default('FLAT'),
  status: z.enum(['AVAILABLE', 'BOOKED', 'SOLD', 'REGISTERED', 'HANDED_OVER', 'DISPUTED']).default('AVAILABLE'),
  sizesqft: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'units', action: 'create' });
  if (!access.ok) return apiAccessError(access);

  const parsed = unitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const unit = await prisma.unit.create({
    data: {
      projectId: access.project.id,
      ...parsed.data,
    },
  });

  await safeAuditLog({
    userId: access.context.userId,
    projectId: access.project.id,
    action: 'CREATE',
    entityType: 'unit',
    entityId: unit.id,
    newValues: unit,
    context: 'unit create',
  });

  return NextResponse.json(unit, { status: 201 });
}
