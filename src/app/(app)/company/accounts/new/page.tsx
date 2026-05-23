import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccountForm } from '@/components/company/account-form';

export default function NewAccountPage() {
  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      <Header title="New Account" />
      <Link href="/company/accounts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Accounts
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Cash / Bank Account</CardTitle>
          <CardDescription>Add a company account for receiving collections and recording payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
