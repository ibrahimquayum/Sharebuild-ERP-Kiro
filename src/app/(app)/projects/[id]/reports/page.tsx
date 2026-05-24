import Link from 'next/link';
import { BarChart3, FileText } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const reportGroups = [
  {
    title: 'Core Reports',
    items: [
      { title: 'Complete Project Report', href: 'complete-project', print: true, csv: true, xlsx: true, pdf: false, next: false },
      { title: 'Top Sheet', href: 'top-sheet', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Phase Summary', href: 'phase-summary', print: true, csv: false, xlsx: false, pdf: false, next: true },
    ],
  },
  {
    title: 'Buyer Reports',
    items: [
      { title: 'Buyer Statement', href: 'buyer-statement', print: true, csv: false, xlsx: false, pdf: false, next: true },
      { title: 'Unit Statement', href: 'unit-statement', print: true, csv: false, xlsx: false, pdf: false, next: true },
      { title: 'Due Report', href: 'due-report', print: true, csv: false, xlsx: false, pdf: false, next: true },
      { title: 'Demand Notice / Bill', href: '../demands/batches', print: true, csv: false, xlsx: false, pdf: false, next: false },
    ],
  },
  {
    title: 'Finance Reports',
    items: [
      { title: 'Collection Report', href: 'collection-report', print: true, csv: false, xlsx: false, pdf: false, next: true },
      { title: 'Expense Report', href: 'expense-report', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Cash / Bank Book', href: 'cash-bank-book', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Cheque Register', href: 'cheque-register', print: true, csv: true, xlsx: false, pdf: false, next: false },
    ],
  },
  {
    title: 'Vendor Reports',
    items: [
      { title: 'Supplier Ledger', href: 'supplier-ledger', print: true, csv: false, xlsx: false, pdf: false, next: true },
      { title: 'Subcontractor Ledger', href: 'subcontractor-ledger', print: true, csv: false, xlsx: false, pdf: false, next: true },
    ],
  },
  {
    title: 'Compliance / Audit',
    items: [
      { title: 'Tax / Deduction Report', href: 'tax-deductions', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Retention Report', href: 'retention', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Service Charge Report', href: 'service-charge', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Final Reconciliation', href: 'final-reconciliation', print: true, csv: true, xlsx: false, pdf: false, next: false },
      { title: 'Audit Report', href: 'audit-report', print: true, csv: false, xlsx: false, pdf: false, next: true },
    ],
  },
];

export default async function ProjectReportsPage({ params }: { params: { id: string } }) {
  const { project } = await getScopedProject(params.id, 'reports', 'view');

  return (
    <div className="p-5 space-y-6">
      <div>
        <h2 className="text-base font-semibold">Reports</h2>
        <p className="text-xs text-muted-foreground">
          {project.name} · grouped, branded, print-ready reporting surfaces
        </p>
      </div>

      <div className="space-y-5">
        {reportGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map((report) => {
                const href = report.href.startsWith('../') ? `/projects/${project.id}/${report.href.slice(3)}` : `/projects/${project.id}/reports/${report.href}`;
                const features = [
                  ['Print-ready', report.print],
                  ['CSV export', report.csv],
                  ['Excel workbook', report.xlsx],
                  ['PDF', report.pdf],
                  ['Coming next', report.next],
                ];
                return (
                  <Card key={report.href}>
                    <CardContent className="p-4">
                      <Link href={href} className="flex items-start gap-3 hover:text-primary">
                        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {report.csv || report.xlsx ? <BarChart3 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="space-y-2">
                          <div className="font-semibold">{report.title}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {features.map(([label, enabled]) => (
                              <span
                                key={String(label)}
                                className={`rounded border px-1.5 py-0.5 text-[11px] ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-muted bg-muted/40 text-muted-foreground'}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
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
