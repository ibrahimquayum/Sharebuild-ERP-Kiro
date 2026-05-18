import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';

const createSchema = z.object({
  phaseId: z.string(),
  supplierId: z.string().optional(),
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
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  expenseDate: z.string().optional(),
  billNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const phaseId = searchParams.get('phaseId');
  const status = searchParams.get('status');

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const phase = await prisma.phase.findFirst({ where: { id: d.phaseId, project: { companyId } } });
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 });

  // Auto-approve for admins/managers
  const autoApprove = ['COMPANY_ADMIN', 'MANAGER'].includes(userRole);

  const expense = await prisma.expense.create({
    data: {
      phaseId: d.phaseId,
      supplierId: d.supplierId,
      category: d.category,
      description: d.description,
      descriptionBn: d.descriptionBn,
      amount: d.amount,
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
