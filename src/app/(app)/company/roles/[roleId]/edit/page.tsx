import { notFound } from 'next/navigation';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { RoleForm } from '@/components/company/role-form';
import { rolePermissionRowsToMatrix } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function CompanyRoleEditPage({ params }: { params: { roleId: string } }) {
  const context = await requireCompanyPageAccess('users', 'manageUsers');

  const role = await prisma.companyRole.findFirst({
    where: { id: params.roleId, companyId: context.companyId },
    include: { permissions: true },
  });
  if (!role) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader title={`Edit ${role.name}`} subtitle="Adjust module-level permissions and role status." />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <RoleForm
              mode="edit"
              actionUrl={`/api/company/roles/${role.id}`}
              initialValue={{
                name: role.name,
                code: role.code,
                description: role.description,
                isActive: role.isActive,
                permissions: rolePermissionRowsToMatrix(role.permissions),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
