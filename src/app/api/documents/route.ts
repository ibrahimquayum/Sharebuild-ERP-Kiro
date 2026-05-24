import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

import { safeAuditLog } from '@/lib/audit';
import { getAccessContext, hasPermission, hasProjectAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.xls', '.xlsx', '.doc', '.docx']);

function uniqueProjectIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function fileExtension(name: string) {
  return extname(name).toLowerCase();
}

export async function GET(req: NextRequest) {
  const context = await getAccessContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(context, 'documents', 'view')) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  }

  const companyId = context.companyId;
  const restrictedProjectIds = context.isCompanyWide ? undefined : context.activeProjectIds;

  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get('expenseId');
  const buyerId = searchParams.get('buyerId');
  const projectId = searchParams.get('projectId');
  const projectSupplierId = searchParams.get('projectSupplierId');
  const projectSubcontractorId = searchParams.get('projectSubcontractorId');
  const scope = searchParams.get('scope');
  const q = searchParams.get('q')?.trim();

  if (projectId && !hasProjectAccess(context, projectId)) {
    return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  }

  const andFilters: any[] = [];
  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  andFilters.push({
    OR: [
      { project: { companyId } },
      { buyer: { companyId } },
      { expense: { phase: { project: { companyId } } } },
      { unit: { project: { companyId } } },
      { phase: { project: { companyId } } },
      { payable: { project: { companyId } } },
      { projectSupplier: { companyId } },
      { projectSubcontractor: { companyId } },
    ],
  });

  if (restrictedProjectIds) {
    andFilters.push({
      OR: [
        { project: { id: { in: restrictedProjectIds } } },
        { unit: { projectId: { in: restrictedProjectIds } } },
        { phase: { projectId: { in: restrictedProjectIds } } },
        { expense: { phase: { projectId: { in: restrictedProjectIds } } } },
        { payable: { projectId: { in: restrictedProjectIds } } },
        { projectSupplier: { projectId: { in: restrictedProjectIds } } },
        { projectSubcontractor: { projectId: { in: restrictedProjectIds } } },
        { buyer: { projectLinks: { some: { projectId: { in: restrictedProjectIds } } } } },
        { buyer: { unitAllocations: { some: { unit: { projectId: { in: restrictedProjectIds } } } } } },
      ],
    });
  }

  const documents = await prisma.document.findMany({
    where: {
      ...(expenseId ? { expenseId } : {}),
      ...(buyerId ? { buyerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(projectSupplierId ? { projectSupplierId } : {}),
      ...(projectSubcontractorId ? { projectSubcontractorId } : {}),
      ...(scope ? { scope: scope as any } : {}),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    },
    include: {
      buyer: { select: { id: true, name: true } },
      unit: { select: { id: true, unitNo: true } },
      phase: { select: { id: true, name: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }],
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const context = await getAccessContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(context, 'documents', 'create')) {
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const files = formData.getAll('file').filter((item): item is File => item instanceof File && item.size > 0);
  const expenseId = formData.get('expenseId') as string | null;
  const buyerId = formData.get('buyerId') as string | null;
  const projectId = formData.get('projectId') as string | null;
  const unitId = formData.get('unitId') as string | null;
  const phaseId = formData.get('phaseId') as string | null;
  const payableId = formData.get('payableId') as string | null;
  const projectSupplierId = formData.get('projectSupplierId') as string | null;
  const projectSubcontractorId = formData.get('projectSubcontractorId') as string | null;
  const title = formData.get('title') as string | null;
  const category = formData.get('category') as string | null;
  const scope = formData.get('scope') as string | null;
  const sortOrder = formData.get('sortOrder') as string | null;
  const description = formData.get('description') as string | null;

  if (files.length === 0) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  if (!projectId && !buyerId && !expenseId && !unitId && !phaseId && !payableId && !projectSupplierId && !projectSubcontractorId) {
    return NextResponse.json({ error: 'Choose at least one document scope or linked record.' }, { status: 400 });
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `${file.name} is not allowed. Use JPG, PNG, PDF, Excel, or Word documents.` }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
      return NextResponse.json({ error: `${file.name} has an unsafe or unsupported file extension.` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `${file.name} is too large. Maximum allowed size is 10 MB.` }, { status: 400 });
    }
  }

  if (projectId && !hasProjectAccess(context, projectId)) {
    return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  }

  const companyId = context.companyId;
  const [project, buyer, unit, phase, expense, payable, projectSupplier, projectSubcontractor] = await Promise.all([
    projectId ? prisma.project.findFirst({ where: { id: projectId, companyId }, select: { id: true } }) : null,
    buyerId
      ? prisma.buyer.findFirst({
          where: { id: buyerId, companyId },
          select: {
            id: true,
            projectLinks: { select: { projectId: true } },
            unitAllocations: { select: { unit: { select: { projectId: true } } } },
          },
        })
      : null,
    unitId ? prisma.unit.findFirst({ where: { id: unitId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
    phaseId ? prisma.phase.findFirst({ where: { id: phaseId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
    expenseId
      ? prisma.expense.findFirst({
          where: { id: expenseId, phase: { project: { companyId } } },
          select: { id: true, phase: { select: { projectId: true } } },
        })
      : null,
    payableId ? prisma.supplierPayable.findFirst({ where: { id: payableId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
    projectSupplierId ? prisma.projectSupplier.findFirst({ where: { id: projectSupplierId, companyId }, select: { id: true, projectId: true } }) : null,
    projectSubcontractorId
      ? prisma.projectSubcontractor.findFirst({ where: { id: projectSubcontractorId, companyId }, select: { id: true, projectId: true } })
      : null,
  ]);

  if (
    (projectId && !project) ||
    (buyerId && !buyer) ||
    (unitId && !unit) ||
    (phaseId && !phase) ||
    (expenseId && !expense) ||
    (payableId && !payable) ||
    (projectSupplierId && !projectSupplier) ||
    (projectSubcontractorId && !projectSubcontractor)
  ) {
    return NextResponse.json({ error: 'One or more linked records were not found for this company.' }, { status: 404 });
  }

  const buyerProjectIds = buyer
    ? uniqueProjectIds([
        ...buyer.projectLinks.map((link) => link.projectId),
        ...buyer.unitAllocations.map((allocation) => allocation.unit.projectId),
      ])
    : [];
  const linkedProjectIds = uniqueProjectIds([
    unit?.projectId,
    phase?.projectId,
    expense?.phase.projectId,
    payable?.projectId,
    projectSupplier?.projectId,
    projectSubcontractor?.projectId,
  ]);

  if (projectId) {
    if (linkedProjectIds.some((linkedProjectId) => linkedProjectId !== projectId)) {
      return NextResponse.json({ error: 'Linked record does not belong to the selected project.' }, { status: 400 });
    }
    if (buyerProjectIds.length > 0 && !buyerProjectIds.includes(projectId)) {
      return NextResponse.json({ error: 'Buyer does not belong to the selected project.' }, { status: 400 });
    }
  }

  if (buyerProjectIds.length > 0 && !context.isCompanyWide && !buyerProjectIds.some((id) => hasProjectAccess(context, id))) {
    return NextResponse.json({ error: 'You are not assigned to this buyer project.' }, { status: 403 });
  }

  const scopedProjectId =
    projectId ??
    unit?.projectId ??
    phase?.projectId ??
    expense?.phase.projectId ??
    payable?.projectId ??
    projectSupplier?.projectId ??
    projectSubcontractor?.projectId ??
    buyerProjectIds.find((id) => hasProjectAccess(context, id));

  if (scopedProjectId && !hasProjectAccess(context, scopedProjectId)) {
    return NextResponse.json({ error: 'You are not assigned to this project.' }, { status: 403 });
  }
  if (!scopedProjectId && !context.isCompanyWide) {
    return NextResponse.json({ error: 'Attach documents to one of your assigned projects.' }, { status: 403 });
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', companyId);
  await mkdir(uploadDir, { recursive: true });

  const documents = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext = fileExtension(file.name) || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const filePath = join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${companyId}/${fileName}`;
    const baseTitle = title?.trim();

    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        title: files.length === 1 ? baseTitle || file.name : `${baseTitle || 'Document'} - ${file.name}`,
        category: category?.trim() || 'other',
        scope: (scope || (expenseId ? 'EXPENSE' : buyerId ? 'BUYER' : unitId ? 'UNIT' : phaseId ? 'PHASE' : payableId ? 'SUPPLIER_BILL' : 'PROJECT')) as any,
        sortOrder: (sortOrder ? Number(sortOrder) || 0 : 0) + index,
        description: description?.trim() ?? undefined,
        expenseId: expenseId ?? undefined,
        buyerId: buyerId ?? undefined,
        projectId: projectId ?? undefined,
        unitId: unitId ?? undefined,
        phaseId: phaseId ?? undefined,
        payableId: payableId ?? undefined,
        projectSupplierId: projectSupplierId ?? undefined,
        projectSubcontractorId: projectSubcontractorId ?? undefined,
        uploadedById: context.userId,
      },
    });

    documents.push(document);
  }

  await safeAuditLog({
    userId: context.userId,
    projectId: scopedProjectId,
    action: 'CREATE',
    entityType: 'document',
    entityId: documents[0]?.id,
    newValues: { count: documents.length, documentIds: documents.map((document) => document.id), scope, category },
    context: 'document upload',
  });

  return NextResponse.json(files.length === 1 ? documents[0] : { count: documents.length, documents }, { status: 201 });
}
