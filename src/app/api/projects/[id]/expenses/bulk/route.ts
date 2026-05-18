import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { can } from '@/lib/permissions';

export const runtime = 'nodejs';

const MAX_VOUCHER_BYTES = 10 * 1024 * 1024;
const ALLOWED_VOUCHER_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);

const expenseRowSchema = z.object({
  expenseDate: z.string().min(1),
  phaseId: z.string().min(1),
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (!can(role, 'expenses', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

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
  const [phases, suppliers] = await Promise.all([
    prisma.phase.findMany({ where: { id: { in: phaseIds }, projectId: project.id }, select: { id: true } }),
    supplierIds.length > 0 ? prisma.supplier.findMany({ where: { id: { in: supplierIds }, companyId }, select: { id: true } }) : Promise.resolve([]),
  ]);
  const validPhaseIds = new Set(phases.map((phase) => phase.id));
  const validSupplierIds = new Set(suppliers.map((supplier) => supplier.id));

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];
    if (!validPhaseIds.has(row.phaseId)) return NextResponse.json({ error: `Row ${index + 1}: phase is not in this project.` }, { status: 400 });
    if (row.supplierId && !validSupplierIds.has(row.supplierId)) return NextResponse.json({ error: `Row ${index + 1}: supplier is not in this company.` }, { status: 400 });
  }

  const autoApprove = ['COMPANY_ADMIN', 'MANAGEMENT', 'MANAGER', 'ACCOUNTS', 'ACCOUNTANT'].includes(role);
  const expenses = await prisma.$transaction(parsed.data.rows.map((row) => prisma.expense.create({
    data: {
      phaseId: row.phaseId,
      supplierId: row.supplierMode === 'EXISTING_SUPPLIER' ? row.supplierId : undefined,
      category: row.category,
      description: row.description,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
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
  })));

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
