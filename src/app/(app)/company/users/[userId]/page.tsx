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

export default async function CompanyUserDetailPage({ params }: { params: { userId: string } }) {
  const context = await requireCompanyPageAccess('users', 'view');

  const user = await prisma.user.findFirst({
    where: { id: params.userId, companyId: context.companyId },
    include: {
      companyRole: { include: { permissions: true } },
      staffAssignments: {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user) notFound();

  const permissionMatrix = user.companyRole ? rolePermissionRowsToMatrix(user.companyRole.permissions) : null;
  const visibleModules = permissionMatrix
    ? Object.entries(permissionMatrix).filter(([, actions]) => Object.values(actions).some(Boolean))
    : [];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Users & Roles" />
      <PageHeader
        title={user.name}
        subtitle="User profile, project access, and effective permission summary."
        action={context.isCompanyWide ? { label: 'Edit User', href: `/company/users/${user.id}/edit` } : undefined}
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="font-medium">Email:</span> {user.email}</div>
            <div><span className="font-medium">Phone:</span> {user.phone ?? '-'}</div>
            <div><span className="font-medium">Company Role:</span> {user.companyRole?.name ?? user.role.replaceAll('_', ' ')}</div>
            <div><span className="font-medium">Status:</span> {user.isActive ? 'Active' : 'Inactive'}</div>
            <div><span className="font-medium">Last Login:</span> {user.lastLoginAt ? user.lastLoginAt.toLocaleString() : 'Never'}</div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Assigned Projects</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user.staffAssignments.length === 0 ? (
              <p className="text-muted-foreground">No project restriction. This user currently has company-wide route visibility subject to role permissions.</p>
            ) : user.staffAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md border p-3">
                <div className="font-medium">{assignment.project.name}</div>
                <div className="text-muted-foreground">{assignment.projectRole.replaceAll('_', ' ')}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">Permission Summary</CardTitle></CardHeader>
          <CardContent>
            {visibleModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No explicit dynamic permission rows were found for this role yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleModules.map(([module, actions]) => (
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
              </div>
            )}
            <div className="mt-5">
              <Button asChild variant="outline">
                <Link href="/company/roles">Open Roles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
