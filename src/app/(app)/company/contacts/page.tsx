import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CompanyContactsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';
  const contacts = await prisma.buyer.findMany({
    where: { companyId },
    include: { _count: { select: { projectLinks: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Contacts / Buyers" />
      <PageHeader title="Contacts / Buyers" subtitle="Company-level identity records. Project balances live inside project workspaces." action={{ label: 'New Contact', href: '/company/contacts/new' }} />
      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Name', 'Phone', 'NID', 'Email', 'Status', 'Projects', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{contact.name}{contact.nameBn && <div className="bn text-xs text-muted-foreground">{contact.nameBn}</div>}</td>
                    <td className="px-4 py-3">{contact.phone ?? '-'}</td>
                    <td className="px-4 py-3">{contact.nidNo ?? '-'}</td>
                    <td className="px-4 py-3">{contact.email ?? '-'}</td>
                    <td className="px-4 py-3">{contact.status}</td>
                    <td className="px-4 py-3">{contact._count.projectLinks}</td>
                    <td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/company/contacts/${contact.id}`}>View</Link></td>
                  </tr>
                ))}
                {contacts.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>No contacts yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
