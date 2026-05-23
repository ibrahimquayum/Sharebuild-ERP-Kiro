import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';
import { assertAccountBelongsToCompany, createAccountTransferEntries } from '@/lib/cash-bank';

const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive(),
  transferDate: z.string(),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'view')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const transfers = await prisma.accountTransfer.findMany({
    where: { companyId },
    include: {
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
    },
    orderBy: [{ transferDate: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(transfers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const parsed = transferSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.fromAccountId === data.toAccountId) {
    return NextResponse.json({ error: 'Source and destination accounts must be different.' }, { status: 400 });
  }

  await assertAccountBelongsToCompany(data.fromAccountId, companyId);
  await assertAccountBelongsToCompany(data.toAccountId, companyId);

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.accountTransfer.create({
      data: {
        companyId,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        transferDate: new Date(data.transferDate),
        referenceNo: data.referenceNo || undefined,
        notes: data.notes || undefined,
        status: 'POSTED',
        createdById: userId,
      },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    });

    await createAccountTransferEntries(tx, created.id, userId);
    return created;
  });

  await safeAuditLog({
    userId,
    action: 'CREATE',
    entityType: 'account_transfer',
    entityId: transfer.id,
    newValues: transfer,
    context: 'account transfer create',
  });

  return NextResponse.json(transfer, { status: 201 });
}
