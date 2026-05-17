import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z.string().min(1),
  nameBn: z.string().optional(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  defaultCurrency: z.string().default('BDT'),
  receiptPrefix: z.string().optional(),
  defaultServiceChargePct: z.number().optional(),
  fiscalYearStart: z.string().optional(),
  notes: z.string().optional(),
});

const SETTING_KEYS = ['defaultCurrency', 'receiptPrefix', 'defaultServiceChargePct', 'fiscalYearStart', 'notes'] as const;

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const oldCompany = await prisma.company.findUnique({ where: { id: companyId } });
  if (!oldCompany) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const parsed = settingsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: d.name,
      nameBn: d.nameBn || null,
      logoUrl: d.logoUrl || null,
      address: d.address || null,
      phone: d.phone || null,
      email: d.email || null,
      website: d.website || null,
    },
  });

  await Promise.all(SETTING_KEYS.map((key) => {
    const value = d[key];
    return prisma.companySetting.upsert({
      where: { companyId_key: { companyId, key } },
      update: { value: value == null ? '' : String(value) },
      create: { companyId, key, value: value == null ? '' : String(value) },
    });
  }));

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'UPDATE',
      entityType: 'company',
      entityId: company.id,
      oldValues: oldCompany as any,
      newValues: company as any,
    },
  });

  return NextResponse.json(company);
}
