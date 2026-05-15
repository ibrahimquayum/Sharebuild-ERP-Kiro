import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  supplierId:  z.string().min(1),
  billNo:      z.string().optional(),
  billDate:    z.string(),          // ISO date string
  totalAmount: z.number().positive(),
  dueDate:     z.string().optional(),
  notes:       z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplierId');

  const payables = await prisma.supplierPayable.findMany({
    where: {
      supplier: { companyId },
      ...(supplierId ? { supplierId } : {}),
    },
    include: {
      supplier:  { select: { id: true, name: true } },
      payments:  { select: { id: true, amount: true, paidAt: true, paymentMethod: true } },
      _count:    { select: { payments: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  return NextResponse.json(payables);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId    = (session.user as any).id;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify supplier belongs to this company
  const supplier = await prisma.supplier.findFirst({
    where: { id: d.supplierId, companyId },
  });
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const payable = await prisma.supplierPayable.create({
    data: {
      supplierId:  d.supplierId,
      billNo:      d.billNo,
      billDate:    new Date(d.billDate),
      totalAmount: d.totalAmount,
      paidAmount:  0,
      dueAmount:   d.totalAmount,   // starts fully unpaid
      dueDate:     d.dueDate ? new Date(d.dueDate) : undefined,
      status:      'UNPAID',
      notes:       d.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action:     'CREATE',
      entityType: 'supplier_payable',
      entityId:   payable.id,
      newValues:  payable as any,
    },
  });

  return NextResponse.json(payable, { status: 201 });
}
