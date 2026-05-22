import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';
import { getProjectSupplierAssignments, SUPPLIER_VENDOR_TYPES } from '@/lib/project-vendor-ledger';

const newSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required.'),
  nameBn: z.string().optional(),
  supplierType: z.enum(SUPPLIER_VENDOR_TYPES).default('MATERIAL_SUPPLIER'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const createSchema = z.object({
  existingSupplierId: z.string().optional(),
  supplier: newSupplierSchema.optional(),
  materialCategory: z.string().optional(),
  phaseNotes: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditDays: z.number().int().min(0).optional(),
  openingBalance: z.number().min(0).optional(),
  contractNo: z.string().optional(),
  contractDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId as string;
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const assignments = await getProjectSupplierAssignments(project.id, companyId);
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId as string;
  const role = (session.user as any).role as string | undefined;
  const userId = (session.user as any).id as string | undefined;
  if (!can(role, 'suppliers', 'create')) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, companyId: true, name: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const data = parsed.data;
  if (!data.existingSupplierId && !data.supplier) {
    return NextResponse.json({ error: 'Choose an existing supplier or create a new one.' }, { status: 400 });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      let supplierId = data.existingSupplierId;

      if (supplierId) {
        const existing = await tx.supplier.findFirst({
          where: { id: supplierId, companyId, supplierType: { in: [...SUPPLIER_VENDOR_TYPES] } },
        });
        if (!existing) {
          throw new Error('Selected supplier was not found.');
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

      const duplicate = await tx.projectSupplier.findUnique({
        where: { projectId_supplierId: { projectId: project.id, supplierId: supplierId! } },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error('This supplier is already assigned to the project.');
      }

      return tx.projectSupplier.create({
        data: {
          companyId,
          projectId: project.id,
          supplierId: supplierId!,
          materialCategory: data.materialCategory?.trim() || undefined,
          phaseNotes: data.phaseNotes?.trim() || undefined,
          paymentTerms: data.paymentTerms?.trim() || undefined,
          creditDays: data.creditDays,
          openingBalance: data.openingBalance ?? 0,
          contractNo: data.contractNo?.trim() || undefined,
          contractDate: data.contractDate ? new Date(data.contractDate) : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          status: data.status,
          notes: data.notes?.trim() || undefined,
        },
        include: { supplier: true },
      });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save project supplier assignment.' }, { status: 400 });
  }

  await safeAuditLog({
    userId,
    projectId: project.id,
    action: 'CREATE',
    entityType: 'project_supplier',
    entityId: result.id,
    newValues: result,
    context: 'project supplier assignment create',
  });

  return NextResponse.json(result, { status: 201 });
}
