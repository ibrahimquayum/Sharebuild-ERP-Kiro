import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { assertApiCompanyWidePermission } from '@/lib/access-control';

const accountSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['CASH', 'BANK', 'MOBILE_BANKING', 'CHEQUE_CLEARING', 'OTHER']),
  bankName: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  accountHolderName: z.string().trim().optional(),
  mobileProvider: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'OTHER']).optional(),
  openingBalance: z.number().min(0).default(0),
  currency: z.string().trim().default('BDT'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().trim().optional(),
});

export async function GET() {
  const access = await assertApiCompanyWidePermission('accounts', 'view');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;

  const accounts = await prisma.cashBankAccount.findMany({
    where: { companyId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const access = await assertApiCompanyWidePermission('accounts', 'create');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const companyId = access.context.companyId;
  const userId = access.context.userId;

  const parsed = accountSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const account = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.cashBankAccount.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.cashBankAccount.create({
      data: {
        companyId,
        ...data,
      },
    });
  });

  await safeAuditLog({
    userId,
    action: 'CREATE',
    entityType: 'cash_bank_account',
    entityId: account.id,
    newValues: account,
    context: 'cash bank account create',
  });

  return NextResponse.json(account, { status: 201 });
}
