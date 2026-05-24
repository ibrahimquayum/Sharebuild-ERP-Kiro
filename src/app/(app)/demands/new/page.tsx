import { ComingSoon } from '@/components/shared/coming-soon';
import { requireCompanyWidePageAccess } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export default async function NewDemandPage() {
  await requireCompanyWidePageAccess('demands', 'create');
  return (
    <ComingSoon
      title="Issue Demand Notice"
      description="Demand notice form is legacy/global. Use project demand batches for service-charge-aware billing."
    />
  );
}
