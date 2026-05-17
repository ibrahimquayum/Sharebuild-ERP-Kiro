import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CompanyContactDetailPage({ params }: { params: { id: string } }) {
  const contact = await prisma.buyer.findUnique({
    where: { id: params.id },
    include: { projectLinks: { include: { project: true } } },
  });
  if (!contact) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={contact.name} />
      <div className="p-6 max-w-4xl space-y-6">
        <Link href="/company/contacts" className="text-sm text-muted-foreground hover:text-foreground">Back to Contacts</Link>
        <Card>
          <CardHeader><CardTitle>Identity Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground uppercase">Name</p><p className="font-medium">{contact.name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Bangla Name</p><p className="bn">{contact.nameBn ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Father / Husband</p><p>{contact.fatherName ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Phone</p><p>{contact.phone ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Secondary Phone</p><p>{contact.phone2 ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">NID</p><p>{contact.nidNo ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Email</p><p>{contact.email ?? '-'}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Status</p><p>{contact.status}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground uppercase">Address</p><p>{contact.address ?? '-'}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground uppercase">Notes</p><p>{contact.notes ?? '-'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Project Memberships</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {contact.projectLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <span>{link.project.name}</span>
                <Link className="text-primary hover:underline" href={`/projects/${link.projectId}/buyers`}>Open in project</Link>
              </div>
            ))}
            {contact.projectLinks.length === 0 && <p className="text-sm text-muted-foreground">Not linked to any project yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
