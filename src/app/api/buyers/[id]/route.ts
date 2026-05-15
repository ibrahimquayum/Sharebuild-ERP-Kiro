import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const buyer = await prisma.buyer.findFirst({
    where: { id: params.id, companyId },
    include: {
      collections: {
        include: { phase: { select: { id: true, name: true } } },
        orderBy: { receivedDate: 'desc' },
      },
      demands: {
        include: { phase: { select: { id: true, name: true } }, collections: { select: { amount: true } } },
      },
      projectLinks: { include: { project: { select: { id: true, name: true } } } },
      unitAllocations: { include: { unit: true } },
    },
  });

  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  return NextResponse.json(buyer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.buyer.findFirst({ where: { id: params.id, companyId } });
  if (!existing) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });

  const updated = await prisma.buyer.update({
    where: { id: params.id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });

  return NextResponse.json(updated);
}
