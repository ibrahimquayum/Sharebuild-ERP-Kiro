import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiAccessError, assertApiPhasePermission } from '@/lib/access-control';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameBn: z.string().optional(),
  status: z.enum(['DRAFT','ACTIVE','APPROVED','INCLUDED_IN_SUMMARY','EXCLUDED_FROM_SUMMARY','CANCELLED','DUPLICATE']).optional(),
  workDesc: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiPhasePermission({ phaseId: params.id, module: 'phases', action: 'view' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const phase = await prisma.phase.findFirst({
    where: { id: params.id, project: { companyId } },
    include: {
      project: { select: { id: true, name: true } },
      collections: { include: { buyer: { select: { id: true, name: true } } }, orderBy: { receivedDate: 'desc' } },
      expenses: { orderBy: { expenseDate: 'desc' } },
      _count: { select: { collections: true, expenses: true } },
    },
  });

  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  return NextResponse.json(phase);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiPhasePermission({ phaseId: params.id, module: 'phases', action: 'editDraft' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.phase.findFirst({ where: { id: params.id, project: { companyId } } });
  if (!existing) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });

  const d = parsed.data;
  const updated = await prisma.phase.update({
    where: { id: params.id },
    data: {
      ...d,
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      endDate: d.endDate ? new Date(d.endDate) : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiPhasePermission({ phaseId: params.id, module: 'phases', action: 'deleteDraft' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const existing = await prisma.phase.findFirst({ where: { id: params.id, project: { companyId } } });
  if (!existing) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });

  await prisma.phase.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
