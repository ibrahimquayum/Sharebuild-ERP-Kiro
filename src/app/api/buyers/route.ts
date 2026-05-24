import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyWidePermission, assertApiProjectPermission } from '@/lib/access-control';

const createSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  fatherName: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  nidNo: z.string().optional(),
  address: z.string().optional(),
  addressBn: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const search = searchParams.get('q');
  const access = projectId
    ? await assertApiProjectPermission({ projectId, module: 'buyers', action: 'view' })
    : await assertApiCompanyWidePermission('buyers', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const buyers = await prisma.buyer.findMany({
    where: {
      companyId,
      ...(projectId ? { projectLinks: { some: { projectId } } } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { nidNo: { contains: search } },
        ],
      } : {}),
    },
    include: {
      projectLinks: { include: { project: { select: { name: true } } } },
      _count: { select: { collections: true, demands: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(buyers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const access = d.projectId
    ? await assertApiProjectPermission({ projectId: d.projectId, module: 'buyers', action: 'create' })
    : await assertApiCompanyWidePermission('buyers', 'create');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const buyer = await prisma.buyer.create({
    data: {
      companyId,
      name: d.name,
      nameBn: d.nameBn,
      fatherName: d.fatherName,
      phone: d.phone,
      phone2: d.phone2,
      email: d.email || undefined,
      nidNo: d.nidNo,
      address: d.address,
      addressBn: d.addressBn,
      notes: d.notes,
      ...(d.projectId ? {
        projectLinks: {
          create: { projectId: d.projectId },
        },
      } : {}),
    },
  });

  await safeAuditLog({
    userId: access.context.userId,
    projectId: d.projectId,
    action: 'CREATE',
    entityType: 'buyer',
    entityId: buyer.id,
    newValues: buyer,
    context: 'buyer create',
  });

  return NextResponse.json(buyer, { status: 201 });
}
