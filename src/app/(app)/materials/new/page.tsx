import { ComingSoon } from '@/components/shared/coming-soon';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function NewMaterialPage() {
  await requireCompanyWidePageAccess('settings', 'create');
  return (
    <ComingSoon
      title="Add Material Purchase"
      description="Material purchases should be entered from a project expense or supplier bill. A separate inventory purchase workflow is documented for a later pass."
    />
  );
}
