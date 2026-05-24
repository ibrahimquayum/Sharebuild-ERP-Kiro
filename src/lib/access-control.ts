import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  type PermissionAction,
  type PermissionMatrix,
  type PermissionModule,
  can,
  canFromMatrix,
  rolePermissionRowsToMatrix,
} from '@/lib/permissions';

const COMPANY_WIDE_ROLES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGEMENT', 'MANAGER']);

export type AccessContext = {
  session: any;
  userId: string;
  companyId: string;
  companyName: string;
  legacyRole: string;
  companyRoleId: string | null;
  companyRoleName: string | null;
  permissionMatrix: PermissionMatrix | null;
  activeProjectIds: string[];
  isCompanyWide: boolean;
};

export async function getAccessContext() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const sessionUser = session.user as any;
  const userId = sessionUser?.id ?? '';
  const companyId = sessionUser?.companyId ?? '';
  if (!userId || !companyId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyRole: {
        include: { permissions: true },
      },
      staffAssignments: {
        where: {
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        select: { projectId: true },
      },
    },
  });

  if (!user || user.companyId !== companyId || !user.isActive) return null;

  const permissionMatrix = user.companyRole?.permissions?.length
    ? rolePermissionRowsToMatrix(user.companyRole.permissions)
    : null;

  return {
    session,
    userId,
    companyId,
    companyName: sessionUser?.companyName ?? '',
    legacyRole: user.role,
    companyRoleId: user.companyRoleId ?? null,
    companyRoleName: user.companyRole?.name ?? null,
    permissionMatrix,
    activeProjectIds: user.staffAssignments.map((assignment) => assignment.projectId),
    isCompanyWide: COMPANY_WIDE_ROLES.has(user.role),
  } satisfies AccessContext;
}

export async function requireAccessContext() {
  const context = await getAccessContext();
  if (!context) redirect('/login');
  return context;
}

export function hasPermission(context: AccessContext, module: PermissionModule, action: PermissionAction) {
  if (context.permissionMatrix) return canFromMatrix(context.permissionMatrix, module, action);
  return can(context.legacyRole, module, action);
}

export function hasProjectAccess(context: AccessContext, projectId: string) {
  return context.isCompanyWide || context.activeProjectIds.includes(projectId);
}

export async function requireCompanyPageAccess(module: PermissionModule, action: PermissionAction = 'view') {
  const context = await requireAccessContext();
  if (!hasPermission(context, module, action)) {
    redirect(`/access-denied?module=${module}&action=${action}`);
  }
  return context;
}

export async function requireCompanyWidePageAccess(module: PermissionModule, action: PermissionAction = 'view') {
  const context = await requireCompanyPageAccess(module, action);
  if (!context.isCompanyWide) {
    redirect(`/access-denied?module=${module}&action=${action}`);
  }
  return context;
}

export async function requireProjectPageAccess(
  projectId: string,
  module: PermissionModule,
  action: PermissionAction = 'view',
) {
  const context = await requireAccessContext();
  if (!hasPermission(context, module, action)) {
    redirect(`/access-denied?module=${module}&action=${action}&projectId=${projectId}`);
  }
  if (!hasProjectAccess(context, projectId)) {
    redirect(`/access-denied?module=${module}&action=${action}&projectId=${projectId}`);
  }
  return context;
}

export async function getScopedProject(projectId: string, module: PermissionModule, action: PermissionAction = 'view') {
  const context = await requireProjectPageAccess(projectId, module, action);
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: context.companyId },
  });
  if (!project) notFound();
  return { context, project };
}

export async function assertApiProjectPermission(params: {
  projectId: string;
  module: PermissionModule;
  action: PermissionAction;
}) {
  const context = await getAccessContext();
  if (!context) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }
  if (!hasPermission(context, params.module, params.action)) {
    return { ok: false as const, status: 403, error: 'Insufficient permissions.' };
  }
  if (!hasProjectAccess(context, params.projectId)) {
    return { ok: false as const, status: 403, error: 'You are not assigned to this project.' };
  }
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, companyId: context.companyId },
    select: { id: true, companyId: true, name: true },
  });
  if (!project) return { ok: false as const, status: 404, error: 'Project not found.' };
  return { ok: true as const, context, project };
}

export async function assertApiCompanyPermission(module: PermissionModule, action: PermissionAction) {
  const context = await getAccessContext();
  if (!context) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }
  if (!hasPermission(context, module, action)) {
    return { ok: false as const, status: 403, error: 'Insufficient permissions.' };
  }
  return { ok: true as const, context };
}

export async function assertApiCompanyWidePermission(module: PermissionModule, action: PermissionAction) {
  const access = await assertApiCompanyPermission(module, action);
  if (!access.ok) return access;
  if (!access.context.isCompanyWide) {
    return { ok: false as const, status: 403, error: 'Insufficient permissions.' };
  }
  return access;
}
