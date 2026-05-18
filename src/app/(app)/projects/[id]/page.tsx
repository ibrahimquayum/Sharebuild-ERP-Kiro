import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatBDT, formatBDTCompact, formatDate,
  phaseStatusMeta, balanceColor, cn,
} from '@/lib/utils';
import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import {
  TrendingUp, TrendingDown, Users, Layers,
  AlertCircle, CheckCircle2, Clock, ArrowRight,
  Truck, Plus, BarChart3, FileText, Upload,
  Receipt, ShoppingCart, Building2,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

export default async function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    include: {
      phases: {
        select: { id: true, name: true, nameBn: true, status: true, sequence: true },
        orderBy: { sequence: 'asc' },
      },
      buyers: {
        include: { buyer: { select: { id: true, name: true, phone: true } } },
        take: 8,
      },
      _count: { select: { phases: true, buyers: true, units: true } },
    },
  });

  if (!project) notFound();

  const base = `/projects/${project.id}`;

  // ── Financial aggregates ─────────────────────────────────────
  const [
    incAgg,
    expAgg,
    supplierPayableAgg,
    subcontractorPayableAgg,
    pendingApprovalCount,
    missingVoucherCount,
    activePhaseCount,
  ] = await Promise.all([
    // Total collection
    prisma.collection.aggregate({
      where: { phase: { projectId: project.id }, status: { not: 'REVERSED' } },
      _sum: { amount: true },
    }),
    // Total expense
    prisma.expense.aggregate({
      where: { phase: { projectId: project.id }, status: { in: [...FINAL_EXPENSE_STATUSES] }, reversedAt: null },
      _sum: { amount: true },
    }),
    // Supplier payable (MATERIAL_SUPPLIER, EQUIPMENT_SUPPLIER, SERVICE_PROVIDER, CONSULTANT)
    prisma.supplierPayable.aggregate({
      where: {
        projectId: project.id,
        reversedAt: null,
        supplier: {
          supplierType: { in: ['MATERIAL_SUPPLIER', 'EQUIPMENT_SUPPLIER', 'SERVICE_PROVIDER', 'CONSULTANT'] },
        },
      },
      _sum: { dueAmount: true },
    }),
    // Subcontractor payable (LABOUR_CONTRACTOR only)
    prisma.supplierPayable.aggregate({
      where: {
        projectId: project.id,
        reversedAt: null,
        supplier: { supplierType: 'LABOUR_CONTRACTOR' },
      },
      _sum: { dueAmount: true },
    }),
    // Pending approval count
    prisma.expense.count({
      where: { phase: { projectId: project.id }, status: 'PENDING_APPROVAL', reversedAt: null },
    }),
    // Missing voucher count
    prisma.expense.count({
      where: {
        phase: { projectId: project.id },
        documents: { none: {} },
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
        reversedAt: null,
      },
    }),
    // Active phase count
    prisma.phase.count({
      where: { projectId: project.id, status: 'ACTIVE' },
    }),
  ]);

  const income              = Number(incAgg._sum.amount ?? 0);
  const expense             = Number(expAgg._sum.amount ?? 0);
  const balance             = income - expense;
  const supplierPayable     = Number(supplierPayableAgg._sum.dueAmount ?? 0);
  const subcontractorPayable = Number(subcontractorPayableAgg._sum.dueAmount ?? 0);

  // ── Buyer due (sum of outstanding demands) ────────────────────
  const buyerDueAgg = await prisma.demand.aggregate({
    where: {
      phase: { projectId: project.id },
      status: { notIn: ['FULLY_PAID', 'CANCELLED'] },
    },
    _sum: { amount: true },
  });
  const buyerDue = Number(buyerDueAgg._sum.amount ?? 0);

  // ── Quick actions ─────────────────────────────────────────────
  const quickActions: QuickAction[] = [
    { label: 'Add Expense',          href: `${base}/expenses/new`,       icon: ShoppingCart, color: 'bg-red-600 hover:bg-red-700 text-white' },
    { label: 'Record Collection',    href: `${base}/collections/new`,    icon: Receipt,      color: 'bg-green-600 hover:bg-green-700 text-white' },
    { label: 'Issue Demand',         href: `${base}/demands/new`,        icon: FileText,     color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { label: 'Add Supplier Bill',    href: `${base}/payables/new`,       icon: Truck,        color: 'bg-orange-600 hover:bg-orange-700 text-white' },
    { label: 'Add Subcontractor Bill', href: `${base}/subcontractors/bills/new`, icon: Building2, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: 'Add Buyer / Assign Unit', href: `${base}/buyers`,          icon: Users,        color: 'bg-violet-600 hover:bg-violet-700 text-white' },
    { label: 'Upload Document',      href: `${base}/documents/upload`,   icon: Upload,       color: 'bg-teal-600 hover:bg-teal-700 text-white' },
    { label: 'View Due',             href: `${base}/due-followup`,       icon: AlertCircle,  color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Top Sheet',            href: `${base}/reports/top-sheet`,  icon: BarChart3,    color: 'border border-border hover:bg-muted text-foreground' },
  ];

  const recentPhases = project.phases.slice(0, 6);

  return (
    <div className="p-5 space-y-5">

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                action.color
              )}
            >
              <action.icon className="h-3.5 w-3.5 shrink-0" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Row 1: Financial ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Collection"
          value={formatBDTCompact(income)}
          subtitle={formatBDT(income)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Expense"
          value={formatBDTCompact(expense)}
          subtitle={formatBDT(expense)}
          icon={TrendingDown}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Net Balance"
          value={formatBDTCompact(balance)}
          subtitle={balance >= 0 ? 'Surplus' : 'Deficit'}
          icon={balance >= 0 ? CheckCircle2 : AlertCircle}
          iconColor={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
          iconBg={balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard
          title="Buyer Due"
          value={formatBDTCompact(buyerDue)}
          subtitle={formatBDT(buyerDue)}
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* ── KPI Row 2: Payables + Counts ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Supplier Payable"
          value={formatBDTCompact(supplierPayable)}
          subtitle={formatBDT(supplierPayable)}
          icon={Truck}
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Subcontractor Payable"
          value={formatBDTCompact(subcontractorPayable)}
          subtitle={formatBDT(subcontractorPayable)}
          icon={Building2}
          iconColor="text-purple-500"
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Active Phases"
          value={String(activePhaseCount)}
          subtitle="Currently running"
          icon={Layers}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Pending Approvals"
          value={String(pendingApprovalCount)}
          subtitle="Expenses to review"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Missing Vouchers"
          value={String(missingVoucherCount)}
          subtitle="Expenses without docs"
          icon={AlertCircle}
          iconColor={missingVoucherCount > 0 ? 'text-red-500' : 'text-green-600'}
          iconBg={missingVoucherCount > 0 ? 'bg-red-50' : 'bg-green-50'}
        />
      </div>

      {/* ── Balance summary + Phase snapshot ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Balance card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Project Balance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium text-green-600">{formatBDT(income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expense</span>
                <span className="font-medium text-red-500">{formatBDT(expense)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold">
                <span>Balance</span>
                <span className={balanceColor(balance)}>{formatBDT(balance)}</span>
              </div>
            </div>
            {income > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Expense / Income</span>
                  <span>{Math.min(100, Math.round((expense / income) * 100))}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      expense > income ? 'bg-red-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(100, Math.round((expense / income) * 100))}%` }}
                  />
                </div>
              </div>
            )}
            <div className="pt-2 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Supplier payable</span>
                <span className="text-orange-600 font-medium">{formatBDT(supplierPayable)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Subcontractor payable</span>
                <span className="text-purple-600 font-medium">{formatBDT(subcontractorPayable)}</span>
              </div>
              {project.startDate && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Started</span>
                  <span>{formatDate(project.startDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Phase snapshot */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Phases</CardTitle>
            <Link
              href={`${base}/phases`}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentPhases.map((ph, i) => {
                const meta = phaseStatusMeta(ph.status);
                return (
                  <Link key={ph.id} href={`${base}/phases`}>
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ph.name}</p>
                        {ph.nameBn && (
                          <p className="text-xs bn text-muted-foreground truncate">{ph.nameBn}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                          meta.color
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {recentPhases.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No phases yet.{' '}
                  <Link href="/phases/new" className="text-primary hover:underline">
                    Add a phase
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Buyers snapshot ───────────────────────────────────── */}
      {project.buyers.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Buyers in This Project</CardTitle>
            <Link
              href={`${base}/buyers`}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y">
              {project.buyers.map(({ buyer }) => (
                <Link key={buyer.id} href={`${base}/buyers`}>
                  <div className="flex items-center gap-2.5 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {buyer.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{buyer.name}</p>
                      {buyer.phone && (
                        <p className="text-xs text-muted-foreground">{buyer.phone}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
