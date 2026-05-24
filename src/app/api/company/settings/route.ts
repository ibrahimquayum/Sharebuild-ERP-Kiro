import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { safeAuditLog } from '@/lib/audit';
import { apiAccessError, assertApiCompanyPermission } from '@/lib/access-control';

export const runtime = 'nodejs';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const optionalText = z.preprocess(
  (value) => value === null ? undefined : value,
  z.string().trim().optional()
);

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  return typeof value === 'number' ? value : Number(value);
}, z.number().nonnegative().optional());

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required.'),
  nameBn: optionalText,
  logoUrl: optionalText,
  removeLogo: z.preprocess((value) => value === true || value === 'true', z.boolean().default(false)),
  address: optionalText,
  phone: optionalText,
  email: z.preprocess(
    (value) => value === null || value === '' ? undefined : value,
    z.string().trim().email('Enter a valid company email.').optional()
  ),
  website: optionalText,
  registrationNo: optionalText,
  taxId: optionalText,
  defaultCurrency: z.string().trim().default('BDT'),
  receiptPrefix: optionalText,
  defaultServiceChargePct: optionalNumber,
  fiscalYearStart: optionalText,
  reportFooterNote: optionalText,
  notes: optionalText,
});

const SETTING_KEYS = ['defaultCurrency', 'receiptPrefix', 'defaultServiceChargePct', 'fiscalYearStart', 'reportFooterNote', 'notes'] as const;

async function readPayload(req: NextRequest, companyId: string) {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return { payload: await req.json(), logoUrlFromUpload: undefined as string | undefined };
  }

  const formData = await req.formData();
  const payload = Object.fromEntries(formData.entries());
  const logoFile = formData.get('logoFile');

  if (!(logoFile instanceof File) || logoFile.size === 0) {
    return { payload, logoUrlFromUpload: undefined as string | undefined };
  }

  if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
    throw new Error('Company logo must be a JPG, PNG, or WebP image.');
  }
  if (logoFile.size > MAX_LOGO_BYTES) {
    throw new Error('Company logo is too large. Maximum allowed size is 2 MB.');
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', companyId, 'branding');
  await mkdir(uploadDir, { recursive: true });
  const ext = extname(logoFile.name) || '.png';
  const fileName = `${randomUUID()}${ext}`;
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await logoFile.arrayBuffer()));

  return { payload, logoUrlFromUpload: `/uploads/${companyId}/branding/${fileName}` };
}

export async function PUT(req: NextRequest) {
  try {
    const access = await assertApiCompanyPermission('settings', 'manageSettings');
    if (!access.ok) return apiAccessError(access);
    const companyId = access.context.companyId;

    const oldCompany = await prisma.company.findUnique({ where: { id: companyId } });
    if (!oldCompany) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const { payload, logoUrlFromUpload } = await readPayload(req, companyId);
    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: d.name,
        nameBn: d.nameBn || null,
        logoUrl: d.removeLogo ? null : logoUrlFromUpload ?? d.logoUrl ?? oldCompany.logoUrl,
        address: d.address || null,
        phone: d.phone || null,
        email: d.email || null,
        website: d.website || null,
        registrationNo: d.registrationNo || null,
        taxId: d.taxId || null,
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

    await safeAuditLog({
      userId: access.context.userId,
      action: 'UPDATE',
      entityType: 'company',
      entityId: company.id,
      oldValues: oldCompany,
      newValues: company,
      context: 'company settings',
    });

    return NextResponse.json({ success: true, company });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save company settings.';
    console.error('[company/settings] Failed to save company settings', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
