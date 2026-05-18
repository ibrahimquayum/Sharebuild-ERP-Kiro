import { redirect } from 'next/navigation';

export default function SubcontractorBillDetailAlias({ params }: { params: { id: string; billId: string } }) {
  redirect(`/projects/${params.id}/payables/${params.billId}`);
}
