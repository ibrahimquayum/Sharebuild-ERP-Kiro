import Link from 'next/link';
import { Building2, Layers, MapPin, ReceiptText, Users } from 'lucide-react';

import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { requireCompanyPageAccess } from '@/lib/access-control';
import { getProjectFinanceSummary } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';
import { balanceColor, cn, formatBDT, normalizeDisplayText } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const context = await requireCompanyPageAccess('projects', 'view');
  const scopedProjectIds = context.isCompanyWide ? undefined : context.activeProjectIds;

  const projects = await prisma.project.findMany({
    where: {
      companyId: context.companyId,
      ...(scopedProjectIds ? { id: { in: scopedProjectIds } } : {}),
    },
    include: {
      _count: { select: { phases: true, buyers: true, units: true } },
      phases: {
        where: { status: { in: ['ACTIVE', 'INCLUDED_IN_SUMMARY'] } },
        select: { id: true, name: true, nameBn: true, status: true, sequence: true },
        orderBy: [{ status: 'asc' }, { sequence: 'asc' }],
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const financeSummaries = await Promise.all(projects.map((project) => getProjectFinanceSummary(project.id)));

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    PLANNING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ON_HOLD: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Projects" />
      <PageHeader
        title="All Projects"
        subtitle={context.isCompanyWide ? 'Project health, billing, and cost position in one view' : 'Projects assigned to you'}
        action={context.isCompanyWide ? { label: 'New Project', href: '/projects/new' } : undefined}
      />

      <div className="w-full max-w-[1440px] p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Building2 className="mb-4 h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="mt-1 text-sm">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => {
              const finance = financeSummaries[index];
              const currentPhase = project.phases[0];

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="h-full cursor-pointer rounded-xl border border-slate-200 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold leading-tight">{project.name}</h3>
                          {project.nameBn ? (
                            <p className="bn mt-0.5 truncate text-sm text-muted-foreground">
                              {normalizeDisplayText(project.nameBn)}
                            </p>
                          ) : null}
                          {project.code ? <p className="mt-0.5 font-mono text-xs text-muted-foreground">{project.code}</p> : null}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-1 text-xs font-semibold',
                            statusColors[project.status] ?? 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {project.status}
                        </span>
                      </div>

                      {project.address ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Service charge</p>
                          <p className="font-semibold text-slate-900">{Number(project.defaultServiceChargePct ?? 0).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current phase</p>
                          <p className="truncate font-semibold text-slate-900">
                            {currentPhase ? currentPhase.name : 'Not set'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{project._count.phases} phases</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{project._count.buyers} buyers</span>
                        </div>
                        <div className="text-muted-foreground">Units / floors</div>
                        <div className="font-medium text-slate-900">
                          {project._count.units} / {project.totalFloors ?? 0}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Total Collection</p>
                          <p className="font-medium text-emerald-700">{formatBDT(finance.totalCollected)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Actual Construction Cost</p>
                          <p className="font-medium text-rose-700">{formatBDT(finance.projectCostTotal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Billable Cost</p>
                          <p className="font-medium text-slate-900">
                            {formatBDT(finance.projectCostTotal + finance.serviceChargeAccrued)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Buyer Due</p>
                          <p className="font-medium text-amber-700">{formatBDT(finance.buyerDue)}</p>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t pt-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ReceiptText className="h-4 w-4" />
                          <span>Allocated {formatBDT(finance.allocatedCollection)}</span>
                        </div>
                        <div className={cn('font-semibold', balanceColor(finance.finalSurplusDeficit))}>
                          {formatBDT(finance.finalSurplusDeficit)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
