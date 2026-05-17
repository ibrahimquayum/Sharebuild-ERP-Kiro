import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectForm } from '@/components/projects/project-form';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="New Project" />
      <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create Project</CardTitle>
            <CardDescription>Set up the project profile before adding phases, units, buyers, and money records.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
