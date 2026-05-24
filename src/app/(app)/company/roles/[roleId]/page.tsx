import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { permissionLabelFromCode, rolePermissionRowsToMatrix } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function CompanyRoleDetailPage({ params }: { params: { roleId: string } }) {
  const context = await requireCompanyPageAccess('users', 'manageUsers');

  const role = await prisma.companyRole.findFirst({
    where: { id: params.roleId, companyId: context.companyId },
    include: {
      permissions: true,
      users: { select: { id: true, name: true, email: true, isActive: true } },
    },
  });
  if (!role) notFound();

  const matrix = rolePermissionRowsToMatrix(role.permissions);
  const activeModules = Object.entries(matrix).filter(([, actions]) => Object.values(actions).some(Boolean));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader title={role.name} subtitle={role.description ?? 'Role permission summary and assigned users.'} action={{ label: 'Edit Role', href: `/company/roles/${role.id}/edit` }} />
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle className="text-base">Role Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="font-medium">Code:</span> {role.code ?? '-'}</div>
            <div><span className="font-medium">System Role:</span> {role.isSystem ? 'Yes' : 'No'}</div>
            <div><span className="font-medium">Status:</span> {role.isActive ? 'Active' : 'Inactive'}</div>
            <div><span className="font-medium">Users Assigned:</span> {role.users.length}</div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Assigned Users</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {role.users.length === 0 ? (
              <p className="text-muted-foreground">No users are currently assigned to this role.</p>
            ) : role.users.map((user) => (
              <div key={user.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground">{user.email}</div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/company/users/${user.id}`}>View User</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">Permission Matrix</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeModules.map(([module, actions]) => (
              <div key={module} className="rounded-lg border p-4">
                <div className="font-semibold">{permissionLabelFromCode(module)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {Object.entries(actions)
                    .filter(([, allowed]) => allowed)
                    .map(([action]) => permissionLabelFromCode(action))
                    .join(', ')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
