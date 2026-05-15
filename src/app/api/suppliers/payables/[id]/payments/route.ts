import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  amount:        z.number().positive(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).default('BANK_TRANSFER'),
  chequeNo:      z.string().optional(),
  chequeDate:    z.string().optional(),
  bankName:      z.string().optional(),
  reference:     z.string().optional(),
  paidAt:        z.string().optional(),
  notes:         z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
    include: {
      supplier: { select: { id: true, name: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!payable) return NextResponse.json({ error: 'Payable not found' }, { status: 404 });

  return NextResponse.json(payable);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId    = (session.user as any).id;

  // Verify payable belongs to company
  const payable = await prisma.supplierPayable.findFirst({
    where: { id: params.id, supplier: { companyId } },
  });
  if (!payable) return NextResponse.json({ error: 'Payable not found' }, { status: 404 });

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Prevent over-payment
  const maxAllowed = Number(payable.dueAmount);
  if (d.amount > maxAllowed) {
    return NextResponse.json(
      { error: `Payment amount (৳${d.amount}) exceeds outstanding due (৳${maxAllowed}).` },
      { status: 400 }
    );
  }

  // Create payment and update payable atomically
  const [payment] = await prisma.$transaction([
    prisma.supplierPayment.create({
      data: {
        payableId:     params.id,
        amount:        d.amount,
        paymentMethod: d.paymentMethod,
        chequeNo:      d.chequeNo,
        chequeDate:    d.chequeDate ? new Date(d.chequeDate) : undefined,
        bankName:      d.bankName,
        reference:     d.reference,
        paidAt:        d.paidAt ? new Date(d.paidAt) : new Date(),
        notes:         d.notes,
      },
    }),
    prisma.supplierPayable.update({
      where: { id: params.id },
      data: {
        paidAmount: { increment: d.amount },
        dueAmount:  { decrement: d.amount },
        status: (() => {
          const newPaid = Number(payable.paidAmount) + d.amount;
          const total   = Number(payable.totalAmount);
          if (newPaid >= total) return 'PAID';
          if (newPaid > 0)      return 'PARTIALLY_PAID';
          return 'UNPAID';
        })(),
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId,
      action:     'CREATE',
      entityType: 'supplier_payment',
      entityId:   payment.id,
      newValues:  payment as any,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
