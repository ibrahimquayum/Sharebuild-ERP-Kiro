import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const search = searchParams.get('q');

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

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
    userId: (session.user as any).id,
    projectId: d.projectId,
    action: 'CREATE',
    entityType: 'buyer',
    entityId: buyer.id,
    newValues: buyer,
    context: 'buyer create',
  });

  return NextResponse.json(buyer, { status: 201 });
}
