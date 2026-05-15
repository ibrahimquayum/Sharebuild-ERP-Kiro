'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, FormError, FormSection } from '@/components/shared/form-field';
import { Loader2, ArrowLeft, Upload, FileText, Image, X, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MAX_MB   = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED   = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

interface UploadedDoc {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export default function ExpenseUploadPage() {
  const router    = useRouter();
  const params    = useParams<{ id: string }>();
  const expenseId = params.id;

  const fileRef = useRef<HTMLInputElement>(null);

  const [file,        setFile]        = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [uploaded,    setUploaded]    = useState<UploadedDoc[]>([]);

  function handleFileSelect(selected: File) {
    setError('');
    if (!ALLOWED.includes(selected.type)) {
      setError('Only JPG, PNG, WebP, and PDF files are allowed.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a file first.'); return; }
    setError('');
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('expenseId', expenseId);
      if (description.trim()) form.append('description', description.trim());

      const res = await fetch('/api/documents', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? 'Upload failed. Please try again.');
        return;
      }

      const doc = await res.json();
      setUploaded(prev => [doc, ...prev]);
      setFile(null);
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  function fileIcon(type: string) {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-red-500" />;
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Upload Voucher" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/expenses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Expenses
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Upload Voucher / Attachment</CardTitle>
            <CardDescription>
              Attach a bill photo, scanned invoice, or PDF to this expense record.
              Accepted: JPG, PNG, PDF · Max {MAX_MB} MB per file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} noValidate className="space-y-5">
              <FormError message={error} />

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">Click to select or drag &amp; drop a file</p>
                    <p className="text-xs">JPG · PNG · PDF · Max {MAX_MB} MB</p>
                  </div>
                )}
              </div>

              <TextField
                label="Description (optional)"
                id="description"
                placeholder="e.g. Cement bill from ABC Supplier, August 2024"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={uploading || !file} className="min-w-[130px]">
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Upload File'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>Done</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Uploaded files in this session */}
        {uploaded.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Uploaded in this session</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {uploaded.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    {fileIcon(doc.fileType ?? '')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
