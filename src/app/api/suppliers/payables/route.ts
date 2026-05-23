import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { isPhaseLocked, lockedPhaseMessage } from '@/lib/accounting';
import { assertAccountBelongsToCompany, createCashBankTransactionFromSupplierPayment } from '@/lib/cash-bank';

const createSchema = z.object({
  supplierId:  z.string().min(1),
  projectSupplierId: z.string().optional(),
  projectSubcontractorId: z.string().optional(),
  projectId:   z.string().min(1),          // required — bill must belong to a project
  phaseId:     z.string().optional(),       // optional — may be project-general
  billNo:      z.string().optional(),
  billDate:    z.string(),
  totalAmount: z.number().positive(),
  dueDate:     z.string().optional(),
  notes:       z.string().optional(),
  paidAmount:  z.number().min(0).optional(),
  accountId: z.string().optional(),
  paymentMethod: z.enum(['CASH','CHEQUE','BANK_TRANSFER','MOBILE_BANKING','OTHER']).optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  chequeBranchName: z.string().optional(),
  chequeMaturityDate: z.string().optional(),
  reference: z.string().optional(),
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
      projectSupplier: { select: { id: true } },
      projectSubcontractor: { select: { id: true } },
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
    if (isPhaseLocked(phase)) return NextResponse.json({ error: lockedPhaseMessage() }, { status: 423 });
  }

  let linkedProjectSupplier: { id: string; supplierId: string } | null = null;
  let linkedProjectSubcontractor: { id: string; supplierId: string } | null = null;

  if (d.projectSupplierId) {
    linkedProjectSupplier = await prisma.projectSupplier.findFirst({
      where: { id: d.projectSupplierId, projectId: d.projectId, companyId },
      select: { id: true, supplierId: true },
    });
    if (!linkedProjectSupplier) return NextResponse.json({ error: 'Project supplier assignment not found.' }, { status: 404 });
    if (linkedProjectSupplier.supplierId !== d.supplierId) {
      return NextResponse.json({ error: 'Selected supplier does not match the project supplier assignment.' }, { status: 400 });
    }
  }

  if (d.projectSubcontractorId) {
    linkedProjectSubcontractor = await prisma.projectSubcontractor.findFirst({
      where: { id: d.projectSubcontractorId, projectId: d.projectId, companyId },
      select: { id: true, supplierId: true },
    });
    if (!linkedProjectSubcontractor) return NextResponse.json({ error: 'Project subcontractor assignment not found.' }, { status: 404 });
    if (linkedProjectSubcontractor.supplierId !== d.supplierId) {
      return NextResponse.json({ error: 'Selected supplier does not match the project subcontractor assignment.' }, { status: 400 });
    }
  }

  const itemTotal = d.items?.reduce((sum, item) => sum + item.amount, 0);
  if (itemTotal && Math.abs(itemTotal - d.totalAmount) > 0.01) {
    return NextResponse.json({ error: 'Supplier bill line total must equal the bill total.' }, { status: 400 });
  }
  const totalAmount = d.totalAmount;
  const paidAmount = d.paidAmount ?? 0;
  if (paidAmount > totalAmount) return NextResponse.json({ error: 'Paid amount cannot exceed total bill amount.' }, { status: 400 });
  if (paidAmount > 0 && !d.accountId) return NextResponse.json({ error: 'Select a cash/bank account for the initial payment.' }, { status: 400 });
  if (paidAmount > 0 && d.accountId) await assertAccountBelongsToCompany(d.accountId, companyId);

  const payable = await prisma.$transaction(async (tx) => {
    const created = await tx.supplierPayable.create({
      data: {
        supplierId:  d.supplierId,
        projectId:   d.projectId,
        phaseId:     d.phaseId || undefined,
        projectSupplierId: linkedProjectSupplier?.id,
        projectSubcontractorId: linkedProjectSubcontractor?.id,
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

    if (paidAmount > 0) {
      const payment = await tx.supplierPayment.create({
        data: {
          payableId: created.id,
          accountId: d.accountId,
          amount: paidAmount,
          paymentMethod: d.paymentMethod ?? 'BANK_TRANSFER',
          chequeNo: d.chequeNo,
          chequeDate: d.chequeDate ? new Date(d.chequeDate) : undefined,
          bankName: d.bankName,
          chequeBranchName: d.chequeBranchName,
          chequeMaturityDate: d.chequeMaturityDate ? new Date(d.chequeMaturityDate) : undefined,
          reference: d.reference,
          paidAt: new Date(d.billDate),
          notes: 'Initial payment recorded during bill entry',
          status: d.paymentMethod === 'CHEQUE' ? 'ISSUED' : 'CLEARED',
          chequeStatus: d.paymentMethod === 'CHEQUE' ? 'ISSUED' : undefined,
        },
      });
      await createCashBankTransactionFromSupplierPayment(
        tx,
        payment.id,
        linkedProjectSubcontractor ? 'SUBCONTRACTOR_PAYMENT' : 'SUPPLIER_PAYMENT',
        userId,
      );
    }

    return created;
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
