import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { SUBCONTRACTOR_VENDOR_TYPES } from '@/lib/project-vendor-ledger';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const updateSchema = z.object({
  supplier: z.object({
    name: z.string().min(1, 'Subcontractor name is required.'),
    nameBn: z.string().optional(),
    supplierType: z.enum(SUBCONTRACTOR_VENDOR_TYPES),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
  }),
  workType: z.string().min(1, 'Work type is required.'),
  assignedPhaseId: z.string().optional(),
  contractAmount: z.number().min(0).optional(),
  extraWorkAmount: z.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  contractNo: z.string().optional(),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string; projectSubcontractorId: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'subcontractors', action: 'view' });
  if (!access.ok) return apiAccessError(access);

  const assignment = await prisma.projectSubcontractor.findFirst({
    where: { id: params.projectSubcontractorId, projectId: params.id, companyId: access.context.companyId },
    include: {
      supplier: true,
      project: { select: { id: true, name: true } },
      assignedPhase: { select: { id: true, name: true } },
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

  if (!assignment) return NextResponse.json({ error: 'Project subcontractor assignment not found.' }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; projectSubcontractorId: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'subcontractors', action: 'editDraft' });
  if (!access.ok) return apiAccessError(access);

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await prisma.projectSubcontractor.findFirst({
    where: { id: params.projectSubcontractorId, projectId: params.id, companyId: access.context.companyId },
    include: { supplier: true },
  });
  if (!current) return NextResponse.json({ error: 'Project subcontractor assignment not found.' }, { status: 404 });

  const data = parsed.data;
  if (data.assignedPhaseId) {
    const phase = await prisma.phase.findFirst({
      where: { id: data.assignedPhaseId, projectId: params.id },
      select: { id: true },
    });
    if (!phase) return NextResponse.json({ error: 'Assigned phase was not found in this project.' }, { status: 404 });
  }

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

    return tx.projectSubcontractor.update({
      where: { id: current.id },
      data: {
        workType: data.workType.trim(),
        assignedPhaseId: data.assignedPhaseId || null,
        contractAmount: data.contractAmount ?? null,
        extraWorkAmount: data.extraWorkAmount ?? 0,
        paymentTerms: data.paymentTerms?.trim() || null,
        contractNo: data.contractNo?.trim() || null,
        contractDate: data.contractDate ? new Date(data.contractDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: data.status,
        notes: data.notes?.trim() || null,
      },
      include: { supplier: true, assignedPhase: true },
    });
  });

  await safeAuditLog({
    userId: access.context.userId,
    projectId: params.id,
    action: 'UPDATE',
    entityType: 'project_subcontractor',
    entityId: updated.id,
    oldValues: current,
    newValues: updated,
    context: 'project subcontractor assignment update',
  });

  return NextResponse.json(updated);
}
