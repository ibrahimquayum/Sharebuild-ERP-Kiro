import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';

const createSchema = z.object({
  phaseId: z.string(),
  buyerId: z.string(),
  demandId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).default('CASH'),
  transactionType: z.enum(['COLLECTION','REFUND','ADJUSTMENT']).default('COLLECTION'),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  reference: z.string().optional(),
  receiptNo: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const phaseId = searchParams.get('phaseId');
  const buyerId = searchParams.get('buyerId');

  const collections = await prisma.collection.findMany({
    where: {
      phase: { project: { companyId } },
      ...(phaseId ? { phaseId } : {}),
      ...(buyerId ? { buyerId } : {}),
    },
    include: {
      buyer: { select: { id: true, name: true, nameBn: true, phone: true } },
      phase: { select: { id: true, name: true } },
    },
    orderBy: { receivedDate: 'desc' },
  });

  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify phase belongs to company
  const phase = await prisma.phase.findFirst({ where: { id: d.phaseId, project: { companyId } } });
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });

  // Verify buyer belongs to company
  const buyer = await prisma.buyer.findFirst({ where: { id: d.buyerId, companyId } });
  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });

  const collection = await prisma.collection.create({
    data: {
      phaseId: d.phaseId,
      buyerId: d.buyerId,
      demandId: d.demandId,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      transactionType: d.transactionType,
      chequeNo: d.chequeNo,
      chequeDate: d.chequeDate ? new Date(d.chequeDate) : undefined,
      bankName: d.bankName,
      reference: d.reference,
      receiptNo: d.receiptNo,
      receivedDate: d.receivedDate ? new Date(d.receivedDate) : new Date(),
      notes: d.notes,
    },
  });

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: phase.projectId,
    action: 'CREATE',
    entityType: 'collection',
    entityId: collection.id,
    newValues: collection,
    context: 'collection create',
  });

  return NextResponse.json(collection, { status: 201 });
}
