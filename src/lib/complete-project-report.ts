import { prisma } from '@/lib/prisma';
import { getCompanyBranding } from '@/lib/branding';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { getProjectBuyerLedger, getProjectFinanceSummary, getProjectServiceChargeLedger } from '@/lib/project-finance';
import { getProjectSupplierAssignments, getProjectSubcontractorAssignments, isSubcontractorSupplierType } from '@/lib/project-vendor-ledger';

export async function getCompleteProjectReportData(companyId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, companyId } });
  if (!project) return null;

  const [branding, summary, phases, expenses, payables, auditLogs, projectSupplierAssignments, projectSubcontractorAssignments, buyerDue, serviceChargeLedger] = await Promise.all([
    getCompanyBranding(companyId),
    getProjectFinanceSummary(project.id),
    prisma.phase.findMany({
      where: { projectId: project.id, status: { notIn: ['CANCELLED', 'DUPLICATE'] } },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.expense.findMany({
      where: { phase: { projectId: project.id } },
      include: {
        phase: { select: { id: true, name: true, sequence: true } },
        supplier: { select: { name: true, supplierType: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        documents: { select: { id: true } },
      },
      orderBy: [{ phase: { sequence: 'asc' } }, { expenseDate: 'asc' }],
    }),
    prisma.supplierPayable.findMany({
      where: { projectId: project.id },
      include: {
        supplier: { select: { name: true, supplierType: true } },
        phase: { select: { id: true, name: true, sequence: true } },
        payments: { where: { status: { not: 'REVERSED' } }, orderBy: { paidAt: 'desc' } },
        documents: { select: { id: true, category: true } },
      },
      orderBy: [{ phase: { sequence: 'asc' } }, { billDate: 'asc' }],
    }),
    prisma.auditLog.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    getProjectSupplierAssignments(project.id, companyId),
    getProjectSubcontractorAssignments(project.id, companyId),
    getProjectBuyerLedger(project.id),
    getProjectServiceChargeLedger(project.id),
  ]);

  const phaseSummary = summary.phaseBalances.map((phase) => ({
    ...phase,
    status: phases.find((item) => item.id === phase.phaseId)?.status ?? '',
  }));

  const topSheet = phases
    .filter((phase) => ['ACTIVE', 'APPROVED', 'INCLUDED_IN_SUMMARY'].includes(phase.status))
    .map((phase) => {
      const row = summary.phaseBalances.find((item) => item.phaseId === phase.id);
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        phaseType: phase.phaseType,
        income: row?.collection ?? 0,
        expense: (row?.expense ?? 0) + (row?.supplierBill ?? 0) + (row?.subcontractorBill ?? 0),
        balance: row?.carryOut ?? 0,
      };
    });

  const supplierSummary = payables
    .filter((payable) => !isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));
  const subcontractorSummary = payables
    .filter((payable) => isSubcontractorSupplierType(payable.supplier.supplierType))
    .map((payable) => ({ ...payable, validPaid: payable.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) }));

  const officialExpenses = expenses.filter((expense) => FINAL_EXPENSE_STATUSES.includes(expense.status as any) && !expense.reversedAt);
  const missingVoucher = expenses.filter((expense) => FINAL_EXPENSE_STATUSES.includes(expense.status as any) && !expense.reversedAt && expense.documents.length === 0);
  const pendingApprovals = expenses.filter((expense) => expense.status === 'PENDING_APPROVAL' && !expense.reversedAt);
  const reversedRecords = [
    ...expenses.filter((expense) => expense.reversedAt).map((expense) => ({ type: 'Expense', label: expense.description, amount: Number(expense.amount), reason: expense.reversalReason ?? '' })),
    ...payables.filter((payable) => payable.reversedAt).map((payable) => ({ type: payable.supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'Subcontractor Bill' : 'Supplier Bill', label: payable.billNo ?? payable.supplier.name, amount: Number(payable.totalAmount), reason: payable.reversalReason ?? '' })),
  ];

  return {
    branding,
    project,
    generatedAt: new Date(),
    summary,
    phases,
    phaseSummary,
    topSheet,
    expenses,
    officialExpenses,
    supplierSummary,
    subcontractorSummary,
    projectSupplierAssignments,
    projectSubcontractorAssignments,
    buyerDue,
    serviceChargeLedger,
    auditLogs,
    auditSummary: {
      reversedRecords,
      missingVoucher,
      pendingApprovals,
      lockedPhases: phases.filter((phase) => phase.auditLockedAt),
    },
  };
}
