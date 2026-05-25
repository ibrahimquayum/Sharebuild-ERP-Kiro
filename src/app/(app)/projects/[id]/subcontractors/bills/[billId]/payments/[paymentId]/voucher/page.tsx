import { redirect } from 'next/navigation';

export default function SubcontractorPaymentVoucherAlias({
  params,
}: {
  params: { id: string; billId: string; paymentId: string };
}) {
  redirect(`/projects/${params.id}/payables/${params.billId}/payments/${params.paymentId}/voucher`);
}
