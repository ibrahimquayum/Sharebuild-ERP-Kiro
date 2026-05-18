import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { can } from '@/lib/permissions';
import { safeAuditLog } from '@/lib/audit';

// Max 10 MB
const MAX_BYTES = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get('expenseId');
  const buyerId   = searchParams.get('buyerId');
  const projectId = searchParams.get('projectId');
  const scope = searchParams.get('scope');
  const q = searchParams.get('q')?.trim();

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
  if (companyId) {
    andFilters.push({
      OR: [
        { project: { companyId } },
        { buyer: { companyId } },
        { expense: { phase: { project: { companyId } } } },
        { unit: { project: { companyId } } },
        { phase: { project: { companyId } } },
        { payable: { project: { companyId } } },
      ],
    });
  }

  const documents = await prisma.document.findMany({
    where: {
      ...(expenseId ? { expenseId } : {}),
      ...(buyerId   ? { buyerId }   : {}),
      ...(projectId ? { projectId } : {}),
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;
  if (!can(role, 'documents', 'create')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const files       = formData.getAll('file').filter((item): item is File => item instanceof File && item.size > 0);
  const expenseId   = formData.get('expenseId')   as string | null;
  const buyerId     = formData.get('buyerId')     as string | null;
  const projectId   = formData.get('projectId')   as string | null;
  const unitId      = formData.get('unitId')      as string | null;
  const phaseId     = formData.get('phaseId')     as string | null;
  const payableId   = formData.get('payableId')   as string | null;
  const title       = formData.get('title')       as string | null;
  const category    = formData.get('category')    as string | null;
  const scope       = formData.get('scope')       as string | null;
  const sortOrder   = formData.get('sortOrder')   as string | null;
  const description = formData.get('description') as string | null;

  if (files.length === 0) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  if (!projectId && !buyerId && !expenseId && !unitId && !phaseId && !payableId) {
    return NextResponse.json({ error: 'Choose at least one document scope or linked record.' }, { status: 400 });
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `${file.name} is not allowed. Use JPG, PNG, PDF, Excel, or Word documents.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `${file.name} is too large. Maximum allowed size is 10 MB.` }, { status: 400 });
    }
  }

  const [project, buyer, unit, phase, expense, payable] = await Promise.all([
    projectId ? prisma.project.findFirst({ where: { id: projectId, companyId }, select: { id: true } }) : null,
    buyerId ? prisma.buyer.findFirst({ where: { id: buyerId, companyId }, select: { id: true } }) : null,
    unitId ? prisma.unit.findFirst({ where: { id: unitId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
    phaseId ? prisma.phase.findFirst({ where: { id: phaseId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
    expenseId ? prisma.expense.findFirst({ where: { id: expenseId, phase: { project: { companyId } } }, select: { id: true, phase: { select: { projectId: true } } } }) : null,
    payableId ? prisma.supplierPayable.findFirst({ where: { id: payableId, project: { companyId } }, select: { id: true, projectId: true } }) : null,
  ]);

  if ((projectId && !project) || (buyerId && !buyer) || (unitId && !unit) || (phaseId && !phase) || (expenseId && !expense) || (payableId && !payable)) {
    return NextResponse.json({ error: 'One or more linked records were not found for this company.' }, { status: 404 });
  }
  if (projectId) {
    const linkedProjectIds = [
      unit?.projectId,
      phase?.projectId,
      expense?.phase.projectId,
      payable?.projectId,
    ].filter(Boolean);
    if (linkedProjectIds.some((linkedProjectId) => linkedProjectId !== projectId)) {
      return NextResponse.json({ error: 'Linked record does not belong to the selected project.' }, { status: 400 });
    }
  }

  // Save to /public/uploads/<companyId>/
  const uploadDir = join(process.cwd(), 'public', 'uploads', companyId);
  await mkdir(uploadDir, { recursive: true });

  const documents = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext      = extname(file.name) || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const filePath = join(uploadDir, fileName);
    const buffer   = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${companyId}/${fileName}`;
    const baseTitle = title?.trim();

    const document = await prisma.document.create({
      data: {
        fileName:    file.name,
        fileUrl,
        fileType:    file.type,
        fileSize:    file.size,
        title:       files.length === 1 ? (baseTitle || file.name) : `${baseTitle || 'Document'} - ${file.name}`,
        category:    category?.trim() || 'other',
        scope:       (scope || (expenseId ? 'EXPENSE' : buyerId ? 'BUYER' : unitId ? 'UNIT' : phaseId ? 'PHASE' : payableId ? 'SUPPLIER_BILL' : 'PROJECT')) as any,
        sortOrder:   (sortOrder ? Number(sortOrder) || 0 : 0) + index,
        description: description?.trim() ?? undefined,
        expenseId:   expenseId   ?? undefined,
        buyerId:     buyerId     ?? undefined,
        projectId:   projectId   ?? undefined,
        unitId:      unitId      ?? undefined,
        phaseId:     phaseId     ?? undefined,
        payableId:   payableId   ?? undefined,
        uploadedById: (session.user as any).id,
      },
    });

    documents.push(document);
  }

  await safeAuditLog({
    userId: (session.user as any).id,
    projectId: projectId ?? unit?.projectId ?? phase?.projectId ?? expense?.phase.projectId ?? payable?.projectId,
    action: 'CREATE',
    entityType: 'document',
    entityId: documents[0]?.id,
    newValues: { count: documents.length, documentIds: documents.map((document) => document.id), scope, category },
    context: 'document upload',
  });

  return NextResponse.json(files.length === 1 ? documents[0] : { count: documents.length, documents }, { status: 201 });
}
