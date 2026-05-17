import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGEMENT', 'ACCOUNTS', 'COLLECTION_OFFICER', 'ENGINEER', 'SITE_SUPERVISOR', 'DOCUMENT_OFFICER', 'AUDITOR', 'MANAGER', 'ACCOUNTANT', 'SITE_ENGINEER', 'VIEWER']),
  password: z.string().min(6),
  isActive: z.boolean().default(true),
  projectId: z.string().optional(),
  projectRole: z.enum(['PROJECT_MANAGER', 'SITE_ENGINEER', 'SITE_SUPERVISOR', 'ACCOUNTS_OFFICER', 'COLLECTION_OFFICER', 'DOCUMENT_OFFICER', 'AUDITOR']).optional(),
  assignmentStartDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const parsed = userSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const passwordHash = await bcrypt.hash(d.password, 10);
  const user = await prisma.user.create({
    data: {
      companyId,
      name: d.name,
      email: d.email,
      phone: d.phone || undefined,
      role: d.role,
      passwordHash,
      isActive: d.isActive,
      ...(d.projectId ? {
        staffAssignments: {
          create: {
            projectId: d.projectId,
            projectRole: d.projectRole ?? 'SITE_ENGINEER',
            startDate: d.assignmentStartDate ? new Date(d.assignmentStartDate) : undefined,
            isActive: true,
            assignedBy: (session.user as any).id,
          },
        },
      } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'CREATE',
      entityType: 'user',
      entityId: user.id,
      newValues: { id: user.id, email: user.email, role: user.role },
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  }, { status: 201 });
}
