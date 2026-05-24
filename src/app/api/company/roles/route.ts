import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeAuditLog } from '@/lib/audit';
import { assertApiCompanyPermission } from '@/lib/access-control';
import { normalizePermissionMatrix, permissionMatrixToRows } from '@/lib/company-roles';
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

const permissionRecord = z.object(
  Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, z.boolean().optional()])) as Record<string, z.ZodTypeAny>,
);

const roleSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  permissions: z.object(
    Object.fromEntries(PERMISSION_MODULES.map((module) => [module, permissionRecord])) as Record<string, z.ZodTypeAny>,
  ),
});

export async function POST(req: NextRequest) {
  const access = await assertApiCompanyPermission('users', 'manageUsers');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = roleSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const matrix = normalizePermissionMatrix(data.permissions as any);

  const existing = await prisma.companyRole.findFirst({
    where: { companyId: access.context.companyId, name: data.name.trim() },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: 'A role with this name already exists.' }, { status: 400 });

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.companyRole.create({
      data: {
        companyId: access.context.companyId,
        code: data.code?.trim() || undefined,
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        isActive: data.isActive,
        isSystem: false,
      },
    });

    await tx.rolePermission.createMany({
      data: permissionMatrixToRows(created.id, matrix),
    });

    return created;
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'CREATE',
    entityType: 'company_role',
    entityId: role.id,
    newValues: { name: role.name, code: role.code },
    context: 'role create',
  });

  return NextResponse.json({ id: role.id }, { status: 201 });
}
