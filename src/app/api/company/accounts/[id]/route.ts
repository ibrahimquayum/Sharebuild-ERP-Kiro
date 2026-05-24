import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { assertApiCompanyWidePermission } from '@/lib/access-control';

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
  const access = await assertApiCompanyWidePermission('accounts', 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;

  const account = await prisma.cashBankAccount.findFirst({
    where: { id: params.id, companyId },
  });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  return NextResponse.json(account);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyWidePermission('accounts', 'editDraft');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;
  const userId = access.context.userId;

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
