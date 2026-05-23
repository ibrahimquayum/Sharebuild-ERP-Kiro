import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

const accountPatchSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['CASH', 'BANK', 'MOBILE_BANKING', 'CHEQUE_CLEARING', 'OTHER']),
  bankName: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  accountHolderName: z.string().trim().optional(),
  mobileProvider: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'OTHER']).optional().nullable(),
  openingBalance: z.number().min(0),
  currency: z.string().trim().default('BDT'),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  notes: z.string().trim().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'view')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const account = await prisma.cashBankAccount.findFirst({
    where: { id: params.id, companyId },
  });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  return NextResponse.json(account);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'editDraft')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const existing = await prisma.cashBankAccount.findFirst({
    where: { id: params.id, companyId },
  });
  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const parsed = accountPatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const account = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.cashBankAccount.updateMany({
        where: { companyId, isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }
    return tx.cashBankAccount.update({
      where: { id: params.id },
      data,
    });
  });

  await safeAuditLog({
    userId,
    action: 'UPDATE',
    entityType: 'cash_bank_account',
    entityId: account.id,
    oldValues: existing,
    newValues: account,
    context: 'cash bank account update',
  });

  return NextResponse.json(account);
}
