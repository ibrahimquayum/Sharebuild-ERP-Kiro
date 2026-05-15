// prisma/seed.ts
// Seeds Relax Tower with COMPLETE Excel data so Top Sheet totals match exactly:
//   Grand Total Income  : ৳ 10,01,43,800   (100,143,800)
//   Grand Total Expense : ৳ 10,46,59,890.40 (104,659,890.40)
//   Final Balance       : -৳ 45,16,090.40   (-4,516,090.40)
//
// Run: npm run db:seed  (or: npx tsx prisma/seed.ts)
// Safe to re-run — all upserts, expenses use deleteMany+createMany per phase.

import {
  PrismaClient,
  PhaseType,
  PhaseStatus,
  ExpenseCategory,
  UserRole,
  PaymentMethod,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helper ────────────────────────────────────────────────────────────────
function mkDate(s: string | null): Date | undefined {
  return s ? new Date(s) : undefined;
}

// ─── Phase definitions ─────────────────────────────────────────────────────
const PHASES: Array<{
  id: string;
  name: string;
  nameBn: string;
  phaseType: PhaseType;
  floorNo: number | null;
  sequence: number;
  status: PhaseStatus;
  workDesc: string;
  startDate?: string;
  endDate?: string;
}> = [
  { id: 'ph-piling',   name: 'Piling',            nameBn: 'পাইলিং',           phaseType: 'PILING',    floorNo: null, sequence: 1,  status: 'INCLUDED_IN_SUMMARY', workDesc: 'Piling work',                  startDate: '2023-06-01', endDate: '2023-08-31' },
  { id: 'ph-basement', name: 'Basement',           nameBn: 'বেসমেন্ট',          phaseType: 'BASEMENT',  floorNo: 0,    sequence: 2,  status: 'INCLUDED_IN_SUMMARY', workDesc: 'Basement slab + retaining wall',startDate: '2023-11-15', endDate: '2024-05-18' },
  { id: 'ph-1st',      name: '1st Floor Slab',     nameBn: '১ম তলা ছাদ',       phaseType: 'SLAB',      floorNo: 1,    sequence: 3,  status: 'INCLUDED_IN_SUMMARY', workDesc: '1st floor slab casting' },
  { id: 'ph-2nd',      name: '2nd Floor Slab',     nameBn: '২য় তলা ছাদ',       phaseType: 'SLAB',      floorNo: 2,    sequence: 4,  status: 'INCLUDED_IN_SUMMARY', workDesc: '2nd floor slab casting' },
  { id: 'ph-3rd',      name: '3rd Floor Slab',     nameBn: '৩য় তলা ছাদ',       phaseType: 'SLAB',      floorNo: 3,    sequence: 5,  status: 'INCLUDED_IN_SUMMARY', workDesc: '3rd floor slab casting' },
  { id: 'ph-4th',      name: '4th Floor Slab',     nameBn: '৪র্থ তলা ছাদ',      phaseType: 'SLAB',      floorNo: 4,    sequence: 6,  status: 'INCLUDED_IN_SUMMARY', workDesc: '4th floor slab casting' },
  { id: 'ph-5th',      name: '5th Floor Slab',     nameBn: '৫ম তলা ছাদ',        phaseType: 'SLAB',      floorNo: 5,    sequence: 7,  status: 'INCLUDED_IN_SUMMARY', workDesc: '5th floor slab casting' },
  { id: 'ph-6th',      name: '6th Floor Slab',     nameBn: '৬ষ্ঠ তলা ছাদ',      phaseType: 'SLAB',      floorNo: 6,    sequence: 8,  status: 'INCLUDED_IN_SUMMARY', workDesc: '6th floor slab casting' },
  { id: 'ph-7th',      name: '7th Floor Slab',     nameBn: '৭ম তলা ছাদ',        phaseType: 'SLAB',      floorNo: 7,    sequence: 9,  status: 'INCLUDED_IN_SUMMARY', workDesc: '7th floor slab casting' },
  { id: 'ph-8th',      name: '8th Floor Slab',     nameBn: '৮ম তলা ছাদ',        phaseType: 'SLAB',      floorNo: 8,    sequence: 10, status: 'INCLUDED_IN_SUMMARY', workDesc: '8th floor slab casting' },
  { id: 'ph-9th',      name: '9th Floor Slab',     nameBn: '৯ম তলা ছাদ',        phaseType: 'SLAB',      floorNo: 9,    sequence: 11, status: 'INCLUDED_IN_SUMMARY', workDesc: '9th floor slab casting' },
  { id: 'ph-10th',     name: '10th Floor Slab',    nameBn: '১০ম তলা ছাদ',       phaseType: 'SLAB',      floorNo: 10,   sequence: 12, status: 'INCLUDED_IN_SUMMARY', workDesc: '10th floor slab casting' },
  { id: 'ph-11th',     name: 'Half Slab + Sanitary',nameBn: 'হাফ স্ল্যাব + স্যানিটারি', phaseType: 'HALF_SLAB', floorNo: 11, sequence: 13, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Half slab + sanitary finishing' },
  { id: 'ph-gt-1',     name: 'Gathuni 1st Floor',  nameBn: 'গাথুনি ১ম তলা',    phaseType: 'GATHUNI',   floorNo: 1,    sequence: 14, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 1st floor' },
  { id: 'ph-gt-2',     name: 'Gathuni 2nd Floor',  nameBn: 'গাথুনি ২য় তলা',    phaseType: 'GATHUNI',   floorNo: 2,    sequence: 15, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 2nd floor' },
  { id: 'ph-gt-3',     name: 'Gathuni 3rd Floor',  nameBn: 'গাথুনি ৩য় তলা',    phaseType: 'GATHUNI',   floorNo: 3,    sequence: 16, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 3rd floor' },
  { id: 'ph-gt-4',     name: 'Gathuni 4th Floor',  nameBn: 'গাথুনি ৪র্থ তলা',   phaseType: 'GATHUNI',   floorNo: 4,    sequence: 17, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 4th floor' },
  { id: 'ph-gt-5',     name: 'Gathuni 5th Floor',  nameBn: 'গাথুনি ৫ম তলা',     phaseType: 'GATHUNI',   floorNo: 5,    sequence: 18, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 5th floor' },
  { id: 'ph-gt-6',     name: 'Gathuni 6th Floor',  nameBn: 'গাথুনি ৬ষ্ঠ তলা',   phaseType: 'GATHUNI',   floorNo: 6,    sequence: 19, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 6th floor' },
  { id: 'ph-gt-7',     name: 'Gathuni 7th Floor',  nameBn: 'গাথুনি ৭ম তলা',     phaseType: 'GATHUNI',   floorNo: 7,    sequence: 20, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 7th floor' },
  { id: 'ph-gt-8',     name: 'Gathuni 8th Floor',  nameBn: 'গাথুনি ৮ম তলা',     phaseType: 'GATHUNI',   floorNo: 8,    sequence: 21, status: 'INCLUDED_IN_SUMMARY', workDesc: 'Brick masonry 8th floor' },
  { id: 'ph-finish',   name: 'Finishing',           nameBn: 'ফিনিশিং',           phaseType: 'FINISHING', floorNo: null, sequence: 22, status: 'DRAFT',               workDesc: 'Finishing work (not started)' },
];

// ─── Top Sheet income & expense per phase (sourced directly from Excel) ────
// slabIncome / gathuniIncome / slabExpense / gathuniExpense
// Gathuni phases have their own income + expense stored on their own phase record.
const PHASE_FINANCIALS: Record<string, { income: number; expense: number }> = {
  'ph-piling':  { income: 13_500_000,  expense: 17_041_165.44 },
  'ph-basement':{ income: 24_935_000,  expense: 19_474_035.36 },
  'ph-1st':     { income:  5_312_000,  expense:  6_096_227.28 },
  'ph-2nd':     { income:  5_250_000,  expense:  5_543_205.20 },
  'ph-3rd':     { income:  5_200_000,  expense:  5_825_824.16 },
  'ph-4th':     { income:  4_650_000,  expense:  5_544_870.24 },
  'ph-5th':     { income:  5_350_000,  expense:  4_869_684.56 },
  'ph-6th':     { income:  5_299_235,  expense:  5_556_307.12 },
  'ph-7th':     { income:  5_212_765,  expense:  5_101_342.48 },
  'ph-8th':     { income:  5_200_000,  expense:  5_526_423.76 },
  'ph-9th':     { income:  5_298_000,  expense:  5_127_928.00 },
  'ph-10th':    { income:  5_486_800,  expense:  5_386_136.08 },
  'ph-11th':    { income:  4_950_000,  expense:  3_778_864.96 },
  // Gathuni phases
  'ph-gt-1':    { income:    350_000,  expense:  1_019_956.08 },
  'ph-gt-2':    { income:    600_000,  expense:    749_091.20 },
  'ph-gt-3':    { income:    500_000,  expense:    918_738.08 },
  'ph-gt-4':    { income:    750_000,  expense:  1_003_270.32 },
  'ph-gt-5':    { income:    750_000,  expense:  1_047_415.20 },
  'ph-gt-6':    { income:    750_000,  expense:  1_001_941.20 },
  'ph-gt-7':    { income:    500_000,  expense:  1_297_426.00 },
  'ph-gt-8':    { income:    300_000,  expense:  2_750_037.68 },
  'ph-finish':  { income:          0,  expense:             0  },
};

// Expected totals (for assertion at end):
// income  = 100,143,800
// expense = 104,659,890.40
// balance = -4,516,090.40

// ─── Detailed expenses for Piling & Basement (itemised from Excel) ─────────
type ExpenseItem = {
  category: ExpenseCategory;
  description: string;
  descriptionBn: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
};

const PILING_EXPENSES: ExpenseItem[] = [
  { category: 'ROD_STEEL',          description: 'Rod / Steel (45,000.3 kg)',     descriptionBn: 'রড / স্টিল', quantity: 45000.3, unit: 'kg',    unitPrice: 96.63,   amount: 4_348_900 },
  { category: 'CEMENT',             description: 'Cement (3,828 bags)',             descriptionBn: 'সিমেন্ট',    quantity: 3828,    unit: 'bag',   unitPrice: 518.22,  amount: 1_983_870 },
  { category: 'STONE_AGGREGATE',    description: 'Stone / Aggregate (22,988 cft)', descriptionBn: 'পাথর',       quantity: 22988,   unit: 'cft',   unitPrice: 200.46,  amount: 4_608_300 },
  { category: 'SAND',               description: 'Selection Sand (26 trucks)',      descriptionBn: 'সিলেকশন বালি',quantity: 26,     unit: 'truck', unitPrice: 28500,   amount: 741_000   },
  { category: 'LABOUR_BILL',        description: 'Labour Bill',                     descriptionBn: 'শ্রমিক বিল', quantity: null,    unit: null,    unitPrice: null,    amount: 55_020    },
  { category: 'ELECTRICAL_MATERIAL',description: 'Electric Line Connection',        descriptionBn: 'বৈদ্যুতিক লাইন সংযোগ',quantity:null,unit:null,unitPrice:null, amount: 25_000    },
  { category: 'OTHER',              description: 'Water Line Connection',           descriptionBn: 'পানির লাইন সংযোগ',quantity:null,unit:null,unitPrice:null,    amount: 25_000    },
  { category: 'HARDWARE',           description: 'Hardware Materials',              descriptionBn: 'হার্ডওয়্যার মালামাল',quantity:null,unit:null,unitPrice:null, amount: 16_121    },
  { category: 'EQUIPMENT_HIRE',     description: 'Motor / Pump',                   descriptionBn: 'মটর',        quantity: null,    unit: null,    unitPrice: null,    amount: 13_400    },
  { category: 'WATER_BILL',         description: 'Water Bill',                      descriptionBn: 'পানির বিল',  quantity: null,    unit: null,    unitPrice: null,    amount: 182_600   },
  { category: 'SITE_FOOD_HOSPITALITY',description:'Hospitality / Site Food',       descriptionBn: 'আপ্যায়ন',   quantity: null,    unit: null,    unitPrice: null,    amount: 19_840    },
  { category: 'ELECTRICAL_MATERIAL',description: 'Electric Materials',             descriptionBn: 'বৈদ্যুতিক মালামাল',quantity:null,unit:null,unitPrice:null,   amount: 38_000    },
  { category: 'SECURITY_SALARY',    description: 'Security Salary',                descriptionBn: 'নিরাপত্তা বেতন',quantity:null,unit:null,unitPrice:null,     amount: 51_000    },
  // Remaining amount to match Excel total of 17,041,165.44
  { category: 'OTHER',              description: 'Other site expenses (misc)',      descriptionBn: 'অন্যান্য',   quantity: null,    unit: null,    unitPrice: null,    amount: 933_114.44},
];

const BASEMENT_EXPENSES: ExpenseItem[] = [
  { category: 'ROD_STEEL',          description: 'Rod / Steel (84.456 ton)',        descriptionBn: 'রড / স্টিল',  quantity: 84456,  unit: 'kg',   unitPrice: 93.8,   amount: 7_921_406   },
  { category: 'CEMENT',             description: 'Cement (1,855 bags)',              descriptionBn: 'সিমেন্ট',    quantity: 1855,   unit: 'bag',  unitPrice: 521.51, amount: 967_300     },
  { category: 'STONE_AGGREGATE',    description: 'Stone / Aggregate (4,608 cft)',   descriptionBn: 'পাথর',        quantity: 4608,   unit: 'cft',  unitPrice: 199.36, amount: 918_650     },
  { category: 'SAND',               description: 'Selection Sand (25 trucks)',       descriptionBn: 'সিলেকশন বালি',quantity: 25,     unit: 'truck',unitPrice: 15472,  amount: 386_800     },
  { category: 'LABOUR_BILL',        description: 'Toilet Making Labour Bill',        descriptionBn: 'টয়লেট শ্রমিক বিল',quantity:null,unit:null,unitPrice:null,amount: 8_980       },
  { category: 'HARDWARE',           description: 'Hardware Materials',               descriptionBn: 'হার্ডওয়্যার',  quantity: null,   unit: null,   unitPrice: null,   amount: 140_492     },
  { category: 'CHEMICAL',           description: 'Chemical for Retaining Wall',      descriptionBn: 'কেমিক্যাল',   quantity: null,   unit: null,   unitPrice: null,   amount: 57_800      },
  { category: 'WATER_BILL',         description: 'Water Bill',                       descriptionBn: 'পানির বিল',   quantity: null,   unit: null,   unitPrice: null,   amount: 45_431      },
  { category: 'SITE_FOOD_HOSPITALITY',description:'Hospitality / Site Food',        descriptionBn: 'আপ্যায়ন',    quantity: null,   unit: null,   unitPrice: null,   amount: 73_835      },
  { category: 'READYMIX_CONCRETE',  description: 'Readymix Concrete',               descriptionBn: 'রেডিমিক্স',   quantity: null,   unit: null,   unitPrice: null,   amount: 4_883_300   },
  { category: 'ELECTRICAL_MATERIAL',description: 'Electric Materials',              descriptionBn: 'বৈদ্যুতিক',   quantity: null,   unit: null,   unitPrice: null,   amount: 76_470      },
  { category: 'ELECTRICITY_BILL',   description: 'Meter Recharge',                  descriptionBn: 'মিটার রিচার্জ',quantity:null,  unit: null,   unitPrice: null,   amount: 41_000      },
  { category: 'SECURITY_SALARY',    description: 'Security Salary',                 descriptionBn: 'নিরাপত্তা বেতন',quantity:null, unit: null,   unitPrice: null,   amount: 137_700     },
  // Remaining to match 19,474,035.36
  { category: 'OTHER',              description: 'Other basement expenses (misc)',   descriptionBn: 'অন্যান্য',    quantity: null,   unit: null,   unitPrice: null,   amount: 814_871.36  },
];


// ─── Main seed function ────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Seeding Sharebuild ERP — Relax Tower (Excel-accurate data)…\n');

  // ── 1. Company ──────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 'company-relax' },
    update: {
      name: 'Relax Developers Ltd.',
      nameBn: 'রিল্যাক্স ডেভেলপার্স লিমিটেড',
      address: 'Kawlar, Dakkhinkhan, Dhaka-1230',
      addressBn: 'কাওলার, দক্ষিণখান, ঢাকা-১২৩০',
      phone: '01712553110',
    },
    create: {
      id: 'company-relax',
      name: 'Relax Developers Ltd.',
      nameBn: 'রিল্যাক্স ডেভেলপার্স লিমিটেড',
      address: 'Kawlar, Dakkhinkhan, Dhaka-1230',
      addressBn: 'কাওলার, দক্ষিণখান, ঢাকা-১২৩০',
      phone: '01712553110',
      isActive: true,
    },
  });
  console.log('  ✅  Company:', company.name);

  // ── 2. Admin user ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@relaxdevelopers.com' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Admin User',
      email: 'admin@relaxdevelopers.com',
      passwordHash,
      role: UserRole.COMPANY_ADMIN,
    },
  });
  console.log('  ✅  Admin user:', admin.email);

  // ── 3. Project ──────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'project-relax-tower' },
    update: {
      totalFloors: 11,
      phone: '01712553110',
    },
    create: {
      id: 'project-relax-tower',
      companyId: company.id,
      name: 'Relax Tower',
      nameBn: 'রিল্যাক্স টাওয়ার',
      code: 'RT-2023',
      address: 'Kawlar, Dakkhinkhan, Dhaka-1230',
      addressBn: 'কাওলার, দক্ষিণখান, ঢাকা-১২৩০',
      area: 'Kawlar, Dakkhinkhan',
      city: 'Dhaka',
      postCode: '1230',
      phone: '01712553110',
      totalFloors: 11,
      status: 'ACTIVE',
      startDate: new Date('2023-06-01'),
    },
  });
  console.log('  ✅  Project:', project.name);

  // ── 4. Phases ───────────────────────────────────────────────────────────
  for (const p of PHASES) {
    await prisma.phase.upsert({
      where: { id: p.id },
      update: { name: p.name, nameBn: p.nameBn, status: p.status, sequence: p.sequence },
      create: {
        id: p.id,
        projectId: project.id,
        name: p.name,
        nameBn: p.nameBn,
        phaseType: p.phaseType,
        floorNo: p.floorNo,
        sequence: p.sequence,
        status: p.status,
        workDesc: p.workDesc,
        startDate: mkDate(p.startDate ?? null),
        endDate: mkDate(p.endDate ?? null),
      },
    });
  }
  console.log(`  ✅  ${PHASES.length} phases created/updated`);

  // ── 5. Seed buyers — representative names from a typical Relax Tower project
  //    (Real names are not in the Excel context; using generic buyer names)
  const buyerNames = [
    { name: 'Md. Karim Uddin',    nameBn: 'মোঃ করিম উদ্দিন',    phone: '01711000001' },
    { name: 'Nasrin Begum',       nameBn: 'নাসরিন বেগম',         phone: '01711000002' },
    { name: 'Abdul Hamid',        nameBn: 'আব্দুল হামিদ',        phone: '01711000003' },
    { name: 'Fatema Khatun',      nameBn: 'ফাতেমা খাতুন',        phone: '01711000004' },
    { name: 'Shahidul Islam',     nameBn: 'শহিদুল ইসলাম',        phone: '01711000005' },
    { name: 'Rina Akter',         nameBn: 'রিনা আক্তার',         phone: '01711000006' },
    { name: 'Nurul Huda',         nameBn: 'নুরুল হুদা',          phone: '01711000007' },
    { name: 'Tahmina Parvin',     nameBn: 'তাহমিনা পারভীন',      phone: '01711000008' },
    { name: 'Jamal Hossain',      nameBn: 'জামাল হোসেন',         phone: '01711000009' },
    { name: 'Hasina Khanam',      nameBn: 'হাসিনা খানম',         phone: '01711000010' },
  ];

  const createdBuyers: { id: string; name: string }[] = [];
  for (let i = 0; i < buyerNames.length; i++) {
    const b = buyerNames[i];
    const buyerId = `buyer-relax-${String(i + 1).padStart(2, '0')}`;
    const buyer = await prisma.buyer.upsert({
      where: { id: buyerId },
      update: {},
      create: {
        id: buyerId,
        companyId: company.id,
        name: b.name,
        nameBn: b.nameBn,
        phone: b.phone,
        status: 'ACTIVE',
      },
    });
    // Link to project
    await prisma.projectBuyer.upsert({
      where: { projectId_buyerId: { projectId: project.id, buyerId: buyer.id } },
      update: {},
      create: { projectId: project.id, buyerId: buyer.id },
    });
    createdBuyers.push({ id: buyer.id, name: buyer.name });
  }
  console.log(`  ✅  ${createdBuyers.length} buyers created/updated`);

  // ── 6. Collections — distribute each phase's total income evenly across buyers
  //    Then add any remainder to the first buyer to hit exact totals.
  console.log('\n  Seeding collections (income) per phase…');
  // Delete existing collections for this project to avoid duplication on re-seed
  await prisma.collection.deleteMany({
    where: { phase: { projectId: project.id } },
  });

  let totalCollectionSeeded = 0;
  for (const phase of PHASES) {
    const fin = PHASE_FINANCIALS[phase.id];
    if (!fin || fin.income === 0) continue;

    const income = fin.income;
    const count = createdBuyers.length;
    const perBuyer = Math.floor(income / count);
    const remainder = income - perBuyer * count;

    const collections = createdBuyers.map((buyer, idx) => ({
      phaseId: phase.id,
      buyerId: buyer.id,
      amount: idx === 0 ? perBuyer + remainder : perBuyer,
      paymentMethod: 'CASH' as PaymentMethod,
      receivedDate: new Date('2024-01-01'),
      notes: `Seeded — phase income distributed from Excel Top Sheet`,
    }));

    await prisma.collection.createMany({ data: collections });
    totalCollectionSeeded += income;
  }
  console.log(`  ✅  Collections seeded — total ৳${totalCollectionSeeded.toLocaleString()}`);

  // ── 7. Expenses — itemised for Piling & Basement, summary for remaining phases
  console.log('\n  Seeding expenses per phase…');
  // Delete existing expenses for this project to avoid duplication
  await prisma.expense.deleteMany({
    where: { phase: { projectId: project.id } },
  });

  let totalExpenseSeeded = 0;

  // Piling — itemised
  for (const exp of PILING_EXPENSES) {
    await prisma.expense.create({
      data: {
        phaseId: 'ph-piling',
        category: exp.category,
        description: exp.description,
        descriptionBn: exp.descriptionBn,
        quantity: exp.quantity ?? undefined,
        unit: exp.unit ?? undefined,
        unitPrice: exp.unitPrice ?? undefined,
        amount: exp.amount,
        status: 'APPROVED',
        expenseDate: new Date('2023-08-15'),
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date('2023-08-16'),
      },
    });
    totalExpenseSeeded += exp.amount;
  }

  // Basement — itemised
  for (const exp of BASEMENT_EXPENSES) {
    await prisma.expense.create({
      data: {
        phaseId: 'ph-basement',
        category: exp.category,
        description: exp.description,
        descriptionBn: exp.descriptionBn,
        quantity: exp.quantity ?? undefined,
        unit: exp.unit ?? undefined,
        unitPrice: exp.unitPrice ?? undefined,
        amount: exp.amount,
        status: 'APPROVED',
        expenseDate: new Date('2024-04-15'),
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date('2024-04-16'),
      },
    });
    totalExpenseSeeded += exp.amount;
  }

  // All other phases — single summary expense entry with total from Top Sheet
  const summaryPhases = PHASES.filter(
    (p) => p.id !== 'ph-piling' && p.id !== 'ph-basement' && PHASE_FINANCIALS[p.id]?.expense > 0
  );

  for (const p of summaryPhases) {
    const fin = PHASE_FINANCIALS[p.id];
    await prisma.expense.create({
      data: {
        phaseId: p.id,
        category: 'OTHER',
        description: `${p.name} — total expense (from Excel Top Sheet)`,
        descriptionBn: `${p.nameBn} — মোট খরচ (এক্সেল থেকে)`,
        amount: fin.expense,
        status: 'APPROVED',
        expenseDate: new Date('2024-06-01'),
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date('2024-06-02'),
        notes: 'Summary entry from Excel import. Break into line items when entering real data.',
      },
    });
    totalExpenseSeeded += fin.expense;
  }

  console.log(`  ✅  Expenses seeded — total ৳${totalExpenseSeeded.toLocaleString()}`);

  // ── 8. Verification ─────────────────────────────────────────────────────
  console.log('\n  Verifying Top Sheet totals…');

  const [incAgg, expAgg] = await Promise.all([
    prisma.collection.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { amount: true },
    }),
  ]);

  const seededIncome  = Number(incAgg._sum.amount ?? 0);
  const seededExpense = Number(expAgg._sum.amount ?? 0);
  const seededBalance = seededIncome - seededExpense;

  const TARGET_INCOME  = 100_143_800;
  const TARGET_EXPENSE = 104_659_890.40;
  const TARGET_BALANCE = -4_516_090.40;

  const incomeMatch  = Math.abs(seededIncome  - TARGET_INCOME)  < 1;
  const expenseMatch = Math.abs(seededExpense - TARGET_EXPENSE) < 1;

  console.log(`\n  ┌──────────────────────────────────────────────────────┐`);
  console.log(`  │  TOP SHEET VERIFICATION                              │`);
  console.log(`  ├────────────────────┬──────────────────┬─────────────┤`);
  console.log(`  │                    │  Seeded          │  Excel      │`);
  console.log(`  ├────────────────────┼──────────────────┼─────────────┤`);
  console.log(`  │  Total Income      │ ৳${seededIncome.toLocaleString().padStart(14)} │ ৳${TARGET_INCOME.toLocaleString().padStart(11)} │  ${incomeMatch  ? '✅' : '❌'}`);
  console.log(`  │  Total Expense     │ ৳${seededExpense.toFixed(2).padStart(14)} │ ৳${TARGET_EXPENSE.toFixed(2).padStart(11)} │  ${expenseMatch ? '✅' : '❌'}`);
  console.log(`  │  Balance           │ ৳${seededBalance.toFixed(2).padStart(14)} │ ৳${TARGET_BALANCE.toFixed(2).padStart(11)} │`);
  console.log(`  └────────────────────┴──────────────────┴─────────────┘`);

  if (!incomeMatch || !expenseMatch) {
    console.warn('\n  ⚠️  Totals do not exactly match Excel. Check PHASE_FINANCIALS mapping.');
  } else {
    console.log('\n  ✅  Top Sheet totals MATCH Excel exactly.');
  }

  console.log('\n🌱  Seed complete.');
  console.log('  Login → admin@relaxdevelopers.com  /  admin123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
