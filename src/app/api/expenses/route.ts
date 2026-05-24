import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { isPhaseLocked, lockedPhaseMessage } from '@/lib/accounting';
import { assertAccountBelongsToCompany, createCashBankTransactionFromExpense } from '@/lib/cash-bank';
import { apiAccessError, assertApiCompanyWidePermission, assertApiPhasePermission } from '@/lib/access-control';

const createSchema = z.object({
  phaseId: z.string(),
  supplierId: z.string().optional(),
  accountId: z.string().min(1),
  category: z.enum([
    'ROD_STEEL','CEMENT','STONE_AGGREGATE','SAND','BRICK','READYMIX_CONCRETE',
    'TIMBER_SHUTTERING','PAINT','TILES','SANITARY_FITTINGS','ELECTRICAL_MATERIAL',
    'HARDWARE','CHEMICAL','LABOUR_BILL','CONTRACTOR_BILL','SECURITY_SALARY',
    'SITE_STAFF_SALARY','WATER_BILL','ELECTRICITY_BILL','SITE_FOOD_HOSPITALITY',
    'TRANSPORT','EQUIPMENT_HIRE','SURVEY_DRAWING','LEGAL_REGISTRATION',
    'MUNICIPALITY_FEE','BANK_CHARGE','SERVICE_CHARGE','OTHER',
  ]),
  description: z.string().min(1),
  descriptionBn: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).default('CASH'),
  referenceNo: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  chequeBankName: z.string().optional(),
  chequeBranchName: z.string().optional(),
  chequeMaturityDate: z.string().optional(),
  supplierMode: z.enum(['EXISTING_SUPPLIER','LOCAL_SHOP','NO_SUPPLIER']).default('NO_SUPPLIER'),
  localShopName: z.string().optional(),
  localShopPhone: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  expenseDate: z.string().optional(),
  billNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phaseId = searchParams.get('phaseId');
  const status = searchParams.get('status');
  const access = phaseId
    ? await assertApiPhasePermission({ phaseId, module: 'expenses', action: 'view' })
    : await assertApiCompanyWidePermission('expenses', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const expenses = await prisma.expense.findMany({
    where: {
      phase: { project: { companyId } },
      ...(phaseId ? { phaseId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      phase: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { expenseDate: 'desc' },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const access = await assertApiPhasePermission({ phaseId: d.phaseId, module: 'expenses', action: 'create' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;
  const userId = access.context.userId;
  const userRole = access.context.legacyRole;

  const phase = await prisma.phase.findFirst({ where: { id: d.phaseId, project: { companyId } } });
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  if (isPhaseLocked(phase)) return NextResponse.json({ error: lockedPhaseMessage() }, { status: 423 });
  await assertAccountBelongsToCompany(d.accountId, companyId);
  if (d.supplierMode === 'EXISTING_SUPPLIER' && !d.supplierId) {
    return NextResponse.json({ error: 'Select a supplier or switch supplier type.' }, { status: 400 });
  }
  if (d.supplierMode === 'LOCAL_SHOP' && !d.localShopName?.trim()) {
    return NextResponse.json({ error: 'Local shop/person name is required for local shop expenses.' }, { status: 400 });
  }

  // Auto-approve for admins/managers
  const autoApprove = ['COMPANY_ADMIN', 'MANAGER'].includes(userRole);

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        phaseId: d.phaseId,
        supplierId: d.supplierId,
        accountId: d.accountId,
        category: d.category,
        description: d.description,
        descriptionBn: d.descriptionBn,
        amount: d.amount,
        paymentMethod: d.paymentMethod,
        referenceNo: d.referenceNo,
        chequeNo: d.chequeNo,
        chequeDate: d.chequeDate ? new Date(d.chequeDate) : undefined,
        chequeBankName: d.chequeBankName,
        chequeBranchName: d.chequeBranchName,
        chequeMaturityDate: d.chequeMaturityDate ? new Date(d.chequeMaturityDate) : undefined,
        supplierMode: d.supplierMode,
        localShopName: d.localShopName,
        localShopPhone: d.localShopPhone,
        quantity: d.quantity,
        unit: d.unit,
        unitPrice: d.unitPrice,
        expenseDate: d.expenseDate ? new Date(d.expenseDate) : new Date(),
        billNo: d.billNo,
        notes: d.notes,
        status: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
        createdById: userId,
        approvedById: autoApprove ? userId : undefined,
        approvedAt: autoApprove ? new Date() : undefined,
      },
    });
    if (autoApprove) {
      await createCashBankTransactionFromExpense(tx, created.id, userId);
    }
    return created;
  });

  await safeAuditLog({
    userId,
    projectId: phase.projectId,
    action: 'CREATE',
    entityType: 'expense',
    entityId: expense.id,
    newValues: expense,
    context: 'expense create',
  });

  return NextResponse.json(expense, { status: 201 });
}
