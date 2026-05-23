import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { safeAuditLog } from '@/lib/audit';
import { assertCan } from '@/lib/permissions';
import { getProjectServiceChargeLedger } from '@/lib/project-finance';
import { prisma } from '@/lib/prisma';

const mutationSchema = z.object({
  action: z.enum(['calculate', 'approve', 'reverse']),
  entryId: z.string().optional(),
  includedInDemand: z.boolean().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const projectId = project.id;

  const ledger = await getProjectServiceChargeLedger(projectId);
  return NextResponse.json(ledger);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  assertCan(role, 'reports', 'create');

  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const projectId = project.id;

  const parsed = mutationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  async function calculateEntries() {
    const ledger = await getProjectServiceChargeLedger(projectId);
    if (!ledger) return { updated: 0 };

    const rows = ledger.rows.filter((row) => row.phaseId);
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.status === 'APPROVED') continue;

        const existing = row.entryId
          ? await tx.serviceChargeEntry.findUnique({ where: { id: row.entryId } })
          : await tx.serviceChargeEntry.findFirst({
              where: {
                projectId,
                phaseId: row.phaseId ?? undefined,
                reversedAt: null,
              },
              orderBy: { updatedAt: 'desc' },
            });

        const payload = {
          companyId,
          projectId,
          phaseId: row.phaseId ?? undefined,
          basisType: row.basisType,
          basisAmount: row.basisAmount,
          percentage: row.percentage || undefined,
          manualAmount: row.manualAmount || undefined,
          serviceChargeAmount: row.previewAmount || row.serviceChargeAmount,
          includedInDemand: data.includedInDemand ?? row.includedInDemand,
          status: 'CALCULATED' as const,
          calculatedAt: new Date(),
          notes: data.notes?.trim() || row.notes || undefined,
        };

        if (existing && existing.status !== 'APPROVED') {
          await tx.serviceChargeEntry.update({
            where: { id: existing.id },
            data: payload,
          });
        } else if (!existing) {
          await tx.serviceChargeEntry.create({ data: payload });
        }

        updated += 1;
      }
    });

    await safeAuditLog({
      userId,
      projectId,
      action: 'CREATE',
      entityType: 'service_charge_calculate',
      entityId: projectId,
      newValues: { updated, includedInDemand: data.includedInDemand ?? false },
      context: 'service charge calculate',
    });

    return { updated };
  }

  if (data.action === 'calculate') {
    const result = await calculateEntries();
    return NextResponse.json(result);
  }

  if (data.action === 'approve') {
    assertCan(role, 'reports', 'approve');
    const calcResult = await calculateEntries();
    const result = await prisma.serviceChargeEntry.updateMany({
      where: {
        projectId,
        reversedAt: null,
        status: { in: ['DRAFT', 'CALCULATED'] },
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: userId,
        includedInDemand: data.includedInDemand ?? false,
      },
    });

    await safeAuditLog({
      userId,
      projectId,
      action: 'APPROVE',
      entityType: 'service_charge',
      entityId: projectId,
      newValues: { approved: result.count, calculated: calcResult.updated, includedInDemand: data.includedInDemand ?? false },
      context: 'service charge approve',
    });

    return NextResponse.json({ approved: result.count, calculated: calcResult.updated });
  }

  assertCan(role, 'reports', 'reverseAdjust');
  if (!data.entryId) return NextResponse.json({ error: 'Select a service charge entry to reverse.' }, { status: 400 });
  if (!data.reason?.trim()) return NextResponse.json({ error: 'A reversal reason is required.' }, { status: 400 });

  const postedReconciliation = await prisma.finalReconciliation.findFirst({
    where: { projectId, status: 'POSTED', reversedAt: null },
    select: { id: true },
  });
  if (postedReconciliation) {
    return NextResponse.json({ error: 'Reverse the posted final reconciliation before reversing approved service charge.' }, { status: 400 });
  }

  const entry = await prisma.serviceChargeEntry.findFirst({
    where: { id: data.entryId, projectId, companyId, reversedAt: null },
    select: { id: true, status: true },
  });
  if (!entry) return NextResponse.json({ error: 'Service charge entry not found.' }, { status: 404 });
  if (entry.status === 'REVERSED') return NextResponse.json({ error: 'Service charge entry is already reversed.' }, { status: 400 });

  await prisma.serviceChargeEntry.update({
    where: { id: entry.id },
    data: {
      status: 'REVERSED',
      reversedAt: new Date(),
      reversedById: userId,
      reversalReason: data.reason.trim(),
    },
  });

  await safeAuditLog({
    userId,
    projectId,
    action: 'UPDATE',
    entityType: 'service_charge_reverse',
    entityId: entry.id,
    newValues: { reason: data.reason.trim() },
    context: 'service charge reverse',
  });

  return NextResponse.json({ ok: true });
}
