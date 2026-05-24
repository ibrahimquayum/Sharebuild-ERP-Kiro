import { requireCompanyWidePageAccess } from '@/lib/access-control';
import AddPhasePage from './client-page';

export const dynamic = 'force-dynamic';

export default async function AddPhasePageWrapper() {
  await requireCompanyWidePageAccess('phases', 'create');
  return <AddPhasePage />;
}
