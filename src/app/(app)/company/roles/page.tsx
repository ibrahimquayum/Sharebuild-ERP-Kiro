import Link from 'next/link';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CompanyRolesPage() {
  const context = await requireCompanyPageAccess('users', 'manageUsers');

  const roles = await prisma.companyRole.findMany({
    where: { companyId: context.companyId },
    include: { _count: { select: { users: true, permissions: true } } },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader
        title="Company Roles"
        subtitle="System roles, custom roles, and manual permission matrices."
        action={{ label: 'New Role', href: '/company/roles/new' }}
      />
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/company/users">Open Users</Link>
          </Button>
          <Button asChild>
            <Link href="/company/roles/new">Add Role</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Role', 'Code', 'Users', 'Permission Rows', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{role.name}</td>
                    <td className="px-4 py-3">{role.code ?? '-'}</td>
                    <td className="px-4 py-3">{role._count.users}</td>
                    <td className="px-4 py-3">{role._count.permissions}</td>
                    <td className="px-4 py-3">{role.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/company/roles/${role.id}`}>View</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={`/company/roles/${role.id}/edit`}>Edit</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
