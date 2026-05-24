import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const bulkUnitSchema = z.object({
  startFloor: z.number().int().min(-5).default(1),
  floorCount: z.number().int().min(1).max(100),
  unitsPerFloor: z.number().int().min(1).max(50),
  namingPattern: z.enum(['FLOOR_UNIT', 'LETTER_UNIT']).default('FLOOR_UNIT'),
  prefix: z.string().trim().optional(),
  defaultSize: z.number().positive().optional(),
  unitType: z.enum(['FLAT', 'COMMERCIAL', 'SHOP', 'PARKING', 'COMMON', 'UTILITY', 'ROOF', 'LAND_SHARE']).default('FLAT'),
  status: z.enum(['AVAILABLE', 'BOOKED', 'SOLD', 'REGISTERED', 'HANDED_OVER', 'DISPUTED']).default('AVAILABLE'),
  notes: z.string().trim().optional(),
});

function letterFor(index: number) {
  let value = index;
  let label = '';
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  }
  return label;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'units', action: 'create' });
  if (!access.ok) return apiAccessError(access);

  const parsed = bulkUnitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data = parsed.data;

  const units = [];
  for (let floorIndex = 0; floorIndex < data.floorCount; floorIndex += 1) {
    const floor = data.startFloor + floorIndex;
    for (let unitIndex = 1; unitIndex <= data.unitsPerFloor; unitIndex += 1) {
      const unitNo = data.namingPattern === 'LETTER_UNIT'
        ? `${data.prefix ?? ''}${letterFor(floorIndex)}${unitIndex}`
        : `${data.prefix ?? ''}${floor}-${unitIndex}`;

      units.push({
        projectId: access.project.id,
        floor,
        unitNo,
        unitType: data.unitType,
        status: data.status,
        sizesqft: data.defaultSize,
        notes: data.notes,
      });
    }
  }

  const requestedUnitNos = units.map((unit) => unit.unitNo);
  const duplicateInRequest = requestedUnitNos.find((unitNo, index) => requestedUnitNos.indexOf(unitNo) !== index);
  if (duplicateInRequest) {
    return NextResponse.json({ error: `Duplicate generated unit number: ${duplicateInRequest}` }, { status: 400 });
  }

  const existing = await prisma.unit.findMany({
    where: { projectId: access.project.id, unitNo: { in: requestedUnitNos } },
    select: { unitNo: true },
  });
  if (existing.length > 0) {
    return NextResponse.json({ error: `These units already exist: ${existing.map((unit) => unit.unitNo).join(', ')}` }, { status: 400 });
  }

  await prisma.unit.createMany({ data: units });

  await safeAuditLog({
    userId: access.context.userId,
    projectId: access.project.id,
    action: 'CREATE',
    entityType: 'unit',
    newValues: { count: units.length, ...data },
    context: 'bulk unit create',
  });

  return NextResponse.json({ count: units.length }, { status: 201 });
}
