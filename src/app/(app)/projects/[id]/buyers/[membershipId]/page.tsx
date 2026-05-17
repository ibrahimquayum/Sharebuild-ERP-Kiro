import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, FileText } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ProjectBuyerDetailPage({ params }: { params: { id: string; membershipId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const membership = await prisma.projectBuyer.findFirst({
    where: {
      projectId: params.id,
      project: { companyId },
      OR: [{ id: params.membershipId }, { buyerId: params.membershipId }],
    },
    include: {
      project: { select: { id: true, name: true } },
      buyer: {
        include: {
          unitAllocations: {
            where: { unit: { projectId: params.id } },
            include: { unit: true },
          },
          demands: {
            where: { unit: { projectId: params.id } },
            include: { collections: true, phase: { select: { name: true } }, unit: { select: { unitNo: true } } },
            orderBy: { createdAt: 'desc' },
          },
          collections: {
            where: { phase: { projectId: params.id } },
            include: { phase: { select: { name: true } }, demand: { select: { title: true } } },
            orderBy: { receivedDate: 'desc' },
          },
          documents: {
            where: { projectId: params.id },
            orderBy: [{ sortOrder: 'asc' }, { uploadedAt: 'desc' }],
          },
        },
      },
    },
  });
  if (!membership) notFound();

  const buyer = membership.buyer;
  const totalDemand = buyer.demands.reduce((sum, demand) => sum + Number(demand.amount), 0);
  const totalPaid = buyer.collections.reduce((sum, collection) => sum + Number(collection.amount), 0);

  return (
    <div className="p-5 space-y-5">
      <Link href={`/projects/${membership.project.id}/buyers`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Buyers & Ownership
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{buyer.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Phone</span><div className="font-medium">{buyer.phone ?? '-'}</div></div>
              <div><span className="text-muted-foreground">NID</span><div className="font-medium">{buyer.nidNo ?? '-'}</div></div>
              <div><span className="text-muted-foreground">Email</span><div className="font-medium">{buyer.email ?? '-'}</div></div>
              <div><span className="text-muted-foreground">Status</span><div className="font-medium">{buyer.status}</div></div>
              <div className="md:col-span-2"><span className="text-muted-foreground">Address</span><div className="font-medium">{buyer.address ?? '-'}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Ledger</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Demand</th>
                    <th className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {buyer.demands.map((demand) => (
                    <tr key={demand.id} className="border-b">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(demand.createdAt)}</td>
                      <td className="px-4 py-2">{demand.title}<div className="text-xs text-muted-foreground">{demand.phase?.name} · Unit {demand.unit.unitNo}</div></td>
                      <td className="px-4 py-2 text-right font-medium">{formatBDT(Number(demand.amount))}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatBDT(demand.collections.reduce((sum, c) => sum + Number(c.amount), 0))}</td>
                    </tr>
                  ))}
                  {buyer.collections.filter((c) => !c.demandId).map((collection) => (
                    <tr key={collection.id} className="border-b">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(collection.receivedDate)}</td>
                      <td className="px-4 py-2">Collection<div className="text-xs text-muted-foreground">{collection.phase.name}</div></td>
                      <td className="px-4 py-2 text-right">-</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatBDT(Number(collection.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold">
                    <td colSpan={2} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{formatBDT(totalDemand)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatBDT(totalPaid)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm">Project Balance</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Demand</span><span>{formatBDT(totalDemand)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-600">{formatBDT(totalPaid)}</span></div>
              <div className="flex justify-between border-t pt-2 font-bold"><span>Due / Advance</span><span>{formatBDT(totalDemand - totalPaid)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Unit Ownership</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {buyer.unitAllocations.map((allocation) => (
                <Link key={allocation.id} href={`/projects/${membership.project.id}/units/${allocation.unit.id}`} className="block rounded-md border p-3 hover:bg-muted/40">
                  <div className="font-semibold">Unit {allocation.unit.unitNo}</div>
                  <div className="text-xs text-muted-foreground">{Number(allocation.sharePercent)}% · {allocation.relationship?.replaceAll('_', ' ')} · {allocation.isPayer ? 'payer' : 'payer differs'}</div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {buyer.documents.length === 0 ? <p className="text-sm text-muted-foreground">No project buyer documents.</p> : buyer.documents.map((doc) => (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block rounded-md border p-2 text-sm hover:bg-muted/40">
                  <div className="font-medium">{doc.title ?? doc.fileName}</div>
                  <div className="text-xs text-muted-foreground">{doc.category ?? 'other'} · {formatDate(doc.uploadedAt)}</div>
                </a>
              ))}
              <Link href={`/projects/${membership.project.id}/documents/upload?buyerId=${buyer.id}`} className="text-xs text-primary hover:underline">Upload buyer document</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
