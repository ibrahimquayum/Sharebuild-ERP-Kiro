import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { assertApiCompanyPermission } from '@/lib/access-control';
import { getLegacyRoleForCompanyRole } from '@/lib/company-roles';
import { prisma } from '@/lib/prisma';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
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

export async function POST(req: NextRequest) {
  const access = await assertApiCompanyPermission('users', 'manageUsers');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = createUserSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const [role, existingUser, projects] = await Promise.all([
    prisma.companyRole.findFirst({
      where: { id: data.roleId, companyId: access.context.companyId, isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.project.findMany({
      where: { companyId: access.context.companyId, id: { in: data.projectIds } },
      select: { id: true },
    }),
  ]);

  if (!role) return NextResponse.json({ error: 'Selected role was not found.' }, { status: 404 });
  if (existingUser) return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 400 });
  if (projects.length !== data.projectIds.length) {
    return NextResponse.json({ error: 'One or more selected projects are invalid for this company.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const legacyRole = getLegacyRoleForCompanyRole(role.code);

  const user = await prisma.user.create({
    data: {
      companyId: access.context.companyId,
      companyRoleId: role.id,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      passwordHash,
      role: legacyRole,
      isActive: data.isActive,
      ...(data.projectIds.length
        ? {
            staffAssignments: {
              create: data.projectIds.map((projectId) => ({
                projectId,
                projectRole: data.projectRole,
                isActive: true,
                assignedBy: access.context.userId,
              })),
            },
          }
        : {}),
    },
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'CREATE',
    entityType: 'user',
    entityId: user.id,
    newValues: {
      id: user.id,
      email: user.email,
      companyRoleId: role.id,
      projectIds: data.projectIds,
    },
    context: 'user create',
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
