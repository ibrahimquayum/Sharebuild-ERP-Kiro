import { redirect } from 'next/navigation';

export default function SubcontractorBillInvoiceAlias({
  params,
}: {
  params: { id: string; billId: string };
}) {
  redirect(`/projects/${params.id}/payables/${params.billId}/invoice`);
}
