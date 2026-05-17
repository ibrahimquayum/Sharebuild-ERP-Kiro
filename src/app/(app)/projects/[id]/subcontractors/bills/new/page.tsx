import { ComingSoon } from '@/components/shared/coming-soon';
export default function NewSubcontractorBillPage() {
  return (
    <div className="p-5">
      <ComingSoon
        title="Add Subcontractor Bill"
        description="Record a new bill from a labour contractor or service provider. This form will be built in the next sprint. Use the Supplier Bills form at /payables/new as a temporary workaround — select a LABOUR_CONTRACTOR or SERVICE_PROVIDER supplier."
      />
    </div>
  );
}
