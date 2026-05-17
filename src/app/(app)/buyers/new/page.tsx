'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection } from '@/components/shared/form-field';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddBuyerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state — mirrors POST /api/buyers fields
  const [name, setName]           = useState('');
  const [nameBn, setNameBn]       = useState('');
  const [fatherName, setFather]   = useState('');
  const [phone, setPhone]         = useState('');
  const [phone2, setPhone2]       = useState('');
  const [email, setEmail]         = useState('');
  const [nidNo, setNid]           = useState('');
  const [address, setAddress]     = useState('');
  const [notes, setNotes]         = useState('');

  // Field-level errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (phone && !/^[\d\s\-+()]{6,15}$/.test(phone)) e.phone = 'Enter a valid phone number.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameBn: nameBn.trim() || undefined,
          fatherName: fatherName.trim() || undefined,
          phone: phone.trim() || undefined,
          phone2: phone2.trim() || undefined,
          email: email.trim() || undefined,
          nidNo: nidNo.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      const buyer = await res.json();
      router.push(`/company/contacts/${buyer.id}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Add Buyer" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link
          href="/company/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Buyers
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add New Buyer / Contact</CardTitle>
            <CardDescription>
              Register a buyer, investor, or land owner. Fields marked <span className="text-destructive">*</span> are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormError message={error} />

              {/* Primary Info */}
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Full Name (English)"
                    id="name"
                    required
                    placeholder="e.g. Mohammad Karim Uddin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    error={errors.name}
                  />
                  <TextField
                    label="Name in Bangla"
                    id="nameBn"
                    placeholder="মোহাম্মদ করিম উদ্দিন"
                    value={nameBn}
                    onChange={e => setNameBn(e.target.value)}
                    className="bn"
                  />
                </div>
                <TextField
                  label="Father's / Husband's Name"
                  id="fatherName"
                  placeholder="e.g. Abdul Karim"
                  value={fatherName}
                  onChange={e => setFather(e.target.value)}
                />
              </FormSection>

              {/* Contact */}
              <FormSection title="Contact Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Mobile Number"
                    id="phone"
                    type="tel"
                    placeholder="01711000000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                  <TextField
                    label="2nd Mobile Number (optional)"
                    id="phone2"
                    type="tel"
                    placeholder="01811000000"
                    value={phone2}
                    onChange={e => setPhone2(e.target.value)}
                  />
                </div>
                <TextField
                  label="Email Address (optional)"
                  id="email"
                  type="email"
                  placeholder="buyer@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  error={errors.email}
                />
              </FormSection>

              {/* ID & Address */}
              <FormSection title="Identity & Address">
                <TextField
                  label="National ID (NID) Number"
                  id="nidNo"
                  placeholder="e.g. 1234567890123"
                  value={nidNo}
                  onChange={e => setNid(e.target.value)}
                  hint="17-digit NID or old 13-digit NID"
                />
                <TextareaField
                  label="Home / Permanent Address"
                  id="address"
                  placeholder="Village, Upazila, District..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                />
              </FormSection>

              {/* Notes */}
              <TextareaField
                label="Internal Notes (optional)"
                id="notes"
                placeholder="Any notes about this buyer — flat preference, agreed price, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    'Save Buyer'
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
