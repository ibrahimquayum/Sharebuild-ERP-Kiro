import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { isPhaseLocked, lockedPhaseMessage } from '@/lib/accounting';
import { createCashBankTransactionFromExpense } from '@/lib/cash-bank';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

export const runtime = 'nodejs';

const MAX_VOUCHER_BYTES = 10 * 1024 * 1024;
const ALLOWED_VOUCHER_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);

const expenseRowSchema = z.object({
  expenseDate: z.string().min(1),
  phaseId: z.string().min(1),
  accountId: z.string().min(1),
  category: z.enum([
    'ROD_STEEL','CEMENT','STONE_AGGREGATE','SAND','BRICK','READYMIX_CONCRETE',
    'TIMBER_SHUTTERING','PAINT','TILES','SANITARY_FITTINGS','ELECTRICAL_MATERIAL',
    'HARDWARE','CHEMICAL','LABOUR_BILL','CONTRACTOR_BILL','SECURITY_SALARY',
    'SITE_STAFF_SALARY','WATER_BILL','ELECTRICITY_BILL','SITE_FOOD_HOSPITALITY',
    'TRANSPORT','EQUIPMENT_HIRE','SURVEY_DRAWING','LEGAL_REGISTRATION',
    'MUNICIPALITY_FEE','BANK_CHARGE','SERVICE_CHARGE','OTHER',
  ]),
  description: z.string().trim().min(1),
  supplierMode: z.enum(['EXISTING_SUPPLIER', 'LOCAL_SHOP', 'NO_SUPPLIER']).default('NO_SUPPLIER'),
  supplierId: z.string().optional(),
  localShopName: z.string().trim().optional(),
  localShopPhone: z.string().trim().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).default('CASH'),
  referenceNo: z.string().trim().optional(),
  chequeNo: z.string().trim().optional(),
  chequeDate: z.string().trim().optional(),
  chequeBankName: z.string().trim().optional(),
  chequeBranchName: z.string().trim().optional(),
  chequeMaturityDate: z.string().trim().optional(),
  billNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const bulkExpenseSchema = z.object({
  rows: z.array(expenseRowSchema).min(1).max(100),
});

async function saveVoucher(file: File, companyId: string) {
  if (!ALLOWED_VOUCHER_TYPES.has(file.type)) {
    throw new Error(`${file.name} is not a supported voucher type. Use PDF, JPG, PNG, or WebP.`);
  }
  if (file.size > MAX_VOUCHER_BYTES) {
    throw new Error(`${file.name} is too large. Maximum voucher size is 10 MB.`);
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', companyId);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${randomUUID()}${extname(file.name) || '.bin'}`;
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${companyId}/${fileName}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'expenses', action: 'create' });
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;
  const userId = access.context.userId;
  const role = access.context.legacyRole;
  const project = access.project;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const rawRows = formData.get('rows');
  if (typeof rawRows !== 'string') return NextResponse.json({ error: 'Expense rows are required.' }, { status: 400 });

  let parsedRows: unknown;
  try {
    parsedRows = JSON.parse(rawRows);
  } catch {
    return NextResponse.json({ error: 'Expense rows must be valid JSON.' }, { status: 400 });
  }

  const parsed = bulkExpenseSchema.safeParse({ rows: parsedRows });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];
    if (Number.isNaN(new Date(row.expenseDate).getTime())) {
      return NextResponse.json({ error: `Row ${index + 1}: expense date is invalid.` }, { status: 400 });
    }
    if (row.supplierMode === 'EXISTING_SUPPLIER' && !row.supplierId) {
      return NextResponse.json({ error: `Row ${index + 1}: select an existing supplier.` }, { status: 400 });
    }
    if (row.supplierMode === 'LOCAL_SHOP' && !row.localShopName) {
      return NextResponse.json({ error: `Row ${index + 1}: local shop/person name is required.` }, { status: 400 });
    }
  }

  const phaseIds = Array.from(new Set(parsed.data.rows.map((row) => row.phaseId)));
  const supplierIds = Array.from(new Set(parsed.data.rows.map((row) => row.supplierId).filter(Boolean))) as string[];
  const accountIds = Array.from(new Set(parsed.data.rows.map((row) => row.accountId)));
  const [phases, suppliers, accounts] = await Promise.all([
    prisma.phase.findMany({ where: { id: { in: phaseIds }, projectId: project.id }, select: { id: true, auditLockedAt: true } }),
    supplierIds.length > 0 ? prisma.supplier.findMany({ where: { id: { in: supplierIds }, companyId }, select: { id: true } }) : Promise.resolve([]),
    prisma.cashBankAccount.findMany({ where: { id: { in: accountIds }, companyId, isActive: true }, select: { id: true } }),
  ]);
  const validPhaseIds = new Set(phases.map((phase) => phase.id));
  const validSupplierIds = new Set(suppliers.map((supplier) => supplier.id));
  const validAccountIds = new Set(accounts.map((account) => account.id));

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];
    if (!validPhaseIds.has(row.phaseId)) return NextResponse.json({ error: `Row ${index + 1}: phase is not in this project.` }, { status: 400 });
    if (row.supplierId && !validSupplierIds.has(row.supplierId)) return NextResponse.json({ error: `Row ${index + 1}: supplier is not in this company.` }, { status: 400 });
    if (!validAccountIds.has(row.accountId)) return NextResponse.json({ error: `Row ${index + 1}: cash/bank account is not in this company.` }, { status: 400 });
    const phase = phases.find((item) => item.id === row.phaseId);
    if (phase && isPhaseLocked(phase)) return NextResponse.json({ error: `Row ${index + 1}: ${lockedPhaseMessage()}` }, { status: 423 });
  }

  const autoApprove = ['COMPANY_ADMIN', 'MANAGEMENT', 'MANAGER', 'ACCOUNTS', 'ACCOUNTANT'].includes(role);
  const expenses = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const row of parsed.data.rows) {
      const expense = await tx.expense.create({
        data: {
          phaseId: row.phaseId,
          supplierId: row.supplierMode === 'EXISTING_SUPPLIER' ? row.supplierId : undefined,
          accountId: row.accountId,
          category: row.category,
          description: row.description,
          amount: row.amount,
          paymentMethod: row.paymentMethod,
          referenceNo: row.referenceNo,
          chequeNo: row.chequeNo,
          chequeDate: row.chequeDate ? new Date(row.chequeDate) : undefined,
          chequeBankName: row.chequeBankName,
          chequeBranchName: row.chequeBranchName,
          chequeMaturityDate: row.chequeMaturityDate ? new Date(row.chequeMaturityDate) : undefined,
          supplierMode: row.supplierMode,
          localShopName: row.supplierMode === 'LOCAL_SHOP' ? row.localShopName : undefined,
          localShopPhone: row.supplierMode === 'LOCAL_SHOP' ? row.localShopPhone : undefined,
          expenseDate: new Date(row.expenseDate),
          billNo: row.billNo,
          notes: row.notes,
          status: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
          createdById: userId,
          approvedById: autoApprove ? userId : undefined,
          approvedAt: autoApprove ? new Date() : undefined,
        },
      });
      if (autoApprove) {
        await createCashBankTransactionFromExpense(tx, expense.id, userId);
      }
      created.push(expense);
    }
    return created;
  });

  const documents = [];
  for (let index = 0; index < expenses.length; index += 1) {
    const file = formData.get(`voucher-${index}`);
    if (!(file instanceof File) || file.size === 0) continue;
    const fileUrl = await saveVoucher(file, companyId);
    documents.push(await prisma.document.create({
      data: {
        projectId: project.id,
        phaseId: expenses[index].phaseId,
        expenseId: expenses[index].id,
        uploadedById: userId,
        title: `Voucher - ${expenses[index].description}`,
        category: 'expense voucher',
        scope: 'EXPENSE',
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
      },
    }));
  }

  await safeAuditLog({
    userId,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'bulk_expense',
    entityId: expenses[0]?.id,
    newValues: {
      count: expenses.length,
      totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      documentCount: documents.length,
      status: autoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
    },
    context: 'bulk expense create',
  });

  return NextResponse.json({
    count: expenses.length,
    documentCount: documents.length,
    totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
  }, { status: 201 });
}
