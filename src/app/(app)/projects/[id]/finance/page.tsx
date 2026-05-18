import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { AlertCircle, Banknote, CheckCircle2, FileText, Receipt, ShoppingCart, TrendingDown, TrendingUp, Truck } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProjectFinanceSummary } from '@/lib/project-finance';
import { balanceColor, formatBDT, formatBDTCompact } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';

export const dynamic = 'force-dynamic';

export default async function ProjectFinancePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true, defaultServiceChargePct: true } });
  if (!project) notFound();

  const summary = await getProjectFinanceSummary(project.id);
  const links = [
    { label: 'Demands & Due', href: `/projects/${project.id}/demands`, icon: FileText },
    { label: 'Collections', href: `/projects/${project.id}/collections`, icon: Receipt },
    { label: 'Expenses', href: `/projects/${project.id}/expenses`, icon: ShoppingCart },
    { label: 'Bulk Expense Entry', href: `/projects/${project.id}/expenses/bulk`, icon: ShoppingCart },
    { label: 'Add Supplier', href: `/projects/${project.id}/suppliers/new`, icon: Truck },
    { label: 'Supplier Bills', href: `/projects/${project.id}/payables`, icon: Truck },
    { label: 'Supplier Payments', href: `/projects/${project.id}/payables/payments`, icon: Banknote },
    { label: 'Add Subcontractor', href: `/projects/${project.id}/subcontractors/new`, icon: Truck },
    { label: 'Subcontractor Bills', href: `/projects/${project.id}/subcontractors/bills`, icon: Truck },
    { label: 'Subcontractor Payments', href: `/projects/${project.id}/payables/payments?type=subcontractor`, icon: Banknote },
    { label: 'Supplier Ledger', href: `/projects/${project.id}/reports/supplier-ledger`, icon: FileText },
    { label: 'Subcontractor Ledger', href: `/projects/${project.id}/reports/subcontractor-ledger`, icon: FileText },
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
        <StatCard title="Total Demanded" value={formatBDTCompact(summary.totalDemanded)} subtitle={formatBDT(summary.totalDemanded)} icon={FileText} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Collected" value={formatBDTCompact(summary.totalCollected)} subtitle={formatBDT(summary.totalCollected)} icon={Receipt} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Buyer Receivable" value={formatBDTCompact(summary.buyerReceivable)} subtitle={`${formatBDT(summary.buyerAdvance)} advance`} icon={AlertCircle} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Project Balance" value={formatBDTCompact(summary.projectBalance)} subtitle={formatBDT(summary.projectBalance)} icon={summary.projectBalance >= 0 ? CheckCircle2 : TrendingDown} iconColor={summary.projectBalance >= 0 ? 'text-emerald-600' : 'text-red-600'} iconBg={summary.projectBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50'} />
        <StatCard title="Approved Expense" value={formatBDTCompact(summary.totalExpense)} subtitle={`${formatBDT(summary.pendingExpense)} pending`} icon={ShoppingCart} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatCard title="Supplier Payable" value={formatBDTCompact(summary.supplierPayable)} subtitle={formatBDT(summary.supplierPayable)} icon={Truck} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title="Subcontractor Payable" value={formatBDTCompact(summary.subcontractorPayable)} subtitle={formatBDT(summary.subcontractorPayable)} icon={Truck} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="Missing Vouchers" value={String(summary.missingVoucherCount)} subtitle={`${summary.pendingApprovalCount} pending approvals`} icon={AlertCircle} iconColor="text-yellow-600" iconBg="bg-yellow-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Project Balance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Collections</span><span className="font-medium text-green-600">{formatBDT(summary.totalCollected)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium text-red-600">{formatBDT(summary.totalExpense)}</span></div>
            <div className="flex justify-between border-t pt-3"><span>Cash Balance</span><span className={`font-bold ${balanceColor(summary.projectBalance)}`}>{formatBDT(summary.projectBalance)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Open payables</span><span>{formatBDT(summary.supplierPayable + summary.subcontractorPayable)}</span></div>
            <div className="flex justify-between border-t pt-3"><span>Surplus / Deficit after payables</span><span className={`font-bold ${balanceColor(summary.surplusDeficit)}`}>{formatBDT(summary.surplusDeficit)}</span></div>
            <div className="text-xs text-muted-foreground">Default service charge: {project.defaultServiceChargePct?.toString() ?? '0'}%</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Finance Sections</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/40">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><item.icon className="h-4 w-4" /></div>
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
        <CardHeader><CardTitle className="text-sm">Phase Balance and Carry Forward</CardTitle></CardHeader>
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
    </div>
  );
}
