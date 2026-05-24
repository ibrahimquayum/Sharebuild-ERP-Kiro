export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'editDraft'
  | 'approve'
  | 'reverseAdjust'
  | 'deleteDraft'
  | 'export'
  | 'auditAccess'
  | 'manageSettings'
  | 'manageUsers';

export type PermissionModule =
  | 'dashboard'
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
  | 'accounts'
  | 'cheques'
  | 'serviceCharge'
  | 'finalReconciliation'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'users';

export type PermissionBooleans = Record<PermissionAction, boolean>;
export type PermissionMatrix = Record<PermissionModule, PermissionBooleans>;

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'editDraft',
  'approve',
  'reverseAdjust',
  'deleteDraft',
  'export',
  'auditAccess',
  'manageSettings',
  'manageUsers',
];

export const PERMISSION_MODULES: PermissionModule[] = [
  'dashboard',
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
  'accounts',
  'cheques',
  'serviceCharge',
  'finalReconciliation',
  'reports',
  'audit',
  'settings',
  'users',
];

type RoleMatrixInput = Partial<Record<PermissionModule, PermissionAction[]>>;

function blankPermissionRow(): PermissionBooleans {
  return Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, false])) as PermissionBooleans;
}

function matrixFromInput(input: RoleMatrixInput): PermissionMatrix {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => {
      const row = blankPermissionRow();
      for (const action of input[module] ?? []) row[action] = true;
      return [module, row];
    }),
  ) as PermissionMatrix;
}

function allModules(actions: PermissionAction[] = PERMISSION_ACTIONS): RoleMatrixInput {
  return Object.fromEntries(PERMISSION_MODULES.map((module) => [module, actions])) as RoleMatrixInput;
}

const financeActions: PermissionAction[] = ['view', 'create', 'edit', 'editDraft', 'approve', 'reverseAdjust', 'deleteDraft', 'export'];
const readExportAudit: PermissionAction[] = ['view', 'export', 'auditAccess'];

export type DefaultRoleTemplate = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: PermissionMatrix;
};

const DEFAULT_ROLE_TEMPLATE_INPUTS: DefaultRoleTemplate[] = [
  {
    code: 'COMPANY_ADMIN',
    name: 'Company Admin',
    description: 'Full company access across all modules and projects.',
    isSystem: true,
    permissions: matrixFromInput(allModules()),
  },
  {
    code: 'MANAGEMENT',
    name: 'Management',
    description: 'Company-wide oversight, approvals, and reporting.',
    isSystem: true,
    permissions: matrixFromInput(allModules(['view', 'create', 'edit', 'editDraft', 'approve', 'reverseAdjust', 'export', 'auditAccess'])),
  },
  {
    code: 'ACCOUNTS',
    name: 'Accounts',
    description: 'Project finance operations, treasury, and finance reporting.',
    isSystem: true,
    permissions: matrixFromInput({
      dashboard: ['view'],
      projects: ['view'],
      units: ['view'],
      buyers: ['view'],
      documents: ['view', 'create', 'export'],
      demands: financeActions,
      collections: financeActions,
      expenses: financeActions,
      suppliers: financeActions,
      subcontractors: financeActions,
      accounts: financeActions,
      cheques: ['view', 'create', 'edit', 'approve', 'reverseAdjust', 'export'],
      serviceCharge: ['view', 'create', 'edit', 'approve', 'reverseAdjust', 'export'],
      finalReconciliation: ['view', 'create', 'approve', 'reverseAdjust', 'export'],
      reports: ['view', 'export'],
      audit: ['view', 'auditAccess'],
    }),
  },
  {
    code: 'COLLECTION_OFFICER',
    name: 'Collection Officer',
    description: 'Buyer follow-up, demand visibility, and collection entry.',
    isSystem: true,
    permissions: matrixFromInput({
      dashboard: ['view'],
      projects: ['view'],
      buyers: ['view', 'create', 'editDraft'],
      documents: ['view', 'create'],
      demands: ['view'],
      collections: ['view', 'create', 'editDraft'],
      reports: ['view'],
      serviceCharge: ['view'],
      finalReconciliation: ['view'],
    }),
  },
  {
    code: 'ENGINEER',
    name: 'Engineer',
    description: 'Site engineer with draft expense, phase, and document access.',
    isSystem: true,
    permissions: matrixFromInput({
      dashboard: ['view'],
      projects: ['view'],
      units: ['view'],
      buyers: ['view'],
      documents: ['view', 'create', 'editDraft'],
      phases: ['view', 'create', 'editDraft'],
      expenses: ['view', 'create', 'editDraft', 'deleteDraft'],
      reports: ['view'],
      serviceCharge: ['view'],
      finalReconciliation: ['view'],
    }),
  },
  {
    code: 'SITE_SUPERVISOR',
    name: 'Site Supervisor',
    description: 'Field supervisor with limited draft expense/document access.',
    isSystem: true,
    permissions: matrixFromInput({
      dashboard: ['view'],
      projects: ['view'],
      units: ['view'],
      buyers: ['view'],
      documents: ['view', 'create'],
      phases: ['view'],
      expenses: ['view', 'create', 'editDraft'],
      reports: ['view'],
      serviceCharge: ['view'],
      finalReconciliation: ['view'],
    }),
  },
  {
    code: 'DOCUMENT_OFFICER',
    name: 'Document Officer',
    description: 'Document upload, organization, and export.',
    isSystem: true,
    permissions: matrixFromInput({
      dashboard: ['view'],
      projects: ['view'],
      buyers: ['view'],
      documents: ['view', 'create', 'edit', 'editDraft', 'deleteDraft', 'export'],
      reports: ['view'],
      audit: ['view'],
    }),
  },
  {
    code: 'AUDITOR',
    name: 'Auditor',
    description: 'Read-only audit and export access.',
    isSystem: true,
    permissions: matrixFromInput(allModules(readExportAudit)),
  },
  {
    code: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access to assigned projects and reports.',
    isSystem: true,
    permissions: matrixFromInput(allModules(['view'])),
  },
];

