import { notFound } from 'next/navigation';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { UserProfileForm } from '@/components/company/user-profile-form';

export const dynamic = 'force-dynamic';

export default async function CompanyUserNewPage() {
  const context = await requireCompanyPageAccess('users', 'manageUsers');
  if (!context.isCompanyWide) notFound();

  const [roles, projects] = await Promise.all([
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

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader title="New User" subtitle="Create a staff profile, assign a company role, and restrict project access." />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <UserProfileForm mode="create" actionUrl="/api/company/users" roles={roles} projects={projects} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
