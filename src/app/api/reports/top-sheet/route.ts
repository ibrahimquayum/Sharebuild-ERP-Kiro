import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const project = await prisma.project.findFirst({
    where: { companyId, ...(projectId ? { id: projectId } : {}) },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const phases = await prisma.phase.findMany({
    where: { projectId: project.id, status: { in: ['ACTIVE', 'APPROVED', 'INCLUDED_IN_SUMMARY'] } },
    orderBy: { sequence: 'asc' },
  });

  const phaseData = await Promise.all(phases.map(async (ph) => {
    const [inc, exp] = await Promise.all([
      prisma.collection.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { phaseId: ph.id }, _sum: { amount: true } }),
    ]);
    const income = Number(inc._sum.amount ?? 0);
    const expense = Number(exp._sum.amount ?? 0);
    return { phase: ph, income, expense, balance: income - expense };
  }));

  const slabPhases = phaseData.filter((d) => d.phase.phaseType !== 'GATHUNI');
  const gathuniPhases = phaseData.filter((d) => d.phase.phaseType === 'GATHUNI');

  const totalSlabIncome = slabPhases.reduce((s, d) => s + d.income, 0);
  const totalSlabExpense = slabPhases.reduce((s, d) => s + d.expense, 0);
  const totalGathuniIncome = gathuniPhases.reduce((s, d) => s + d.income, 0);
  const totalGathuniExpense = gathuniPhases.reduce((s, d) => s + d.expense, 0);
  const grandTotalIncome = totalSlabIncome + totalGathuniIncome;
  const grandTotalExpense = totalSlabExpense + totalGathuniExpense;
  const finalBalance = grandTotalIncome - grandTotalExpense;

  return NextResponse.json({
    project,
    phases: phaseData,
    summary: {
      totalSlabIncome, totalSlabExpense,
      totalGathuniIncome, totalGathuniExpense,
      grandTotalIncome, grandTotalExpense, finalBalance,
    },
  });
}
