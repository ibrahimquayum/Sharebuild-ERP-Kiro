import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { safeAuditLog } from '@/lib/audit';
import { getProjectSubcontractorAssignments, SUBCONTRACTOR_VENDOR_TYPES } from '@/lib/project-vendor-ledger';
import { apiAccessError, assertApiProjectPermission } from '@/lib/access-control';

const newSubcontractorSchema = z.object({
  name: z.string().min(1, 'Subcontractor name is required.'),
  nameBn: z.string().optional(),
  supplierType: z.enum(SUBCONTRACTOR_VENDOR_TYPES).default('LABOUR_CONTRACTOR'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const createSchema = z.object({
  existingSupplierId: z.string().optional(),
  supplier: newSubcontractorSchema.optional(),
  workType: z.string().min(1, 'Work type is required.'),
  assignedPhaseId: z.string().optional(),
  contractAmount: z.number().min(0).optional(),
  extraWorkAmount: z.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  contractNo: z.string().optional(),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'subcontractors', action: 'view' });
  if (!access.ok) return apiAccessError(access);

  const assignments = await getProjectSubcontractorAssignments(access.project.id, access.context.companyId);
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await assertApiProjectPermission({ projectId: params.id, module: 'subcontractors', action: 'create' });
  if (!access.ok) return apiAccessError(access);

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = access.project;
  const companyId = access.context.companyId;

  const data = parsed.data;
  if (!data.existingSupplierId && !data.supplier) {
    return NextResponse.json({ error: 'Choose an existing subcontractor or create a new one.' }, { status: 400 });
  }
  if (data.assignedPhaseId) {
    const phase = await prisma.phase.findFirst({
      where: { id: data.assignedPhaseId, projectId: project.id },
      select: { id: true },
    });
    if (!phase) return NextResponse.json({ error: 'Assigned phase was not found in this project.' }, { status: 404 });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      let supplierId = data.existingSupplierId;

      if (supplierId) {
        const existing = await tx.supplier.findFirst({
          where: { id: supplierId, companyId, supplierType: { in: [...SUBCONTRACTOR_VENDOR_TYPES] } },
        });
        if (!existing) {
          throw new Error('Selected subcontractor was not found.');
        }
      } else if (data.supplier) {
        const created = await tx.supplier.create({
          data: {
            companyId,
            name: data.supplier.name.trim(),
            nameBn: data.supplier.nameBn?.trim() || undefined,
            supplierType: data.supplier.supplierType,
            contactPerson: data.supplier.contactPerson?.trim() || undefined,
            phone: data.supplier.phone?.trim() || undefined,
            address: data.supplier.address?.trim() || undefined,
            notes: data.supplier.notes?.trim() || undefined,
            isActive: data.supplier.isActive,
          },
        });
        supplierId = created.id;
      }

      const duplicate = await tx.projectSubcontractor.findFirst({
        where: {
          projectId: project.id,
          supplierId: supplierId!,
          workType: data.workType.trim(),
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error('This subcontractor and work type are already assigned to the project.');
      }

      return tx.projectSubcontractor.create({
        data: {
          companyId,
          projectId: project.id,
          supplierId: supplierId!,
          workType: data.workType.trim(),
          assignedPhaseId: data.assignedPhaseId || undefined,
          contractAmount: data.contractAmount,
          extraWorkAmount: data.extraWorkAmount ?? 0,
          paymentTerms: data.paymentTerms?.trim() || undefined,
          contractNo: data.contractNo?.trim() || undefined,
          contractDate: data.contractDate ? new Date(data.contractDate) : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          status: data.status,
          notes: data.notes?.trim() || undefined,
        },
        include: { supplier: true, assignedPhase: true },
      });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save project subcontractor assignment.' }, { status: 400 });
  }

  await safeAuditLog({
    userId: access.context.userId,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'project_subcontractor',
    entityId: result.id,
    newValues: result,
    context: 'project subcontractor assignment create',
  });

  return NextResponse.json(result, { status: 201 });
}
