import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Building2, Users, Shield, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const userRole = (session?.user as any)?.role ?? '';

  const [company, users] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    COMPANY_ADMIN: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-green-100 text-green-700',
    ACCOUNTANT: 'bg-cyan-100 text-cyan-700',
    SITE_ENGINEER: 'bg-orange-100 text-orange-700',
    VIEWER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Company Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Company Information
            </CardTitle>
            <CardDescription>Your organisation details</CardDescription>
          </CardHeader>
          <CardContent>
            {company ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Company Name</p>
                  <p className="font-medium">{company.name}</p>
                  {company.nameBn && <p className="bn text-muted-foreground text-sm">{company.nameBn}</p>}
                </div>
                {company.registrationNo && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Registration No</p>
                    <p>{company.registrationNo}</p>
                  </div>
                )}
                {company.address && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Address</p>
                    <p>{company.address}</p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Phone</p>
                    <p>{company.phone}</p>
                  </div>
                )}
                {company.email && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Email</p>
                    <p>{company.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Company ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{company.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No company information found.</p>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>Users with access to this company's data</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.lastLoginAt && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        Last login {formatDate(u.lastLoginAt)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Permissions Reference */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Role Permissions
            </CardTitle>
            <CardDescription>What each role can do</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Role</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">View</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Add/Edit</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Approve</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Reports</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'COMPANY_ADMIN', view: true, edit: true, approve: true, reports: true, users: true },
                    { role: 'MANAGER', view: true, edit: true, approve: true, reports: true, users: false },
                    { role: 'ACCOUNTANT', view: true, edit: true, approve: true, reports: true, users: false },
                    { role: 'SITE_ENGINEER', view: true, edit: true, approve: false, reports: false, users: false },
                    { role: 'VIEWER', view: true, edit: false, approve: false, reports: true, users: false },
                  ].map((r) => (
                    <tr key={r.role} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[r.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.role.replace('_', ' ')}
                        </span>
                      </td>
                      {(['view', 'edit', 'approve', 'reports', 'users'] as const).map((perm) => (
                        <td key={perm} className="px-3 py-2 text-center text-lg">
                          {r[perm] ? '✅' : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Platform</p>
                <p>Sharebuild ERP v0.1</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Stack</p>
                <p>Next.js 14 · Prisma · PostgreSQL</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Your Role</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[userRole] ?? 'bg-gray-100 text-gray-600'}`}>
                  {userRole.replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Currency</p>
                <p>BDT (Bangladeshi Taka ৳)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
