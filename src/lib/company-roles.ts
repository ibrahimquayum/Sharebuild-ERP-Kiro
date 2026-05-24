import { DEFAULT_ROLE_TEMPLATES, PERMISSION_MODULES, PERMISSION_ACTIONS, permissionModuleToDb, type PermissionAction, type PermissionMatrix, type PermissionModule } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';

export function getLegacyRoleForCompanyRole(code: string | null | undefined): UserRole {
  const allowed = new Set<UserRole>([
    'COMPANY_ADMIN',
    'MANAGEMENT',
    'ACCOUNTS',
    'COLLECTION_OFFICER',
    'ENGINEER',
    'SITE_SUPERVISOR',
    'DOCUMENT_OFFICER',
    'AUDITOR',
    'VIEWER',
    'MANAGER',
    'ACCOUNTANT',
    'SITE_ENGINEER',
  ]);

  if (code && allowed.has(code as UserRole)) return code as UserRole;
  return 'VIEWER';
}

export function emptyPermissionMatrix(): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module,
      Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, false])) as Record<PermissionAction, boolean>,
    ]),
  ) as PermissionMatrix;
}

export function getDefaultRoleTemplateByCode(code: string | null | undefined) {
  return DEFAULT_ROLE_TEMPLATES.find((template) => template.code === code) ?? null;
}

export function permissionMatrixToRows(roleId: string, matrix: PermissionMatrix) {
  return PERMISSION_MODULES.map((module) => ({
    roleId,
    module: permissionModuleToDb(module) as any,
    canView: matrix[module].view,
    canCreate: matrix[module].create,
    canEdit: matrix[module].edit,
    canEditDraft: matrix[module].editDraft,
    canApprove: matrix[module].approve,
    canReverseAdjust: matrix[module].reverseAdjust,
    canDeleteDraft: matrix[module].deleteDraft,
    canExport: matrix[module].export,
    canAuditAccess: matrix[module].auditAccess,
    canManageSettings: matrix[module].manageSettings,
    canManageUsers: matrix[module].manageUsers,
  }));
}

export function normalizePermissionMatrix(input: Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>) {
  const base = emptyPermissionMatrix();
  for (const module of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      base[module][action] = Boolean(input[module]?.[action]);
    }
  }
  return base;
}
