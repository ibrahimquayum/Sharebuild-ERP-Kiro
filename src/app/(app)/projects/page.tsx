import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBDT, formatDate } from '@/lib/utils';
import { Building2, MapPin, Phone, Layers, Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      _count: { select: { phases: true, buyers: true, units: true } },
      phases: {
        where: { status: { in: ['INCLUDED_IN_SUMMARY'] } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    PLANNING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ON_HOLD: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Projects" />
      <PageHeader
        title="All Projects"
        subtitle="Manage your construction projects"
        action={{ label: 'New Project', href: '/projects/new' }}
      />

      <div className="p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/30">
                  <CardContent className="p-5 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base leading-tight">{project.name}</h3>
                        {project.nameBn && (
                          <p className="bn text-sm text-muted-foreground mt-0.5">{project.nameBn}</p>
                        )}
                        {project.code && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{project.code}</p>
                        )}
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full font-semibold shrink-0', statusColors[project.status] ?? 'bg-gray-100 text-gray-600')}>
                        {project.status}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {project.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                      )}
                      {project.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{project.phone}</span>
                        </div>
                      )}
                      {project.startDate && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span>Started {formatDate(project.startDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{project._count.phases} phases</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{project._count.buyers} buyers</span>
                      </div>
                      {project.totalFloors && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{project.totalFloors} floors</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
