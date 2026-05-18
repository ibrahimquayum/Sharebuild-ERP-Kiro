import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';

const createSchema = z.object({
  supplierId:  z.string().min(1),
  projectId:   z.string().min(1),          // required — bill must belong to a project
  phaseId:     z.string().optional(),       // optional — may be project-general
  billNo:      z.string().optional(),
  billDate:    z.string(),
  totalAmount: z.number().positive(),
  dueDate:     z.string().optional(),
  notes:       z.string().optional(),
  paidAmount:  z.number().min(0).optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    category: z.enum([
      'ROD_STEEL','CEMENT','STONE_AGGREGATE','SAND','BRICK','READYMIX_CONCRETE',
      'TIMBER_SHUTTERING','PAINT','TILES','SANITARY_FITTINGS','ELECTRICAL_MATERIAL',
      'HARDWARE','CHEMICAL','LABOUR_BILL','CONTRACTOR_BILL','SECURITY_SALARY',
      'SITE_STAFF_SALARY','WATER_BILL','ELECTRICITY_BILL','SITE_FOOD_HOSPITALITY',
      'TRANSPORT','EQUIPMENT_HIRE','SURVEY_DRAWING','LEGAL_REGISTRATION',
      'MUNICIPALITY_FEE','BANK_CHARGE','SERVICE_CHARGE','OTHER',
    ]).default('OTHER'),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
    unitPrice: z.number().positive().optional(),
    amount: z.number().positive(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplierId');
  const projectId  = searchParams.get('projectId');

  const payables = await prisma.supplierPayable.findMany({
    where: {
      supplier: { companyId },
      ...(supplierId ? { supplierId } : {}),
      ...(projectId  ? { projectId  } : {}),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      phase:    { select: { id: true, name: true } },
      payments: { select: { id: true, amount: true, paidAt: true, paymentMethod: true } },
      _count:   { select: { payments: true } },
    },
    orderBy: { billDate: 'desc' },
  });

  return NextResponse.json(payables);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const userId    = (session.user as any).id;

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify supplier belongs to this company
  const supplier = await prisma.supplier.findFirst({ where: { id: d.supplierId, companyId } });
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  // Verify project belongs to this company
  const project = await prisma.project.findFirst({ where: { id: d.projectId, companyId } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // If phaseId provided, verify it belongs to the project
  if (d.phaseId) {
    const phase = await prisma.phase.findFirst({ where: { id: d.phaseId, projectId: d.projectId } });
    if (!phase) return NextResponse.json({ error: 'Phase not found in this project' }, { status: 404 });
  }

  const itemTotal = d.items?.reduce((sum, item) => sum + item.amount, 0);
  const totalAmount = itemTotal && itemTotal > 0 ? itemTotal : d.totalAmount;
  const paidAmount = d.paidAmount ?? 0;
  if (paidAmount > totalAmount) return NextResponse.json({ error: 'Paid amount cannot exceed total bill amount.' }, { status: 400 });

  const payable = await prisma.supplierPayable.create({
    data: {
      supplierId:  d.supplierId,
      projectId:   d.projectId,
      phaseId:     d.phaseId || undefined,
      billNo:      d.billNo,
      billDate:    new Date(d.billDate),
      totalAmount,
      paidAmount,
      dueAmount:   totalAmount - paidAmount,
      dueDate:     d.dueDate ? new Date(d.dueDate) : undefined,
      status:      paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      notes:       d.notes,
      ...(d.items?.length ? {
        billItems: {
          create: d.items.map((item) => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      } : {}),
    },
    include: { billItems: true },
  });

  await safeAuditLog({
    userId,
    projectId:  d.projectId,
    action:     'CREATE',
    entityType: 'supplier_payable',
    entityId:   payable.id,
    newValues:  payable,
    context: 'supplier payable create',
  });

  return NextResponse.json(payable, { status: 201 });
}