export const DEFAULT_ROLE_TEMPLATES = DEFAULT_ROLE_TEMPLATE_INPUTS;

function getLegacyMatrix(role: string | null | undefined): PermissionMatrix {
  const template = DEFAULT_ROLE_TEMPLATES.find((item) => item.code === role);
  if (template) return template.permissions;

  if (role === 'SUPER_ADMIN') return matrixFromInput(allModules());
  if (role === 'MANAGER') {
    return matrixFromInput(allModules(['view', 'create', 'edit', 'editDraft', 'approve', 'export']));
  }
  if (role === 'ACCOUNTANT') {
    return DEFAULT_ROLE_TEMPLATES.find((item) => item.code === 'ACCOUNTS')!.permissions;
  }
  if (role === 'SITE_ENGINEER') {
    return DEFAULT_ROLE_TEMPLATES.find((item) => item.code === 'ENGINEER')!.permissions;
  }

  return matrixFromInput({});
}

export function rolePermissionRowsToMatrix(
  rows: Array<{
    module: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canEditDraft: boolean;
    canApprove: boolean;
    canReverseAdjust: boolean;
    canDeleteDraft: boolean;
    canExport: boolean;
    canAuditAccess: boolean;
    canManageSettings: boolean;
    canManageUsers: boolean;
  }>,
): PermissionMatrix {
  const matrix = matrixFromInput({});
  for (const row of rows) {
    const module = permissionModuleFromDb(row.module);
    if (!module) continue;
    matrix[module] = {
      view: row.canView,
      create: row.canCreate,
      edit: row.canEdit,
      editDraft: row.canEditDraft,
      approve: row.canApprove,
      reverseAdjust: row.canReverseAdjust,
      deleteDraft: row.canDeleteDraft,
      export: row.canExport,
      auditAccess: row.canAuditAccess,
      manageSettings: row.canManageSettings,
      manageUsers: row.canManageUsers,
    };
  }
  return matrix;
}

export function canFromMatrix(matrix: PermissionMatrix, module: PermissionModule, action: PermissionAction) {
  return Boolean(matrix[module]?.[action]);
}

export function can(role: string | null | undefined, module: PermissionModule, action: PermissionAction) {
  const matrix = getLegacyMatrix(role);
  return canFromMatrix(matrix, module, action);
}

export function assertCan(role: string | null | undefined, module: PermissionModule, action: PermissionAction) {
  if (!can(role, module, action)) {
    throw new Error(`You do not have permission to ${action} ${module}.`);
  }
}

export function permissionModuleToDb(module: PermissionModule) {
  return {
    dashboard: 'DASHBOARD',
    projects: 'PROJECTS',
    units: 'UNITS',
    buyers: 'BUYERS',
    documents: 'DOCUMENTS',
    phases: 'PHASES',
    demands: 'DEMANDS',
    collections: 'COLLECTIONS',
    expenses: 'EXPENSES',
    suppliers: 'SUPPLIERS',
    subcontractors: 'SUBCONTRACTORS',
    accounts: 'ACCOUNTS',
    cheques: 'CHEQUES',
    serviceCharge: 'SERVICE_CHARGE',
    finalReconciliation: 'FINAL_RECONCILIATION',
    reports: 'REPORTS',
    audit: 'AUDIT',
    settings: 'SETTINGS',
    users: 'USERS',
  }[module];
}

export function permissionModuleFromDb(module: string): PermissionModule | null {
  const lookup: Record<string, PermissionModule> = {
    DASHBOARD: 'dashboard',
    PROJECTS: 'projects',
    UNITS: 'units',
    BUYERS: 'buyers',
    DOCUMENTS: 'documents',
    PHASES: 'phases',
    DEMANDS: 'demands',
    COLLECTIONS: 'collections',
    EXPENSES: 'expenses',
    SUPPLIERS: 'suppliers',
    SUBCONTRACTORS: 'subcontractors',
    ACCOUNTS: 'accounts',
    CHEQUES: 'cheques',
    SERVICE_CHARGE: 'serviceCharge',
    FINAL_RECONCILIATION: 'finalReconciliation',
    REPORTS: 'reports',
    AUDIT: 'audit',
    SETTINGS: 'settings',
    USERS: 'users',
  };

  return lookup[module] ?? null;
}

export function permissionLabelFromCode(code: string) {
  return code
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}
