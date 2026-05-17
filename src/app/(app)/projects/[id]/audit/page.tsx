import { ComingSoon } from '@/components/shared/coming-soon';
export default function ProjectAuditPage() {
  return (
    <div className="p-5">
      <ComingSoon
        title="Audit Log"
        description="Full audit trail for this project — all create, update, approve, and delete actions with user, timestamp, and before/after values. The audit_logs table is already in the database schema."
      />
    </div>
  );
}
