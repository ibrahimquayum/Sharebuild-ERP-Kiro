import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function friendlyLabel(value: string | null) {
  if (!value) return null;
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams?: { module?: string; action?: string; projectId?: string };
}) {
  const module = friendlyLabel(searchParams?.module ?? null);
  const action = friendlyLabel(searchParams?.action ?? null);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Access Denied" />
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">You don&apos;t have access to this area</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is signed in, but this page or action is outside your assigned permissions or project scope.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {(module || action) ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                {module ? <p><span className="font-medium">Module:</span> {module}</p> : null}
                {action ? <p><span className="font-medium">Action:</span> {action}</p> : null}
              </div>
            ) : null}

            <div className="text-sm text-muted-foreground space-y-2">
              <p>If you should be able to do this work, ask your company admin to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>assign you to the correct project,</li>
                <li>grant the right module permissions, or</li>
                <li>move the task to a role with approval or export access.</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/projects">View My Projects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
