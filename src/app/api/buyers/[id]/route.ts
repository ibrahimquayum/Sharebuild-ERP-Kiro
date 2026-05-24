import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiAccessError, assertApiCompanyPermission } from '@/lib/access-control';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameBn: z.string().optional(),
  fatherName: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  nidNo: z.string().optional(),
  address: z.string().optional(),
  addressBn: z.string().optional(),
  status: z.enum(['PROSPECT','ACTIVE','DEFAULTER','COMPLETED','CANCELLED']).optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyPermission('buyers', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;
  const restrictedProjectIds = access.context.isCompanyWide ? undefined : access.context.activeProjectIds;
  const projectScopeFilter = restrictedProjectIds
    ? {
        OR: [
          { projectLinks: { some: { projectId: { in: restrictedProjectIds } } } },
          { unitAllocations: { some: { unit: { projectId: { in: restrictedProjectIds } } } } },
          { collections: { some: { phase: { projectId: { in: restrictedProjectIds } } } } },
          { demands: { some: { OR: [{ phase: { projectId: { in: restrictedProjectIds } } }, { unit: { projectId: { in: restrictedProjectIds } } }] } } },
        ],
      }
    : {};

  const buyer = await prisma.buyer.findFirst({
    where: { id: params.id, companyId, ...projectScopeFilter },
    include: {
      collections: {
        where: restrictedProjectIds ? { phase: { projectId: { in: restrictedProjectIds } } } : undefined,
        include: { phase: { select: { id: true, name: true } } },
        orderBy: { receivedDate: 'desc' },
      },
      demands: {
        where: restrictedProjectIds
          ? { OR: [{ phase: { projectId: { in: restrictedProjectIds } } }, { unit: { projectId: { in: restrictedProjectIds } } }] }
          : undefined,
        include: { phase: { select: { id: true, name: true } }, collections: { select: { amount: true } } },
      },
      projectLinks: {
        where: restrictedProjectIds ? { projectId: { in: restrictedProjectIds } } : undefined,
        include: { project: { select: { id: true, name: true } } },
      },
      unitAllocations: {
        where: restrictedProjectIds ? { unit: { projectId: { in: restrictedProjectIds } } } : undefined,
        include: { unit: true },
      },
    },
  });

  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  return NextResponse.json(buyer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyPermission('buyers', 'editDraft');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;
  const restrictedProjectIds = access.context.isCompanyWide ? undefined : access.context.activeProjectIds;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.buyer.findFirst({
    where: {
      id: params.id,
      companyId,
      ...(restrictedProjectIds
        ? {
            OR: [
              { projectLinks: { some: { projectId: { in: restrictedProjectIds } } } },
              { unitAllocations: { some: { unit: { projectId: { in: restrictedProjectIds } } } } },
              { collections: { some: { phase: { projectId: { in: restrictedProjectIds } } } } },
              { demands: { some: { OR: [{ phase: { projectId: { in: restrictedProjectIds } } }, { unit: { projectId: { in: restrictedProjectIds } } }] } } },
            ],
          }
        : {}),
    },
  });
  if (!existing) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });

  const updated = await prisma.buyer.update({
    where: { id: params.id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });

  return NextResponse.json(updated);
}
