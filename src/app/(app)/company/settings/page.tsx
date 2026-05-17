import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanySettingsForm } from '@/components/company/company-settings-form';

export const dynamic = 'force-dynamic';

export default async function CompanySettingsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId ?? '';

  const [company, settings] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.companySetting.findMany({ where: { companyId } }),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Company Settings" />
      <div className="p-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
            <CardDescription>Company-level defaults used when creating projects and receipts.</CardDescription>
          </CardHeader>
          <CardContent>
            {company ? (
              <CompanySettingsForm initial={{
                name: company.name,
                nameBn: company.nameBn,
                logoUrl: company.logoUrl,
                address: company.address,
                phone: company.phone,
                email: company.email,
                website: company.website,
                defaultCurrency: settingMap.defaultCurrency ?? 'BDT',
                receiptPrefix: settingMap.receiptPrefix ?? 'RCP',
                defaultServiceChargePct: settingMap.defaultServiceChargePct ?? '',
                fiscalYearStart: settingMap.fiscalYearStart ?? '',
                notes: settingMap.notes ?? '',
              }} />
            ) : (
              <p className="text-sm text-muted-foreground">No company record found for your account.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
