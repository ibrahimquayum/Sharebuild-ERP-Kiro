import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { assertApiCompanyPermission } from '@/lib/access-control';
import { getLegacyRoleForCompanyRole } from '@/lib/company-roles';
import { prisma } from '@/lib/prisma';

const updateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  roleId: z.string().min(1),
  isActive: z.boolean().default(true),
  projectRole: z.enum([
    'PROJECT_MANAGER',
    'SITE_ENGINEER',
    'SITE_SUPERVISOR',
    'ACCOUNTS_OFFICER',
    'COLLECTION_OFFICER',
    'DOCUMENT_OFFICER',
    'AUDITOR',
  ]).default('SITE_ENGINEER'),
  projectIds: z.array(z.string().min(1)).default([]),
});

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const access = await assertApiCompanyPermission('users', 'manageUsers');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = updateUserSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const [user, role, emailConflict, projects] = await Promise.all([
    prisma.user.findFirst({
      where: { id: params.userId, companyId: access.context.companyId },
      select: { id: true, email: true },
    }),
    prisma.companyRole.findFirst({
      where: { id: data.roleId, companyId: access.context.companyId, isActive: true },
      select: { id: true, code: true },
    }),
    prisma.user.findFirst({
      where: {
        companyId: access.context.companyId,
        email: data.email.trim().toLowerCase(),
        id: { not: params.userId },
      },
      select: { id: true },
    }),
    prisma.project.findMany({
      where: { companyId: access.context.companyId, id: { in: data.projectIds } },
      select: { id: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (!role) return NextResponse.json({ error: 'Selected role was not found.' }, { status: 404 });
  if (emailConflict) return NextResponse.json({ error: 'Another user already uses this email address.' }, { status: 400 });
  if (projects.length !== data.projectIds.length) {
    return NextResponse.json({ error: 'One or more selected projects are invalid for this company.' }, { status: 400 });
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || undefined,
        companyRoleId: role.id,
        role: getLegacyRoleForCompanyRole(role.code),
        isActive: data.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    await tx.projectStaffAssignment.deleteMany({ where: { userId: user.id } });
    if (data.projectIds.length > 0) {
      await tx.projectStaffAssignment.createMany({
        data: data.projectIds.map((projectId) => ({
          userId: user.id,
          projectId,
          projectRole: data.projectRole,
          isActive: true,
          assignedBy: access.context.userId,
        })),
      });
    }
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'UPDATE',
    entityType: 'user',
    entityId: user.id,
    newValues: {
      email: data.email.trim().toLowerCase(),
      roleId: role.id,
      projectIds: data.projectIds,
    },
    context: 'user update',
  });

  return NextResponse.json({ ok: true });
}
