import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyWidePermission } from '@/lib/access-control';

const createSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  supplierType: z.enum(['MATERIAL_SUPPLIER','LABOUR_CONTRACTOR','EQUIPMENT_SUPPLIER','SERVICE_PROVIDER','CONSULTANT']).default('MATERIAL_SUPPLIER'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const access = await assertApiCompanyWidePermission('suppliers', 'view');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const suppliers = await prisma.supplier.findMany({
    where: { companyId, isActive: true },
    include: {
      _count: { select: { expenses: true, payables: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const access = await assertApiCompanyWidePermission('suppliers', 'create');
  if (!access.ok) return apiAccessError(access);
  const companyId = access.context.companyId;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const supplier = await prisma.supplier.create({
    data: { ...d, companyId, email: d.email || undefined },
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'CREATE',
    entityType: 'supplier',
    entityId: supplier.id,
    newValues: supplier,
    context: 'supplier create',
  });

  return NextResponse.json(supplier, { status: 201 });
}
