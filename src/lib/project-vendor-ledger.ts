import { prisma } from '@/lib/prisma';

export const SUPPLIER_VENDOR_TYPES = ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER', 'CONSULTANT'] as const;
export const SUBCONTRACTOR_VENDOR_TYPES = ['LABOUR_CONTRACTOR', 'SERVICE_PROVIDER'] as const;

export function isSubcontractorSupplierType(type: string | null | undefined) {
  return SUBCONTRACTOR_VENDOR_TYPES.includes((type ?? '') as (typeof SUBCONTRACTOR_VENDOR_TYPES)[number]);
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function validPaymentTotal(payments: Array<{ amount: unknown; status: string | null }>) {
  return payments
    .filter((payment) => payment.status !== 'REVERSED')
    .reduce((sum, payment) => sum + numberValue(payment.amount), 0);
}

function phaseBreakdownFromPayables(
  payables: Array<{
    phase: { id: string; name: string | null } | null;
    totalAmount: unknown;
    dueAmount: unknown;
    payments: Array<{ amount: unknown; status: string | null }>;
  }>,
) {
  const phaseMap = new Map<string, { phaseId: string; phaseName: string; billed: number; paid: number; due: number }>();

  for (const payable of payables) {
    const phaseId = payable.phase?.id ?? 'project-general';
    const phaseName = payable.phase?.name ?? 'Project general';
    const current = phaseMap.get(phaseId) ?? { phaseId, phaseName, billed: 0, paid: 0, due: 0 };
    current.billed += numberValue(payable.totalAmount);
    current.paid += validPaymentTotal(payable.payments);
    current.due += numberValue(payable.dueAmount);
    phaseMap.set(phaseId, current);
  }

  return Array.from(phaseMap.values()).sort((a, b) => a.phaseName.localeCompare(b.phaseName));
}

export async function getProjectSupplierAssignments(projectId: string, companyId: string) {
  const assignments = await prisma.projectSupplier.findMany({
    where: { projectId, companyId },
    include: {
      supplier: true,
      documents: { orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }] },
      payables: {
        where: { reversedAt: null },
        include: {
          phase: { select: { id: true, name: true } },
          payments: { where: { reversedAt: null }, orderBy: { paidAt: 'desc' } },
          documents: { select: { id: true, category: true } },
        },
        orderBy: [{ billDate: 'desc' }],
      },
    },
    orderBy: [{ supplier: { name: 'asc' } }],
  });

  return assignments.map((assignment) => {
    const totalBilled = assignment.payables.reduce((sum, payable) => sum + numberValue(payable.totalAmount), 0);
    const totalPaid = assignment.payables.reduce((sum, payable) => sum + validPaymentTotal(payable.payments), 0);
    const totalDue = numberValue(assignment.openingBalance) + assignment.payables.reduce((sum, payable) => sum + numberValue(payable.dueAmount), 0);
    const missingInvoiceCount = assignment.payables.filter((payable) => payable.documents.length === 0).length;

    return {
      ...assignment,
      summary: {
        totalBilled,
        totalPaid,
        totalDue,
        documentCount: assignment.documents.length,
        missingInvoiceCount,
        phaseBreakdown: phaseBreakdownFromPayables(assignment.payables),
      },
    };
  });
}

export async function getProjectSubcontractorAssignments(projectId: string, companyId: string) {
  const assignments = await prisma.projectSubcontractor.findMany({
    where: { projectId, companyId },
    include: {
      supplier: true,
      assignedPhase: { select: { id: true, name: true } },
      documents: { orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }] },
      payables: {
        where: { reversedAt: null },
        include: {
          phase: { select: { id: true, name: true } },
          payments: { where: { reversedAt: null }, orderBy: { paidAt: 'desc' } },
          documents: { select: { id: true, category: true } },
        },
        orderBy: [{ billDate: 'desc' }],
      },
    },
    orderBy: [{ supplier: { name: 'asc' } }, { createdAt: 'asc' }],
  });

  return assignments.map((assignment) => {
    const totalBilled = assignment.payables.reduce((sum, payable) => sum + numberValue(payable.totalAmount), 0);
    const totalPaid = assignment.payables.reduce((sum, payable) => sum + validPaymentTotal(payable.payments), 0);
    const totalDue = assignment.payables.reduce((sum, payable) => sum + numberValue(payable.dueAmount), 0);
    const categories = new Set(assignment.documents.map((document) => (document.category ?? '').toLowerCase()));
    const missingAgreement = !Array.from(categories).some((category) => category.includes('agreement') || category.includes('contract'));
    const missingMeasurement = !Array.from(categories).some((category) => category.includes('measurement'));

    return {
      ...assignment,
      summary: {
        totalBilled,
        totalPaid,
        totalDue,
        documentCount: assignment.documents.length,
        missingAgreement,
        missingMeasurement,
        phaseBreakdown: phaseBreakdownFromPayables(assignment.payables),
      },
    };
  });
}
