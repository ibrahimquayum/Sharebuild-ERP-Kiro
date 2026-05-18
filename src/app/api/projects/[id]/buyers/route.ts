import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

const assignmentSchema = z.object({
  buyerId: z.string().min(1),
  unitId: z.string().min(1),
  sharePercent: z.number().min(0).max(100).default(100),
  relationship: z.enum(['OWNER', 'CO_OWNER', 'PAYER_ONLY']).default('OWNER'),
  isPayer: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, 'buyers', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const parsed = assignmentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const [project, buyer, unit] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } }),
    prisma.buyer.findFirst({ where: { id: parsed.data.buyerId, companyId }, select: { id: true } }),
    prisma.unit.findFirst({ where: { id: parsed.data.unitId, projectId: params.id }, select: { id: true } }),
  ]);

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!buyer) return NextResponse.json({ error: 'Buyer/contact not found' }, { status: 404 });
  if (!unit) return NextResponse.json({ error: 'Unit not found in this project' }, { status: 404 });
  if (parsed.data.relationship !== 'PAYER_ONLY' && parsed.data.sharePercent <= 0) {
    return NextResponse.json({ error: 'Ownership share must be greater than 0 for owners and co-owners.' }, { status: 400 });
  }

  const existingAllocations = await prisma.unitBuyer.findMany({
    where: { unitId: unit.id, NOT: { buyerId: buyer.id } },
    select: { sharePercent: true, relationship: true },
  });
  const existingOwnerShare = existingAllocations
    .filter((allocation) => allocation.relationship !== 'PAYER_ONLY')
    .reduce((sum, allocation) => sum + Number(allocation.sharePercent), 0);
  const requestedOwnerShare = parsed.data.relationship === 'PAYER_ONLY' ? 0 : parsed.data.sharePercent;
  const totalOwnerShare = existingOwnerShare + requestedOwnerShare;

  if (totalOwnerShare > 100.0001) {
    return NextResponse.json({
      error: `Ownership shares for this unit cannot exceed 100%. Existing owner share is ${existingOwnerShare}%.`,
    }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.projectBuyer.upsert({
      where: { projectId_buyerId: { projectId: project.id, buyerId: buyer.id } },
      update: {},
      create: { projectId: project.id, buyerId: buyer.id },
    });

    await tx.unitBuyer.upsert({
      where: { unitId_buyerId: { unitId: unit.id, buyerId: buyer.id } },
      update: {
        sharePercent: parsed.data.sharePercent,
        relationship: parsed.data.relationship ?? 'OWNER',
        isPayer: parsed.data.isPayer,
      },
      create: {
        unitId: unit.id,
        buyerId: buyer.id,
        sharePercent: parsed.data.sharePercent,
        relationship: parsed.data.relationship,
        isPayer: parsed.data.isPayer,
        isPrimary: parsed.data.relationship !== 'PAYER_ONLY' && totalOwnerShare >= 100 && requestedOwnerShare >= existingOwnerShare,
      },
    });

    await tx.unit.update({
      where: { id: unit.id },
      data: { status: parsed.data.relationship === 'PAYER_ONLY' || totalOwnerShare < 100 ? 'BOOKED' : 'SOLD' },
    });

    return membership;
  });

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'project_buyer',
    entityId: result.id,
    newValues: { ...parsed.data, totalOwnerShare },
    context: 'buyer ownership assignment',
  });

  return NextResponse.json({ membershipId: result.id }, { status: 201 });
}
