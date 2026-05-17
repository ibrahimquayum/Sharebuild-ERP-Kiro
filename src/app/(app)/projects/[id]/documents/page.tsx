import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Download, FileText, Plus, Search } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';

export const dynamic = 'force-dynamic';

export default async function ProjectDocumentsPage({ params, searchParams }: { params: { id: string }; searchParams?: { q?: string; scope?: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const project = await prisma.project.findFirst({ where: { id: params.id, companyId }, select: { id: true, name: true } });
  if (!project) notFound();

  const q = searchParams?.q?.trim();
  const scope = searchParams?.scope?.trim();
  const documents = await prisma.document.findMany({
    where: {
      projectId: project.id,
      ...(scope ? { scope: scope as any } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { fileName: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      buyer: { select: { id: true, name: true } },
      unit: { select: { id: true, unitNo: true } },
      phase: { select: { id: true, name: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }],
  });

  const scopeCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.scope] = (acc[doc.scope] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="text-xs text-muted-foreground">{project.name} · project, buyer, unit, phase, expense, bill, and audit files</p>
        </div>
        <Link href={`/projects/${project.id}/documents/upload`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Upload
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Documents" value={String(documents.length)} subtitle="Matching current filters" icon={FileText} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Project Files" value={String(scopeCounts.PROJECT ?? 0)} subtitle="Land, approval, agreements" icon={FileText} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Buyer Files" value={String(scopeCounts.BUYER ?? 0)} subtitle="NID, photo, agreement" icon={FileText} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard title="Finance Files" value={String((scopeCounts.EXPENSE ?? 0) + (scopeCounts.SUPPLIER_BILL ?? 0) + (scopeCounts.SUBCONTRACTOR_BILL ?? 0))} subtitle="Vouchers and bills" icon={FileText} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input name="q" defaultValue={q ?? ''} placeholder="Search title, category, file name, or notes" className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
            </div>
            <select name="scope" defaultValue={scope ?? ''} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">All scopes</option>
              {['PROJECT', 'BUYER', 'UNIT', 'PHASE', 'EXPENSE', 'SUPPLIER_BILL', 'SUBCONTRACTOR_BILL', 'AUDIT'].map((item) => (
                <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
              ))}
            </select>
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Filter</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Document</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Scope</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Linked To</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">Uploaded</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">File</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No documents found. <Link href={`/projects/${project.id}/documents/upload`} className="text-primary hover:underline">Upload a document</Link>.</td></tr>
                ) : documents.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{doc.title ?? doc.fileName}</div>
                      <div className="text-xs text-muted-foreground">{doc.category ?? 'other'} · sort {doc.sortOrder}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{doc.scope.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {[doc.buyer?.name, doc.unit ? `Unit ${doc.unit.unitNo}` : '', doc.phase?.name].filter(Boolean).join(' · ') || 'Project'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                      {doc.uploadedBy?.name && <div>{doc.uploadedBy.name}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{doc.status}</td>
                    <td className="px-4 py-3 text-center">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="h-3.5 w-3.5" /> Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
