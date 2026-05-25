import { notFound } from 'next/navigation';

import {
  ReportDocumentLayout,
  ReportKpiCard,
  ReportSection,
  ReportSignatureBlock,
  ReportSummaryGrid,
  ReportTable,
} from '@/components/reports/report-document';
import { getProjectDocumentContext } from '@/lib/project-report-page';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CollectionReceiptPage({
  params,
}: {
  params: { id: string; collectionId: string };
}) {
  const { context, project, branding } = await getProjectDocumentContext(params.id, 'collections', 'view');

  const [collection, createdAudit] = await Promise.all([
    prisma.collection.findFirst({
      where: { id: params.collectionId, phase: { projectId: project.id, project: { companyId: context.companyId } } },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
        phase: { select: { id: true, name: true } },
        demand: { include: { unit: { select: { unitNo: true } } } },
        account: { select: { name: true, type: true, bankName: true, accountNumber: true } },
        allocations: {
          include: {
            demand: {
              include: {
                phase: { select: { name: true } },
                unit: { select: { unitNo: true } },
              },
            },
          },
        },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        entityType: 'collection',
        entityId: params.collectionId,
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!collection) notFound();

  const buyerMembership = await prisma.projectBuyer.findFirst({
    where: { projectId: project.id, buyerId: collection.buyerId },
    include: {
      buyer: {
        include: {
          unitAllocations: {
            where: { unit: { projectId: project.id } },
            include: { unit: { select: { unitNo: true } } },
            orderBy: [{ unit: { floor: 'asc' } }, { unit: { unitNo: 'asc' } }],
          },
        },
      },
    },
  });

  const allocatedAmount = collection.allocations.reduce((sum, row) => sum + Number(row.amount), 0);
  const advanceAmount = Math.max(Number(collection.amount) - allocatedAmount, 0);
  const units = collection.demand?.unit?.unitNo
    ? [collection.demand.unit.unitNo]
    : buyerMembership?.buyer.unitAllocations.map((row) => row.unit.unitNo) ?? [];
  const receivedBy = createdAudit?.user?.name ?? 'Accounts office / imported record';

  return (
    <ReportDocumentLayout
      branding={{ ...branding, reportFooterNote: 'Buyer money receipt generated from Sharebuild ERP.' }}
      project={{
        id: project.id,
        name: project.name,
        code: project.code,
        address: project.address,
        phone: project.phone,
      }}
      title="Buyer Money Receipt"
      subtitle={`Receipt ${collection.receiptNo ?? collection.id}`}
      generatedAt={new Date()}
      backHref={`/projects/${project.id}/collections/${collection.id}`}
      backLabel="Back to Collection Detail"
    >
      <ReportSummaryGrid>
        <ReportKpiCard label="Amount Received" value={formatBDT(Number(collection.amount))} tone="positive" />
        <ReportKpiCard label="Allocated" value={formatBDT(allocatedAmount)} tone="info" />
        <ReportKpiCard label="Advance" value={formatBDT(advanceAmount)} tone={advanceAmount > 0 ? 'warning' : 'default'} />
        <ReportKpiCard label="Received On" value={formatDate(collection.receivedDate)} />
      </ReportSummaryGrid>

      <ReportSection title="Receipt Summary" description="Project-scoped buyer receipt with allocation and advance visibility.">
        <ReportTable>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 w-[240px] font-medium text-slate-900">Receipt Number</td>
              <td className="px-4 py-3 text-sm text-slate-600">{collection.receiptNo ?? collection.id}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Buyer</td>
              <td className="px-4 py-3 text-sm text-slate-600">{collection.buyer.name} {collection.buyer.phone ? `| ${collection.buyer.phone}` : ''}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Project / Phase</td>
              <td className="px-4 py-3 text-sm text-slate-600">{project.name} | {collection.phase.name}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Unit(s)</td>
              <td className="px-4 py-3 text-sm text-slate-600">{units.length ? units.join(', ') : 'Buyer-level receipt without linked unit demand'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Payment Method / Account</td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {collection.paymentMethod.replaceAll('_', ' ')}
                {collection.account ? ` | ${collection.account.name}` : ''}
                {collection.reference ? ` | Ref: ${collection.reference}` : ''}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Amount Received</td>
              <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatBDT(Number(collection.amount))}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Allocated to Demands</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(allocatedAmount)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Advance Amount</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatBDT(advanceAmount)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 font-medium text-slate-900">Received By</td>
              <td className="px-4 py-3 text-sm text-slate-600">{receivedBy}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-900">Notes</td>
              <td className="px-4 py-3 text-sm text-slate-600">{collection.notes || 'Recorded collection receipt.'}</td>
            </tr>
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection title="Allocation Details" description="Demand and phase allocation against the received amount.">
        <ReportTable dense>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Demand</th>
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Allocated</th>
            </tr>
          </thead>
          <tbody>
            {collection.allocations.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={4}>No demand allocation found. This receipt currently remains advance / unallocated.</td>
              </tr>
            ) : (
              collection.allocations.map((allocation) => (
                <tr key={allocation.id} className="border-b border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-900">{allocation.demand.title}</td>
                  <td className="px-3 py-3 text-slate-700">{allocation.demand.phase?.name ?? collection.phase.name}</td>
                  <td className="px-3 py-3 text-slate-700">{allocation.demand.unit.unitNo}</td>
                  <td className="px-3 py-3 text-right text-slate-900">{formatBDT(Number(allocation.amount))}</td>
                </tr>
              ))
            )}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSignatureBlock labels={['Received by', 'Accounts officer', 'Authorized signature']} />
    </ReportDocumentLayout>
  );
}
