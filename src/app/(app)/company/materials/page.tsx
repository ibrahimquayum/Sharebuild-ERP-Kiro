import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const materials = [
  ['Rod', 'রড', 'kg', 'Structural'],
  ['Cement', 'সিমেন্ট', 'bag', 'Structural'],
  ['Sand', 'বালি', 'cft/truck', 'Structural'],
  ['Stone', 'পাথর', 'cft', 'Structural'],
  ['Brick', 'ইট', 'pcs', 'Masonry'],
  ['Aggregate', 'এগ্রিগেট', 'cft', 'Structural'],
  ['Tiles', 'টাইলস', 'sft', 'Finishing'],
  ['Sanitary', 'স্যানিটারি', 'pcs', 'Finishing'],
  ['Electrical', 'ইলেকট্রিক্যাল', 'pcs', 'MEP'],
  ['Paint', 'রং', 'ltr', 'Finishing'],
  ['Hardware', 'হার্ডওয়্যার', 'pcs', 'General'],
  ['Transport', 'পরিবহন', 'trip', 'Logistics'],
  ['Other', 'অন্যান্য', 'unit', 'Other'],
];

export default function CompanyMaterialsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Materials" />
      <PageHeader title="Materials" subtitle="Default material master reference. Project purchases are recorded inside project workspaces." />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Schema Gap</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The database currently supports project material purchase line items, but not an editable company-level material master table. This page lists the intended defaults without writing fake backend records.
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Name', 'Bangla Name', 'Default Unit', 'Category', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>{materials.map(([name, nameBn, unit, category]) => <tr key={name} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{name}</td><td className="px-4 py-3 bn">{nameBn}</td><td className="px-4 py-3">{unit}</td><td className="px-4 py-3">{category}</td><td className="px-4 py-3">Active</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
