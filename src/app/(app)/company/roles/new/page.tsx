import { requireCompanyPageAccess } from '@/lib/access-control';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { RoleForm } from '@/components/company/role-form';
import { emptyPermissionMatrix } from '@/lib/company-roles';

export const dynamic = 'force-dynamic';

export default async function CompanyRoleNewPage() {
  await requireCompanyPageAccess('users', 'manageUsers');

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader title="New Role" subtitle="Create a custom role and define the permission matrix." />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <RoleForm
              mode="create"
              actionUrl="/api/company/roles"
              initialValue={{ name: '', code: '', description: '', isActive: true, permissions: emptyPermissionMatrix() }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
