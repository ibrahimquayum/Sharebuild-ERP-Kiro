import Link from 'next/link';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CompanyUsersPage() {
  const context = await requireCompanyPageAccess('users', 'view');

  const users = await prisma.user.findMany({
    where: { companyId: context.companyId },
    include: {
      companyRole: { select: { id: true, name: true } },
      staffAssignments: {
        where: { isActive: true },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader
        title="Company Users"
        subtitle="Manage staff, company roles, and project assignments."
        action={context.isCompanyWide ? { label: 'New User', href: '/company/users/new' } : undefined}
      />

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/company/roles">Open Roles</Link>
          </Button>
          {context.isCompanyWide ? (
            <Button asChild>
              <Link href="/company/users/new">Add User</Link>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Name', 'Email', 'Phone', 'Role', 'Assigned Projects', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.phone ?? '-'}</td>
                    <td className="px-4 py-3">{user.companyRole?.name ?? user.role.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {user.staffAssignments.length > 0
                        ? user.staffAssignments.map((assignment) => assignment.project.name).join(', ')
                        : 'No project restriction'}
                    </td>
                    <td className="px-4 py-3">{user.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/company/users/${user.id}`}>View</Link>
                        </Button>
                        {context.isCompanyWide ? (
                          <Button asChild size="sm">
                            <Link href={`/company/users/${user.id}/edit`}>Edit</Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No users found for this company yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
