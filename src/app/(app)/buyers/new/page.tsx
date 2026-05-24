import { requireCompanyWidePageAccess } from '@/lib/access-control';
import AddBuyerPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function AddBuyerPageWrapper() {
  await requireCompanyWidePageAccess('buyers', 'create');
  return <AddBuyerPage />;
}
