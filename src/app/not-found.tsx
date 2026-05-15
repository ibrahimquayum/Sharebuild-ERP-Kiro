import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="text-6xl font-black text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-muted-foreground text-sm max-w-sm">
        This page doesn&apos;t exist or hasn&apos;t been built yet. Check the sidebar for available pages.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
