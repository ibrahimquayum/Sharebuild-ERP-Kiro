import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCreateForm } from '@/components/company/user-create-form';

export const dynamic = 'force-dynamic';

export default async function CompanyUsersPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      include: { _count: { select: { staffAssignments: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.project.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users / Staff" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Create User</CardTitle></CardHeader>
          <CardContent><UserCreateForm projects={projects} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Staff List</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">{['Name', 'Email', 'Phone', 'Company Role', 'Assigned Projects', 'Status'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.phone ?? '-'}</td>
                    <td className="px-4 py-3">{u.role.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">{u._count.staffAssignments}</td>
                    <td className="px-4 py-3">{u.isActive ? 'Active' : 'Inactive'}</td>
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
