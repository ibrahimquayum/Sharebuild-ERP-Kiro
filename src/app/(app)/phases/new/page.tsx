'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, FormError, FormSection, Field } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PHASE_TYPE_OPTIONS = [
  { value: 'PILING',    label: 'Piling' },
  { value: 'BASEMENT',  label: 'Basement' },
  { value: 'SLAB',      label: 'Floor Slab' },
  { value: 'HALF_SLAB', label: 'Half Slab' },
  { value: 'GATHUNI',   label: 'Gathuni (Brick Masonry)' },
  { value: 'SANITARY',  label: 'Sanitary / Plumbing' },
  { value: 'FINISHING', label: 'Finishing' },
  { value: 'CUSTOM',    label: 'Custom / Other' },
];

const PHASE_STATUS_OPTIONS = [
  { value: 'DRAFT',                 label: 'Draft' },
  { value: 'ACTIVE',                label: 'Active (In Progress)' },
  { value: 'APPROVED',              label: 'Approved' },
  { value: 'INCLUDED_IN_SUMMARY',   label: 'Included in Top Sheet' },
  { value: 'EXCLUDED_FROM_SUMMARY', label: 'Excluded from Top Sheet' },
];

export default function AddPhasePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Projects list for the dropdown
  const [projects, setProjects]   = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form fields
  const [projectId,    setProjectId]   = useState('');
  const [name,         setName]        = useState('');
  const [nameBn,       setNameBn]      = useState('');
  const [phaseType,    setPhaseType]   = useState('SLAB');
  const [floorNo,      setFloorNo]     = useState('');
  const [status,       setStatus]      = useState('DRAFT');
  const [sequence,     setSequence]    = useState('');
  const [startDate,    setStartDate]   = useState('');
  const [endDate,      setEndDate]     = useState('');
  const [workDesc,     setWorkDesc]    = useState('');
  const [notes,        setNotes]       = useState('');

  // Load projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Auto-fill name when type + floor changes
  useEffect(() => {
    if (name) return; // don't overwrite if user already typed
    const floor = parseInt(floorNo, 10);
    const suffix = !isNaN(floor) ? ` ${floor}${ordinal(floor)}` : '';
    const presets: Record<string, string> = {
      PILING:    'Piling',
      BASEMENT:  'Basement',
      SLAB:      `${!isNaN(floor) ? `${floor}${ordinal(floor)} Floor` : ''} Slab`,
      HALF_SLAB: 'Half Slab',
      GATHUNI:   `Gathuni${suffix} Floor`,
      SANITARY:  'Sanitary & Plumbing',
      FINISHING: 'Finishing',
      CUSTOM:    '',
    };
    const auto = presets[phaseType];
    if (auto) setName(auto);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseType, floorNo]);

  function ordinal(n: number) {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!projectId) e.projectId = 'Please select a project.';
    if (!name.trim()) e.name = 'Phase name is required.';
    if (floorNo && isNaN(parseInt(floorNo, 10))) e.floorNo = 'Floor number must be a number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        projectId,
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        phaseType,
        status,
        sequence: sequence ? parseInt(sequence, 10) : undefined,
        workDesc: workDesc.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (floorNo) body.floorNo = parseInt(floorNo, 10);
      if (startDate) body.startDate = startDate;
      if (endDate)   body.endDate   = endDate;

      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save. Please try again.');
        return;
      }

      const phase = await res.json();
      router.push(`/phases/${phase.id}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const needsFloor = ['SLAB', 'HALF_SLAB', 'GATHUNI', 'SANITARY'].includes(phaseType);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Add Phase" />

      <div className="p-6 max-w-2xl mx-auto w-full space-y-4">
        <Link href="/phases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Phases
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Add New Construction Phase</CardTitle>
            <CardDescription>
              A phase is one construction stage — e.g. Piling, Basement, 3rd Floor Slab, Gathuni 2nd Floor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormError message={error} />

              <FormSection title="Project & Type">
                {/* Project selector */}
                <Field label="Project" htmlFor="projectId" required error={errors.projectId}>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="projectId" className={errors.projectId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={loadingProjects ? 'Loading projects…' : 'Select a project'} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                      {!loadingProjects && projects.length === 0 && (
                        <SelectItem value="__none" disabled>No projects found — create one first</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Phase type */}
                <Field label="Phase Type" htmlFor="phaseType" required>
                  <Select value={phaseType} onValueChange={v => { setPhaseType(v); setName(''); }}>
                    <SelectTrigger id="phaseType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASE_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Floor number — shown only for floor-based phases */}
                {needsFloor && (
                  <TextField
                    label="Floor Number"
                    id="floorNo"
                    type="number"
                    min={0}
                    placeholder="e.g. 3"
                    value={floorNo}
                    onChange={e => { setFloorNo(e.target.value); setName(''); }}
                    error={errors.floorNo}
                    hint="Ground floor = 0, first floor = 1, etc."
                  />
                )}
              </FormSection>

              <FormSection title="Phase Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Phase Name (English)"
                    id="name"
                    required
                    placeholder="e.g. 3rd Floor Slab"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    error={errors.name}
                  />
                  <TextField
                    label="Phase Name in Bangla"
                    id="nameBn"
                    placeholder="৩য় তলা ছাদ"
                    value={nameBn}
                    onChange={e => setNameBn(e.target.value)}
                    className="bn"
                  />
                </div>

                <TextareaField
                  label="Work Description"
                  id="workDesc"
                  placeholder="Brief description of work in this phase..."
                  value={workDesc}
                  onChange={e => setWorkDesc(e.target.value)}
                  rows={2}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Start Date"
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <TextField
                    label="Expected End Date"
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </FormSection>

              <FormSection title="Status & Order">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Status" htmlFor="status">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASE_STATUS_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <TextField
                    label="Display Order"
                    id="sequence"
                    type="number"
                    min={0}
                    placeholder="e.g. 5"
                    value={sequence}
                    onChange={e => setSequence(e.target.value)}
                    hint="Lower numbers appear first in lists"
                  />
                </div>
              </FormSection>

              <TextareaField
                label="Internal Notes (optional)"
                id="notes"
                placeholder="Any notes about this phase..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save Phase'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
