import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitForm } from '@/components/projects/unit-form';

export const dynamic = 'force-dynamic';

export default async function ProjectUnitDetailPage({ params }: { params: { id: string; unitId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const unit = await prisma.unit.findFirst({
    where: { id: params.unitId, project: { id: params.id, companyId } },
    include: {
      project: { select: { id: true, name: true } },
      buyerAllocations: { include: { buyer: true } },
      demands: { include: { collections: true, phase: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      documents: { orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }] },
    },
  });
  if (!unit) notFound();

  const totalDemand = unit.demands.reduce((sum, demand) => sum + Number(demand.amount), 0);
  const totalPaid = unit.demands.reduce((sum, demand) => sum + demand.collections.reduce((s, c) => s + Number(c.amount), 0), 0);

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${unit.project.id}/units`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Units
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Unit {unit.unitNo}</CardTitle>
          </CardHeader>
          <CardContent>
            <UnitForm projectId={unit.project.id} unit={{
              id: unit.id,
              unitNo: unit.unitNo,
              floor: unit.floor,
              unitType: unit.unitType,
              status: unit.status,
              sizesqft: unit.sizesqft?.toString() ?? null,
              notes: unit.notes,
            }} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Ownership</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {unit.buyerAllocations.length === 0 ? (
                <p className="text-muted-foreground">No buyer assigned yet.</p>
              ) : unit.buyerAllocations.map((allocation) => (
                <div key={allocation.id} className="rounded-md border p-3">
                  <div className="font-semibold">{allocation.buyer.name}</div>
                  <div className="text-xs text-muted-foreground">{Number(allocation.sharePercent)}% · {allocation.relationship?.replaceAll('_', ' ')} · {allocation.isPayer ? 'payer' : 'owner only'}</div>
                  <Link href={`/projects/${unit.project.id}/buyers/${allocation.buyer.id}`} className="text-xs text-primary hover:underline">Open project buyer detail</Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Unit Balance</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Demand</span><span className="font-semibold">{formatBDT(totalDemand)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-semibold text-green-600">{formatBDT(totalPaid)}</span></div>
              <div className="flex justify-between border-t pt-2"><span>Due / Advance</span><span className="font-bold">{formatBDT(totalDemand - totalPaid)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {unit.documents.length === 0 ? <p className="text-muted-foreground">No unit documents.</p> : unit.documents.map((doc) => (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block rounded-md border p-2 hover:bg-muted/40">
                  <div className="font-medium">{doc.title ?? doc.fileName}</div>
                  <div className="text-xs text-muted-foreground">{doc.category ?? 'other'} · {formatDate(doc.uploadedAt)}</div>
                </a>
              ))}
              <Link href={`/projects/${unit.project.id}/documents/upload`} className="text-xs text-primary hover:underline">Upload document</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
