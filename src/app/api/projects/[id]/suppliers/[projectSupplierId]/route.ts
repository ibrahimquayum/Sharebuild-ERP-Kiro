import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';
import { SUPPLIER_VENDOR_TYPES } from '@/lib/project-vendor-ledger';

const updateSchema = z.object({
  supplier: z.object({
    name: z.string().min(1, 'Supplier name is required.'),
    nameBn: z.string().optional(),
    supplierType: z.enum(SUPPLIER_VENDOR_TYPES),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
  }),
  materialCategory: z.string().optional(),
  phaseNotes: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditDays: z.number().int().min(0).optional(),
  openingBalance: z.number().min(0).optional(),
  contractNo: z.string().optional(),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string; projectSupplierId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId as string;

  const assignment = await prisma.projectSupplier.findFirst({
    where: { id: params.projectSupplierId, projectId: params.id, companyId },
    include: {
      supplier: true,
      project: { select: { id: true, name: true } },
      documents: { orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }] },
      payables: {
        where: { reversedAt: null },
        include: {
          phase: { select: { id: true, name: true } },
          payments: { where: { reversedAt: null }, orderBy: { paidAt: 'desc' } },
          documents: { select: { id: true, title: true, fileUrl: true } },
        },
        orderBy: { billDate: 'desc' },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: 'Project supplier assignment not found.' }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; projectSupplierId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId as string;
  const role = (session.user as any).role as string | undefined;
  const userId = (session.user as any).id as string | undefined;
  if (!can(role, 'suppliers', 'editDraft')) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await prisma.projectSupplier.findFirst({
    where: { id: params.projectSupplierId, projectId: params.id, companyId },
    include: { supplier: true },
  });
  if (!current) return NextResponse.json({ error: 'Project supplier assignment not found.' }, { status: 404 });

  const data = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: current.supplierId },
      data: {
        name: data.supplier.name.trim(),
        nameBn: data.supplier.nameBn?.trim() || null,
        supplierType: data.supplier.supplierType,
        contactPerson: data.supplier.contactPerson?.trim() || null,
        phone: data.supplier.phone?.trim() || null,
        address: data.supplier.address?.trim() || null,
        notes: data.supplier.notes?.trim() || null,
        isActive: data.supplier.isActive,
      },
    });

    return tx.projectSupplier.update({
      where: { id: current.id },
      data: {
        materialCategory: data.materialCategory?.trim() || null,
        phaseNotes: data.phaseNotes?.trim() || null,
        paymentTerms: data.paymentTerms?.trim() || null,
        creditDays: data.creditDays ?? null,
        openingBalance: data.openingBalance ?? 0,
        contractNo: data.contractNo?.trim() || null,
        contractDate: data.contractDate ? new Date(data.contractDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
        notes: data.notes?.trim() || null,
      },
      include: { supplier: true },
    });
  });

  await safeAuditLog({
    userId,
    projectId: params.id,
    action: 'UPDATE',
    entityType: 'project_supplier',
    entityId: updated.id,
    oldValues: current,
    newValues: updated,
    context: 'project supplier assignment update',
  });

  return NextResponse.json(updated);
}
