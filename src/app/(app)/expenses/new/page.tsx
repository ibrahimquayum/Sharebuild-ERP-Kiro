import { requireCompanyWidePageAccess } from '@/lib/access-control';
import AddExpensePage from './client-page';

export const dynamic = 'force-dynamic';

export default async function AddExpensePageWrapper() {
  await requireCompanyWidePageAccess('expenses', 'create');
  return <AddExpensePage />;
}
