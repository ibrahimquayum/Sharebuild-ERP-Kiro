import { ExpenseCategory } from '@prisma/client';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompanyCategoriesPage() {
  const expenseCategories = Object.values(ExpenseCategory);
  const materialCategories = ['Structural', 'Masonry', 'Finishing', 'MEP', 'Logistics', 'General', 'Other'];
  const workCategories = ['Piling', 'Civil', 'Plumbing', 'Electrical', 'Tiles', 'Grills/Windows', 'Painting', 'Lift', 'Labour', 'Other'];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Categories" />
      <PageHeader title="Categories" subtitle="Current category references used by setup and project work." />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Schema Gap</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Expense categories are currently Prisma enums. Editable material/work category master tables do not exist yet, so this page is a read-only setup reference.</CardContent>
        </Card>
        {[['Expense Categories', expenseCategories], ['Material Categories', materialCategories], ['Work Categories', workCategories]].map(([title, rows]) => (
          <Card key={title as string}>
            <CardHeader><CardTitle className="text-base">{title as string}</CardTitle></CardHeader>
            <CardContent className="space-y-2">{(rows as string[]).map(row => <div key={row} className="rounded-md border px-3 py-2 text-sm">{row.replaceAll('_', ' ')}</div>)}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
