'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormSection, TextareaField, TextField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash / Nagad)' },
  { value: 'OTHER', label: 'Other' },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function ProjectCollectionNewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [buyers, setBuyers] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [phases, setPhases] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string; isDefault?: boolean }[]>([]);
  const [demands, setDemands] = useState<
    { id: string; title: string; phaseId: string | null; phaseName: string; unitNo: string; due: number; dueDate: string | null; status: string }[]
  >([]);

  const [buyerId, setBuyerId] = useState(searchParams.get('buyerId') ?? '');
  const [phaseId, setPhaseId] = useState(searchParams.get('phaseId') ?? '');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [receivedDate, setReceivedDate] = useState(today());
  const [receiptNo, setReceiptNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeBranchName, setChequeBranchName] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/buyers?projectId=${projectId}`).then((r) => r.json()),
      fetch(`/api/phases?projectId=${projectId}`).then((r) => r.json()),
      fetch('/api/company/accounts').then((r) => r.json()),
    ])
      .then(([buyersResponse, phasesResponse, accountsResponse]) => {
        setBuyers(Array.isArray(buyersResponse) ? buyersResponse : []);
        setPhases(Array.isArray(phasesResponse) ? phasesResponse : []);
        const accountList = Array.isArray(accountsResponse) ? accountsResponse : [];
        setAccounts(accountList);
        if (accountList.length > 0) {
          const defaultAccount = accountList.find((account) => account.isDefault) ?? accountList[0];
          setAccountId(defaultAccount.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!buyerId) {
      setDemands([]);
      return;
    }
    fetch(`/api/projects/${projectId}/demands?buyerId=${buyerId}&unpaidOnly=true`)
      .then((r) => r.json())
      .then((data) => setDemands(Array.isArray(data) ? data : []))
      .catch(() => setDemands([]));
  }, [buyerId, projectId]);

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!buyerId) nextErrors.buyerId = 'Please select a buyer.';
    if (!phaseId) nextErrors.phaseId = 'Please select a phase.';
    if (!accountId) nextErrors.accountId = 'Please select the receiving account.';
    const numericAmount = parseFloat(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Enter a valid amount greater than zero.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        buyerId,
        phaseId,
        accountId,
        amount: parseFloat(amount),
        paymentMethod,
        receivedDate,
        allocationMode: 'FIFO',
      };
      if (receiptNo) body.receiptNo = receiptNo.trim();
      if (chequeNo) body.chequeNo = chequeNo.trim();
      if (chequeDate) body.chequeDate = chequeDate;
      if (bankName) body.bankName = bankName.trim();
      if (chequeBranchName) body.chequeBranchName = chequeBranchName.trim();
      if (chequeMaturityDate) body.chequeMaturityDate = chequeMaturityDate;
      if (reference) body.reference = reference.trim();
      if (notes) body.notes = notes.trim();

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error?.message ?? data?.error ?? 'Failed to save.');
        return;
      }

      router.push(`/projects/${projectId}/collections`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const showCheque = paymentMethod === 'CHEQUE';
  const showBank = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'MOBILE_BANKING';

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <Link href={`/projects/${projectId}/collections`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Collections
      </Link>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Record Buyer Payment</CardTitle>
          <CardDescription>Money received from a buyer into a selected cash or bank account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormError message={error} />

            <FormSection title="Who Paid And For Which Phase">
              <Field label="Buyer / Investor" htmlFor="buyerId" required error={errors.buyerId}>
                <Select value={buyerId} onValueChange={setBuyerId}>
                  <SelectTrigger id="buyerId" className={errors.buyerId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading...' : buyers.length === 0 ? 'No buyers in this project' : 'Select buyer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map((buyer) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.name}
                        {buyer.phone ? ` - ${buyer.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Phase" htmlFor="phaseId" required error={errors.phaseId}>
                <Select value={phaseId} onValueChange={setPhaseId}>
                  <SelectTrigger id="phaseId" className={errors.phaseId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={loading ? 'Loading...' : phases.length === 0 ? 'No phases in this project' : 'Select phase'} />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Receipt Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Amount Received (BDT)"
                  id="amount"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  placeholder="e.g. 250000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  error={errors.amount}
                />
                <TextField label="Date Received" id="receivedDate" type="date" required value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} />
              </div>
              <Field label="Received Into Account" htmlFor="accountId" required error={errors.accountId}>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="accountId" className={errors.accountId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={accounts.length === 0 ? 'No active accounts found' : 'Select account'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.type.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Payment Method" htmlFor="paymentMethod" required>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <TextField label="Receipt Number (optional)" id="receiptNo" placeholder="e.g. RCP-2024-001" value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} />
            </FormSection>

            {buyerId && (
              <FormSection title="Unpaid Demands">
                <div className="rounded-md border divide-y text-sm">
                  {demands.length === 0 ? (
                    <div className="p-3 text-muted-foreground">No unpaid demands found for this buyer. Payment will be recorded as advance or credit for the selected phase.</div>
                  ) : (
                    demands
                      .filter((demand) => !phaseId || demand.phaseId === phaseId)
                      .slice(0, 6)
                      .map((demand) => (
                        <div key={demand.id} className="flex items-center justify-between gap-3 p-3">
                          <div>
                            <div className="font-medium">{demand.title} - Unit {demand.unitNo}</div>
                            <div className="text-xs text-muted-foreground">{demand.phaseName} - {demand.status}</div>
                          </div>
                          <div className="font-semibold">BDT {demand.due.toLocaleString()}</div>
                        </div>
                      ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Allocation uses FIFO: oldest unpaid demand first. Any excess remains as advance or credit.</p>
              </FormSection>
            )}

            {showCheque && (
              <FormSection title="Cheque Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Cheque Number" id="chequeNo" placeholder="e.g. 0012345" value={chequeNo} onChange={(event) => setChequeNo(event.target.value)} />
                  <TextField label="Cheque Date" id="chequeDate" type="date" value={chequeDate} onChange={(event) => setChequeDate(event.target.value)} />
                  <TextField label="Bank Name" id="bankName" placeholder="e.g. Islami Bank Bangladesh" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                  <TextField label="Branch" id="chequeBranchName" placeholder="e.g. Dakkhinkhan Branch" value={chequeBranchName} onChange={(event) => setChequeBranchName(event.target.value)} />
                  <TextField label="Maturity Date" id="chequeMaturityDate" type="date" value={chequeMaturityDate} onChange={(event) => setChequeMaturityDate(event.target.value)} />
                </div>
              </FormSection>
            )}

            {showBank && (
              <FormSection title="Transfer Details">
                <TextField label="Bank / Account Note" id="bankName" placeholder="e.g. Dutch Bangla Bank" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                <TextField label="Transaction Reference" id="reference" placeholder="e.g. TXN123456 or bKash TrxID" value={reference} onChange={(event) => setReference(event.target.value)} />
              </FormSection>
            )}

            {!showBank && !showCheque && (
              <TextField label="Reference (optional)" id="reference" placeholder="e.g. cash memo or mobile note" value={reference} onChange={(event) => setReference(event.target.value)} />
            )}

            <TextareaField label="Notes (optional)" id="notes" placeholder="Any notes about this payment..." value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : 'Record Payment'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
