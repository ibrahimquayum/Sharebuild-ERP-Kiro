export type PermissionAction =
  | 'view'
  | 'create'
  | 'editDraft'
  | 'approve'
  | 'reverseAdjust'
  | 'deleteDraft'
  | 'export'
  | 'auditAccess';

export type PermissionModule =
  | 'projects'
  | 'units'
  | 'buyers'
  | 'documents'
  | 'phases'
  | 'demands'
  | 'collections'
  | 'expenses'
  | 'suppliers'
  | 'subcontractors'
  | 'reports'
  | 'audit'
  | 'settings';

const ALL_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'editDraft',
  'approve',
  'reverseAdjust',
  'deleteDraft',
  'export',
  'auditAccess',
];

const ALL_MODULES: PermissionModule[] = [
  'projects',
  'units',
  'buyers',
  'documents',
  'phases',
  'demands',
  'collections',
  'expenses',
  'suppliers',
  'subcontractors',
  'reports',
  'audit',
  'settings',
];

type RoleMatrix = Partial<Record<PermissionModule, PermissionAction[]>>;

function allModules(actions: PermissionAction[] = ALL_ACTIONS): RoleMatrix {
  return Object.fromEntries(ALL_MODULES.map((module) => [module, actions])) as RoleMatrix;
}

const financeActions: PermissionAction[] = ['view', 'create', 'editDraft', 'approve', 'reverseAdjust', 'deleteDraft', 'export'];
const readExportAudit: PermissionAction[] = ['view', 'export', 'auditAccess'];

export const ROLE_PERMISSIONS: Record<string, RoleMatrix> = {
  SUPER_ADMIN: allModules(),
  COMPANY_ADMIN: allModules(),
  MANAGEMENT: allModules(['view', 'create', 'editDraft', 'approve', 'reverseAdjust', 'export', 'auditAccess']),
  MANAGER: allModules(['view', 'create', 'editDraft', 'approve', 'export']),
  ACCOUNTS: {
    projects: ['view'],
    units: ['view'],
    buyers: ['view'],
    documents: ['view', 'create', 'export'],
    demands: financeActions,
    collections: financeActions,
    expenses: financeActions,
    suppliers: financeActions,
    subcontractors: financeActions,
    reports: ['view', 'export'],
    audit: ['view', 'auditAccess'],
  },
  ACCOUNTANT: {
    projects: ['view'],
    units: ['view'],
    buyers: ['view'],
    documents: ['view', 'create', 'export'],
    demands: financeActions,
    collections: financeActions,
    expenses: financeActions,
    suppliers: financeActions,
    subcontractors: financeActions,
    reports: ['view', 'export'],
    audit: ['view', 'auditAccess'],
  },
  COLLECTION_OFFICER: {
    projects: ['view'],
    units: ['view'],
    buyers: ['view', 'create', 'editDraft'],
    documents: ['view', 'create'],
    demands: ['view', 'create', 'editDraft', 'deleteDraft'],
    collections: ['view', 'create', 'editDraft', 'deleteDraft'],
    reports: ['view'],
  },
  ENGINEER: {
    projects: ['view'],
    units: ['view', 'create', 'editDraft'],
    documents: ['view', 'create'],
    phases: ['view', 'create', 'editDraft'],
    expenses: ['view', 'create', 'editDraft', 'deleteDraft'],
    reports: ['view'],
  },
  SITE_ENGINEER: {
    projects: ['view'],
    units: ['view', 'create', 'editDraft'],
    documents: ['view', 'create'],
    phases: ['view', 'create', 'editDraft'],
    expenses: ['view', 'create', 'editDraft', 'deleteDraft'],
    reports: ['view'],
  },
  SITE_SUPERVISOR: {
    projects: ['view'],
    units: ['view'],
    documents: ['view', 'create'],
    phases: ['view'],
    expenses: ['view', 'create', 'editDraft'],
  },
  DOCUMENT_OFFICER: {
    projects: ['view'],
    units: ['view'],
    buyers: ['view'],
    documents: ['view', 'create', 'editDraft', 'deleteDraft', 'export'],
    phases: ['view'],
    reports: ['view'],
  },
  AUDITOR: allModules(readExportAudit),
  VIEWER: allModules(['view']),
};

export function can(role: string | null | undefined, module: PermissionModule, action: PermissionAction) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[module]?.includes(action) ?? false;
}

export function assertCan(role: string | null | undefined, module: PermissionModule, action: PermissionAction) {
  if (!can(role, module, action)) {
    throw new Error(`You do not have permission to ${action} ${module}.`);
  }
}
