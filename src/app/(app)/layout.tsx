import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PERMISSION_MODULES } from '@/lib/permissions';
import { hasPermission, requireAccessContext } from '@/lib/access-control';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const context = await requireAccessContext();
  const allowedModules = PERMISSION_MODULES.filter((module) => hasPermission(context, module, 'view'));

  return <AppShell allowedModules={allowedModules}>{children}</AppShell>;
}
