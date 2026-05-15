import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  addressBn: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  postCode: z.string().optional(),
  phone: z.string().optional(),
  totalFloors: z.number().int().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      _count: { select: { phases: true, buyers: true, units: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...d,
      companyId,
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      expectedEndDate: d.expectedEndDate ? new Date(d.expectedEndDate) : undefined,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
