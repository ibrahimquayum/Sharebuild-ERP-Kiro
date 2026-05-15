import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

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

  const documents = await prisma.document.findMany({
    where: {
      ...(expenseId ? { expenseId } : {}),
      ...(buyerId   ? { buyerId }   : {}),
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file        = formData.get('file') as File | null;
  const expenseId   = formData.get('expenseId')   as string | null;
  const buyerId     = formData.get('buyerId')     as string | null;
  const projectId   = formData.get('projectId')   as string | null;
  const description = formData.get('description') as string | null;

  if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Use JPG, PNG, PDF, Excel, or Word documents.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large. Maximum allowed size is 10 MB.' }, { status: 400 });
  }

  // Save to /public/uploads/<companyId>/
  const uploadDir = join(process.cwd(), 'public', 'uploads', companyId);
  await mkdir(uploadDir, { recursive: true });

  const ext      = extname(file.name) || '.bin';
  const fileName = `${randomUUID()}${ext}`;
  const filePath = join(uploadDir, fileName);
  const buffer   = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${companyId}/${fileName}`;

  const document = await prisma.document.create({
    data: {
      fileName:    file.name,
      fileUrl,
      fileType:    file.type,
      fileSize:    file.size,
      description: description?.trim() ?? undefined,
      expenseId:   expenseId   ?? undefined,
      buyerId:     buyerId     ?? undefined,
      projectId:   projectId   ?? undefined,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
