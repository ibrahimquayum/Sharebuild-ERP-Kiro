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

export async function PUT(req: NextRequest, { params }: { params: { roleId: string } }) {
  const access = await assertApiCompanyPermission('users', 'manageUsers');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = roleSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const matrix = normalizePermissionMatrix(data.permissions as any);

  const role = await prisma.companyRole.findFirst({
    where: { id: params.roleId, companyId: access.context.companyId },
    select: { id: true, isSystem: true },
  });
  if (!role) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });

  const duplicate = await prisma.companyRole.findFirst({
    where: {
      companyId: access.context.companyId,
      name: data.name.trim(),
      id: { not: params.roleId },
    },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ error: 'Another role with this name already exists.' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.companyRole.update({
      where: { id: params.roleId },
      data: {
        name: data.name.trim(),
        code: role.isSystem ? undefined : data.code?.trim() || undefined,
        description: data.description?.trim() || undefined,
        isActive: data.isActive,
      },
    });

    await tx.rolePermission.deleteMany({ where: { roleId: params.roleId } });
    await tx.rolePermission.createMany({ data: permissionMatrixToRows(params.roleId, matrix) });
  });

  await safeAuditLog({
    userId: access.context.userId,
    action: 'UPDATE',
    entityType: 'company_role',
    entityId: params.roleId,
    newValues: { name: data.name.trim(), code: data.code?.trim() || null },
    context: 'role update',
  });

  return NextResponse.json({ ok: true });
}
