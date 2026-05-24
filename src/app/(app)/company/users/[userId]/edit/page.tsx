import { notFound } from 'next/navigation';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { UserProfileForm } from '@/components/company/user-profile-form';

export const dynamic = 'force-dynamic';

export default async function CompanyUserEditPage({ params }: { params: { userId: string } }) {
  const context = await requireCompanyPageAccess('users', 'manageUsers');

  const [user, roles, projects] = await Promise.all([
    prisma.user.findFirst({
      where: { id: params.userId, companyId: context.companyId },
      include: {
        staffAssignments: {
          where: { isActive: true },
          select: { projectId: true, projectRole: true },
        },
      },
    }),
    prisma.companyRole.findMany({
      where: { companyId: context.companyId, isActive: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, code: true },
    }),
    prisma.project.findMany({
      where: { companyId: context.companyId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);
  if (!user) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader title={`Edit ${user.name}`} subtitle="Update profile, company role, and project access." />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <UserProfileForm
              mode="edit"
              actionUrl={`/api/company/users/${user.id}`}
              roles={roles}
              projects={projects}
              initialValue={{
                name: user.name,
                email: user.email,
                phone: user.phone,
                roleId: user.companyRoleId,
                isActive: user.isActive,
                assignedProjectIds: user.staffAssignments.map((assignment) => assignment.projectId),
                projectRole: user.staffAssignments[0]?.projectRole ?? 'SITE_ENGINEER',
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
