import { ComingSoon } from '@/components/shared/coming-soon';
export default function ProjectDocumentsPage() {
  return (
    <div className="p-5">
      <ComingSoon
        title="Documents & Vouchers"
        description="All uploaded vouchers, bills, and documents for this project will be shown here. Document upload is available from individual expense records (📎 icon)."
      />
    </div>
  );
}
