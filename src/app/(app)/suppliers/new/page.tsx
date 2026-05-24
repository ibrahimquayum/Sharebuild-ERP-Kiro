import { requireCompanyWidePageAccess } from '@/lib/access-control';
import AddSupplierPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function AddSupplierPageWrapper() {
  await requireCompanyWidePageAccess('suppliers', 'create');
  return <AddSupplierPage />;
}
