'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}

/** Wraps a form control with label, optional hint and inline error */
export function Field({ label, htmlFor, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Convenience wrapper: Field + Input in one */
export function TextField({ label, error, hint, id, required, ...props }: TextFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <Field label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
      <Input
        id={fieldId}
        required={required}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
        {...props}
      />
    </Field>
  );
}

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextareaField({ label, error, hint, id, required, className, ...props }: TextareaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <Field label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
      <textarea
        id={fieldId}
        required={required}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    </Field>
  );
}

/** Inline error banner for form-level errors */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}

/** Success banner */
export function FormSuccess({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
      {message}
    </div>
  );
}

/** Section divider with label */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}
