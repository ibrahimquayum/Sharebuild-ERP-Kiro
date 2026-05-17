import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  ['Top Sheet', '/reports/top-sheet'],
  ['Phase Summary', '/reports/phase-summary'],
  ['Buyer Statement', '/reports/buyer-statement'],
  ['Due Report', '/reports/due-report'],
  ['Expense Report', '/reports/expenses'],
];

export default function CompanyReportsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Company Reports" />
      <PageHeader title="Company Reports" subtitle="Company-wide report entry points. Project-specific reports are inside each project workspace." />
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Reports</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reports.map(([label, href]) => <Link key={href} href={href} className="rounded-md border px-4 py-3 text-sm font-medium hover:bg-accent">{label}</Link>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
