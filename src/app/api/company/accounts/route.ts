import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'view')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const accounts = await prisma.cashBankAccount.findMany({
    where: { companyId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'accounts', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

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
