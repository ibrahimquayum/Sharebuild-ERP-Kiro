import Link from 'next/link';
import { BarChart3, FileText } from 'lucide-react';
import { getScopedProject } from '@/lib/access-control';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const reportGroups = [
  {
    title: 'Core Reports',
    items: [
      { title: 'Complete Project Report', href: 'complete-project', status: 'Print + CSV' },
      { title: 'Top Sheet', href: 'top-sheet', status: 'Live' },
      { title: 'Phase Summary', href: 'phase-summary', status: 'Foundation' },
    ],
  },
  {
    title: 'Buyer Reports',
    items: [
      { title: 'Buyer Statement', href: 'buyer-statement', status: 'Foundation' },
      { title: 'Unit Statement', href: 'unit-statement', status: 'Foundation' },
      { title: 'Due Report', href: 'due-report', status: 'Foundation' },
    ],
  },
  {
    title: 'Finance Reports',
    items: [
      { title: 'Collection Report', href: 'collection-report', status: 'Foundation' },
      { title: 'Expense Report', href: 'expense-report', status: 'Foundation' },
      { title: 'Cash / Bank Book', href: 'cash-bank-book', status: 'Print + CSV' },
      { title: 'Cheque Register', href: 'cheque-register', status: 'Print + CSV' },
    ],
  },
  {
    title: 'Vendor Reports',
    items: [
      { title: 'Supplier Ledger', href: 'supplier-ledger', status: 'Foundation' },
      { title: 'Subcontractor Ledger', href: 'subcontractor-ledger', status: 'Foundation' },
    ],
  },
  {
    title: 'Compliance / Audit',
    items: [
      { title: 'Tax / Deduction Report', href: 'tax-deductions', status: 'Print + CSV' },
      { title: 'Retention Report', href: 'retention', status: 'Print + CSV' },
      { title: 'Service Charge Report', href: 'service-charge', status: 'Print + CSV' },
      { title: 'Final Reconciliation', href: 'final-reconciliation', status: 'Print + CSV' },
      { title: 'Audit Report', href: 'audit-report', status: 'Foundation' },
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
                const isFoundation = report.status === 'Foundation';
                return (
                  <Card key={report.href}>
                    <CardContent className="p-4">
                      <Link href={`/projects/${project.id}/reports/${report.href}`} className="flex items-start gap-3 hover:text-primary">
                        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {isFoundation ? <FileText className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">{report.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {isFoundation
                              ? 'Report shell is ready; deeper calculation/export still needs completion.'
                              : report.status === 'Live'
                                ? 'Live project report using the current finance formulas.'
                                : 'Professional print layout with CSV export available.'}
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
