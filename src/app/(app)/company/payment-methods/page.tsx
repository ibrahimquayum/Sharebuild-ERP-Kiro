import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const methods = [
  ['Cash', 'No', 'No'],
  ['Bank Transfer', 'Yes', 'No'],
  ['Cheque', 'Yes', 'Yes'],
  ['bKash', 'Yes', 'No'],
  ['Nagad', 'Yes', 'No'],
  ['Rocket', 'Yes', 'No'],
  ['Other', 'No', 'No'],
];

export default function PaymentMethodsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Payment Methods" />
      <PageHeader title="Payment Methods" subtitle="Payment method defaults used by collections and payments." />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Schema Gap</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Payment methods are currently represented by the Prisma PaymentMethod enum. There is no editable company payment-method table yet, so this page does not fake persistence.</CardContent>
        </Card>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Name', 'Active', 'Requires Reference', 'Requires Cheque Date'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>{methods.map(([name, ref, cheque]) => <tr key={name} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{name}</td><td className="px-4 py-3">Yes</td><td className="px-4 py-3">{ref}</td><td className="px-4 py-3">{cheque}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
