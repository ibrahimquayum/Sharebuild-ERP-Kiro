import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyWidePermission } from '@/lib/access-control';

const supplierSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  supplierType: z.enum(['MATERIAL_SUPPLIER','LABOUR_CONTRACTOR','EQUIPMENT_SUPPLIER','SERVICE_PROVIDER','CONSULTANT']),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiCompanyWidePermission('suppliers', 'editDraft');
  if (!access.ok) return apiAccessError(access);
  const oldSupplier = await prisma.supplier.findFirst({ where: { id: params.id, companyId: access.context.companyId } });
  if (!oldSupplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const parsed = supplierSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: { ...d, email: d.email || null },
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'UPDATE',
    entityType: 'supplier',
    entityId: supplier.id,
    oldValues: oldSupplier,
    newValues: supplier,
    context: 'supplier update',
  });

  return NextResponse.json(supplier);
}
