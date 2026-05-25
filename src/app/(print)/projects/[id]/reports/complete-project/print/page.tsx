import { notFound } from 'next/navigation';

import { CompleteProjectPrintDocument } from '@/components/reports/complete-project-print-document';
import { getScopedProject } from '@/lib/access-control';
import { getCompleteProjectReportData } from '@/lib/complete-project-report';
import { parseProjectCostReportFilters } from '@/lib/report-controls';

export const dynamic = 'force-dynamic';

export default async function CompleteProjectReportPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const filters = parseProjectCostReportFilters(searchParams ?? {});
  const { context } = await getScopedProject(params.id, 'reports', 'view');
  const data = await getCompleteProjectReportData(context.companyId, params.id, filters);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-white print:min-h-0" data-print-document-route="true">
      <CompleteProjectPrintDocument
        data={data}
        generatedBy={(context.session?.user as { name?: string } | undefined)?.name ?? context.userId}
      />
    </main>
  );
}
