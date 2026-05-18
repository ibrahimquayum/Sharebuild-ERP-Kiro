import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReversalForm } from '@/components/accounting/reversal-form';

export const dynamic = 'force-dynamic';

export default async function CollectionReversePage({ params }: { params: { id: string; collectionId: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const collection = await prisma.collection.findFirst({
    where: { id: params.collectionId, phase: { projectId: params.id, project: { companyId } } },
    include: { buyer: { select: { name: true } }, phase: { select: { name: true } } },
  });
  if (!collection) notFound();

  return (
    <div className="p-5 max-w-3xl space-y-5">
      <Link href={`/projects/${params.id}/collections/${params.collectionId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to collection
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Reverse Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-semibold">{collection.buyer.name} · {formatBDT(Number(collection.amount))}</div>
            <div className="text-muted-foreground">{collection.phase.name} · {formatDate(collection.receivedDate)} · Receipt {collection.receiptNo ?? '-'}</div>
          </div>
          <p className="text-sm text-muted-foreground">This keeps the original payment visible, marks it reversed, recalculates demand paid status, and writes an audit log. Use a new corrected collection after reversal if the payment needs to be re-entered.</p>
          <ReversalForm endpoint={`/api/collections/${collection.id}/reverse`} returnHref={`/projects/${params.id}/collections/${collection.id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
