import Link from 'next/link';
import { ArrowRight, BarChart3, FileSpreadsheet, FileText, Printer } from 'lucide-react';

import { ReportStatusBadge } from '@/components/reports/report-document';
import { Card, CardContent } from '@/components/ui/card';
import { getScopedProject } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

const reportGroups = [
  {
    title: 'Core Project Reports',
    items: [
      {
        title: 'Complete Project Report',
        description: 'Full management and audit document with billing, treasury, vendor, compliance, and data-quality sections.',
        href: 'complete-project',
        actions: ['Print-ready', 'CSV', 'XLSX workbook'],
      },
      {
        title: 'Top Sheet',
        description: 'Preserved Excel-style phase summary for historical income, expense, and final balance review.',
        href: 'top-sheet',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Phase Summary',
        description: 'Phase-wise collection, demand, cost, service charge, and audit-lock visibility.',
        href: 'phase-summary',
        actions: ['Print-ready'],
      },
    ],
  },
  {
    title: 'Buyer & Billing',
    items: [
      {
        title: 'Buyer Statement',
        description: 'Buyer-level billing, collection, due, and advance with oldest unpaid visibility.',
        href: 'buyer-statement',
        actions: ['Print-ready'],
      },
      {
        title: 'Unit Statement',
        description: 'Unit-wise ownership, demand, due, and document visibility.',
        href: 'unit-statement',
        actions: ['Print-ready'],
      },
      {
        title: 'Due Report',
        description: 'Buyer due and unallocated collection summary for recovery follow-up.',
        href: 'due-report',
        actions: ['Print-ready'],
      },
      {
        title: 'Demand Notice / Bill',
        description: 'Per-buyer demand notices with service charge, carry-forward, due date, and signature space.',
        href: '../demands/batches',
        actions: ['Print-ready'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        title: 'Collection Report',
        description: 'Approved buyer receipt register with allocation and demand-link status.',
        href: 'collection-report',
        actions: ['Print-ready'],
      },
      {
        title: 'Expense Report',
        description: 'Detailed direct expense report with voucher, status, and supplier visibility.',
        href: 'expense-report',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Cash / Bank Book',
        description: 'Treasury movement report by account with inflow, outflow, and pending cheque exposure.',
        href: 'cash-bank-book',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Cheque Register',
        description: 'Issued and received cheque register with party, date, amount, and status.',
        href: 'cheque-register',
        actions: ['Print-ready', 'CSV'],
      },
    ],
  },
  {
    title: 'Vendor & Contractor',
    items: [
      {
        title: 'Supplier Ledger',
        description: 'Assigned supplier contracts, billed value, paid amount, due, and invoice/document quality.',
        href: 'supplier-ledger',
        actions: ['Print-ready'],
      },
      {
        title: 'Subcontractor Ledger',
        description: 'Subcontractor work-package billing, due, retention, and document quality review.',
        href: 'subcontractor-ledger',
        actions: ['Print-ready'],
      },
    ],
  },
  {
    title: 'Compliance & Audit',
    items: [
      {
        title: 'Tax / Deduction Report',
        description: 'Bill-level VAT, AIT/TDS, other deductions, and payable context.',
        href: 'tax-deductions',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Retention Report',
        description: 'Retention held, released, and outstanding balances by bill.',
        href: 'retention',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Service Charge Report',
        description: 'Service charge basis, approval status, settlement status, and billing inclusion.',
        href: 'service-charge',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Final Reconciliation',
        description: 'Preview or posted final reconciliation distribution by buyer and ownership share.',
        href: 'final-reconciliation',
        actions: ['Print-ready', 'CSV'],
      },
      {
        title: 'Audit Report',
        description: 'Audit trail, reversal visibility, voucher gaps, and reporting limitations.',
        href: 'audit-report',
        actions: ['Print-ready'],
      },
    ],
  },
];

function actionTone(label: string) {
  if (label === 'Print-ready') return 'positive' as const;
  if (label === 'CSV' || label === 'XLSX workbook') return 'info' as const;
  return 'default' as const;
}

export default async function ProjectReportsPage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'reports', 'view');

  return (
    <div className="space-y-8 px-5 py-5">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Project Reports</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{project.name}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Professional report surfaces for project finance, billing, vendor control, compliance, and audit review.
        </p>
      </div>

      <div className="space-y-8">
        {reportGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{group.title}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((report) => {
                const href = report.href.startsWith('../')
                  ? `/projects/${project.id}/${report.href.slice(3)}`
                  : `/projects/${project.id}/reports/${report.href}`;

                return (
                  <Card key={report.href} className="overflow-hidden border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          {report.actions.includes('XLSX workbook') ? (
                            <FileSpreadsheet className="h-5 w-5" />
                          ) : report.actions.includes('CSV') ? (
                            <BarChart3 className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-950">{report.title}</div>
                          <p className="text-sm leading-6 text-slate-600">{report.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {report.actions.map((label) => (
                          <ReportStatusBadge key={label} label={label} tone={actionTone(label)} />
                        ))}
                        <ReportStatusBadge label="PDF future" tone="warning" />
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Printer className="h-4 w-4" />
                          Browser print ready
                        </div>
                        <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-primary">
                          Open report
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
