import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectFinanceSummary } from '@/lib/project-finance';
import { balanceColor, formatBDT, formatBDTCompact } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectFinancePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true, defaultServiceChargePct: true },
  });

  if (!project) notFound();

  const summary = await getProjectFinanceSummary(project.id);
  const links = [
    { label: 'Demands & Due', href: `/projects/${project.id}/demands`, icon: FileText },
    { label: 'Collections', href: `/projects/${project.id}/collections`, icon: Receipt },
    { label: 'Record Collection', href: `/projects/${project.id}/collections/new`, icon: Receipt },
    { label: 'Expenses', href: `/projects/${project.id}/expenses`, icon: ShoppingCart },
    { label: 'Add Expense', href: `/projects/${project.id}/expenses/new`, icon: ShoppingCart },
    { label: 'Bulk Expense Entry', href: `/projects/${project.id}/expenses/bulk`, icon: ShoppingCart },
    { label: 'Supplier Bills', href: `/projects/${project.id}/payables`, icon: Truck },
    { label: 'Pay Supplier', href: `/projects/${project.id}/payables/payments`, icon: Banknote },
    { label: 'Subcontractor Bills', href: `/projects/${project.id}/subcontractors/bills`, icon: Truck },
    { label: 'Pay Subcontractor', href: `/projects/${project.id}/payables/payments?type=subcontractor`, icon: Banknote },
    { label: 'Cash / Bank Book', href: `/projects/${project.id}/finance/cash-bank`, icon: CircleDollarSign },
    { label: 'Cheque Register', href: `/projects/${project.id}/finance/cheques`, icon: CreditCard },
    { label: 'Company Accounts', href: '/company/accounts', icon: CircleDollarSign },
    { label: 'Account Transfers', href: '/company/accounts/transfers', icon: CircleDollarSign },
    { label: 'Supplier Ledger', href: `/projects/${project.id}/reports/supplier-ledger`, icon: FileText },
    { label: 'Subcontractor Ledger', href: `/projects/${project.id}/reports/subcontractor-ledger`, icon: FileText },
    { label: 'Tax / Deduction Report', href: `/projects/${project.id}/reports/tax-deductions`, icon: FileText },
    { label: 'Retention Report', href: `/projects/${project.id}/reports/retention`, icon: FileText },
    { label: 'Service Charge', href: `/projects/${project.id}/finance/service-charge`, icon: FileText },
    { label: 'Service Charge Report', href: `/projects/${project.id}/reports/service-charge`, icon: FileText },
    { label: 'Final Reconciliation', href: `/projects/${project.id}/finance/final-reconciliation`, icon: FileText },
    { label: 'Complete Project Report', href: `/projects/${project.id}/reports/complete-project`, icon: FileText },
    { label: 'Project Balance', href: `/projects/${project.id}/reports/top-sheet`, icon: TrendingUp },
  ];

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Finance Overview</h2>
        <p className="text-xs text-muted-foreground">{project.name} · one project-scoped money area</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Demanded"
          value={formatBDTCompact(summary.totalDemanded)}
          subtitle={formatBDT(summary.totalDemanded)}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Collected"
          value={formatBDTCompact(summary.totalCollected)}
          subtitle={formatBDT(summary.totalCollected)}
          icon={Receipt}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Buyer Receivable"
          value={formatBDTCompact(summary.buyerReceivable)}
          subtitle={`${formatBDT(summary.buyerAdvance)} advance`}
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Project Balance"
          value={formatBDTCompact(summary.projectBalance)}
          subtitle={formatBDT(summary.projectBalance)}
          icon={summary.projectBalance >= 0 ? CheckCircle2 : TrendingDown}
          iconColor={summary.projectBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}
          iconBg={summary.projectBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard
          title="Project Cost"
          value={formatBDTCompact(summary.projectCostTotal)}
          subtitle={`Direct ${formatBDT(summary.directExpenseTotal)} | Supplier ${formatBDT(summary.supplierBillCost)}`}
          icon={ShoppingCart}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Supplier Payable"
          value={formatBDTCompact(summary.supplierPayable)}
          subtitle={`${summary.assignedSupplierCount} assigned suppliers`}
          icon={Truck}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Subcontractor Due"
          value={formatBDTCompact(summary.subcontractorPayable)}
          subtitle={`${summary.assignedSubcontractorCount} assigned subcontractors`}
          icon={Truck}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          title="Missing Vouchers"
          value={String(summary.missingVoucherCount)}
          subtitle={`${summary.pendingApprovalCount} pending approvals`}
          icon={AlertCircle}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
        />
        <StatCard
          title="Tax / Deduction"
          value={formatBDTCompact(summary.taxDeductionTotal)}
          subtitle={formatBDT(summary.taxDeductionTotal)}
          icon={Receipt}
          iconColor="text-fuchsia-600"
          iconBg="bg-fuchsia-50"
        />
        <StatCard
          title="Retention Held"
          value={formatBDTCompact(summary.retentionHeld)}
          subtitle={formatBDT(summary.retentionHeld)}
          icon={Banknote}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-50"
        />
        <StatCard
          title="Service Charge"
          value={formatBDTCompact(summary.serviceChargeAccrued)}
          subtitle={summary.serviceChargeApproved > 0 ? `${formatBDT(summary.serviceChargeApproved)} approved` : 'Uses approved or calculated ledger'}
          icon={CircleDollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Cash In"
          value={formatBDTCompact(summary.cashIn)}
          subtitle={formatBDT(summary.cashIn)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Cash Out"
          value={formatBDTCompact(summary.cashOut)}
          subtitle={formatBDT(summary.cashOut)}
          icon={TrendingDown}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
        <StatCard
          title="Net Cash Movement"
          value={formatBDTCompact(summary.netCashMovement)}
          subtitle={formatBDT(summary.netCashMovement)}
          icon={CircleDollarSign}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
        />
        <StatCard
          title="Account Balance"
          value={formatBDTCompact(summary.accountBalance)}
          subtitle={`${formatBDT(summary.pendingReceivedCheques)} pending in`}
          icon={CreditCard}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Project Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collections</span>
              <span className="font-medium text-green-600">{formatBDT(summary.totalCollected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Direct expense</span>
              <span className="font-medium text-red-600">{formatBDT(summary.directExpenseTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier bills</span>
              <span>{formatBDT(summary.supplierBillCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subcontractor bills</span>
              <span>{formatBDT(summary.subcontractorBillCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service charge</span>
              <span>{formatBDT(summary.serviceChargeAccrued)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax / deduction</span>
              <span>{formatBDT(summary.taxDeductionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention held</span>
              <span>{formatBDT(summary.retentionHeld)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Net cash movement</span>
              <span className={`font-bold ${balanceColor(summary.netCashMovement)}`}>{formatBDT(summary.netCashMovement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open payables</span>
              <span>{formatBDT(summary.supplierPayable + summary.subcontractorPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending issued cheques</span>
              <span>{formatBDT(summary.pendingIssuedCheques)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bounced cheques</span>
              <span>{formatBDT(summary.bouncedCheques)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Project surplus / deficit</span>
              <span className={`font-bold ${balanceColor(summary.surplusDeficit)}`}>{formatBDT(summary.surplusDeficit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Final surplus / deficit</span>
              <span className={`font-bold ${balanceColor(summary.finalSurplusDeficit)}`}>{formatBDT(summary.finalSurplusDeficit)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Default service charge: {project.defaultServiceChargePct?.toString() ?? '0'}%
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Finance Sections</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40"
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">Open project-scoped records</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Phase Balance and Carry Forward</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Phase</th>
                  <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Carry In</th>
                  <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Collected</th>
                  <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Approved Expense</th>
                  <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Bills</th>
                  <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Carry Out</th>
                  <th className="px-4 py-2.5 text-center text-xs uppercase text-muted-foreground">Audit</th>
                </tr>
              </thead>
              <tbody>
                {summary.phaseBalances.map((row) => (
                  <tr key={row.phaseId} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.phaseName}</td>
                    <td className={`px-4 py-2.5 text-right ${balanceColor(row.carryIn)}`}>{formatBDT(row.carryIn)}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">{formatBDT(row.collection)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{formatBDT(row.expense)}</td>
                    <td className="px-4 py-2.5 text-right">{formatBDT(row.supplierBill + row.subcontractorBill)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${balanceColor(row.carryOut)}`}>{formatBDT(row.carryOut)}</td>
                    <td className="px-4 py-2.5 text-center text-xs">{row.auditLocked ? 'Locked' : 'Open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Finance Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {summary.financeReadiness.ready ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">Finance core is ready for final close review.</p>
          ) : (
            <ul className="list-disc pl-5 text-muted-foreground">
              {summary.financeReadiness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
