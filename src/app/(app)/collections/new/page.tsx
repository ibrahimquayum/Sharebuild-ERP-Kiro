import { requireCompanyWidePageAccess } from '@/lib/access-control';
import RecordPaymentPage from './client-page';

export const dynamic = 'force-dynamic';

export default async function RecordPaymentPageWrapper() {
  await requireCompanyWidePageAccess('collections', 'create');
  return <RecordPaymentPage />;
}
