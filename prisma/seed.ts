// prisma/seed.ts — Seeds Relax Tower demo data
import { PrismaClient, PhaseType, PhaseStatus, ExpenseCategory, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Sharebuild ERP with Relax Tower demo data...');

  // ── Company ──────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 'company-relax' },
    update: {},
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

  // ── Admin User ────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
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

  // ── Project ───────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'project-relax-tower' },
    update: {},
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

  // ── Phases — sourced from Top Sheet ───────────────
  const phasesData = [
    {
      id: 'phase-piling',
      name: 'Piling',
      nameBn: 'পাইলিং',
      phaseType: PhaseType.PILING,
      floorNo: null,
      sequence: 1,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Piling work',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-08-31'),
    },
    {
      id: 'phase-basement',
      name: 'Basement',
      nameBn: 'বেসমেন্ট',
      phaseType: PhaseType.BASEMENT,
      floorNo: 0,
      sequence: 2,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Basement slab and retaining wall',
      startDate: new Date('2023-11-15'),
      endDate: new Date('2024-05-18'),
    },
    {
      id: 'phase-1st',
      name: '1st Floor Slab',
      nameBn: '১ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 1,
      sequence: 3,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '1st floor slab casting',
    },
    {
      id: 'phase-2nd',
      name: '2nd Floor Slab',
      nameBn: '২য় তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 2,
      sequence: 4,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '2nd floor slab casting',
    },
    {
      id: 'phase-3rd',
      name: '3rd Floor Slab',
      nameBn: '৩য় তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 3,
      sequence: 5,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '3rd floor slab casting',
    },
    {
      id: 'phase-4th',
      name: '4th Floor Slab',
      nameBn: '৪র্থ তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 4,
      sequence: 6,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '4th floor slab casting',
    },
    {
      id: 'phase-5th',
      name: '5th Floor Slab',
      nameBn: '৫ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 5,
      sequence: 7,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '5th floor slab casting',
    },
    {
      id: 'phase-6th',
      name: '6th Floor Slab',
      nameBn: '৬ষ্ঠ তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 6,
      sequence: 8,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '6th floor slab casting',
    },
    {
      id: 'phase-7th',
      name: '7th Floor Slab',
      nameBn: '৭ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 7,
      sequence: 9,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '7th floor slab casting',
    },
    {
      id: 'phase-8th',
      name: '8th Floor Slab',
      nameBn: '৮ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 8,
      sequence: 10,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '8th floor slab casting',
    },
    {
      id: 'phase-9th',
      name: '9th Floor Slab',
      nameBn: '৯ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 9,
      sequence: 11,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '9th floor slab casting',
    },
    {
      id: 'phase-10th',
      name: '10th Floor Slab',
      nameBn: '১০ম তলা ছাদ',
      phaseType: PhaseType.SLAB,
      floorNo: 10,
      sequence: 12,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: '10th floor slab casting',
    },
    {
      id: 'phase-11th',
      name: '11th Floor Slab (Half)',
      nameBn: '১১তম তলা (হাফ স্ল্যাব)',
      phaseType: PhaseType.HALF_SLAB,
      floorNo: 11,
      sequence: 13,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Half slab + sanitary',
    },
    // Gathuni phases
    {
      id: 'phase-gathuni-1',
      name: 'Gathuni 1st Floor',
      nameBn: 'গাথুনি ১ম তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 1,
      sequence: 14,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 1st floor',
    },
    {
      id: 'phase-gathuni-2',
      name: 'Gathuni 2nd Floor',
      nameBn: 'গাথুনি ২য় তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 2,
      sequence: 15,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 2nd floor',
    },
    {
      id: 'phase-gathuni-3',
      name: 'Gathuni 3rd Floor',
      nameBn: 'গাথুনি ৩য় তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 3,
      sequence: 16,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 3rd floor',
    },
    {
      id: 'phase-gathuni-4',
      name: 'Gathuni 4th Floor',
      nameBn: 'গাথুনি ৪র্থ তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 4,
      sequence: 17,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 4th floor',
    },
    {
      id: 'phase-gathuni-5',
      name: 'Gathuni 5th Floor',
      nameBn: 'গাথুনি ৫ম তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 5,
      sequence: 18,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 5th floor',
    },
    {
      id: 'phase-gathuni-6',
      name: 'Gathuni 6th Floor',
      nameBn: 'গাথুনি ৬ষ্ঠ তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 6,
      sequence: 19,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 6th floor',
    },
    {
      id: 'phase-gathuni-7',
      name: 'Gathuni 7th Floor',
      nameBn: 'গাথুনি ৭ম তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 7,
      sequence: 20,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 7th floor',
    },
    {
      id: 'phase-gathuni-8',
      name: 'Gathuni 8th Floor',
      nameBn: 'গাথুনি ৮ম তলা',
      phaseType: PhaseType.GATHUNI,
      floorNo: 8,
      sequence: 21,
      status: PhaseStatus.INCLUDED_IN_SUMMARY,
      workDesc: 'Brick wall / masonry 8th floor',
    },
    {
      id: 'phase-finishing',
      name: 'Finishing',
      nameBn: 'ফিনিশিং',
      phaseType: PhaseType.FINISHING,
      floorNo: null,
      sequence: 22,
      status: PhaseStatus.DRAFT,
      workDesc: 'Finishing work',
    },
  ];

  for (const p of phasesData) {
    await prisma.phase.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        projectId: project.id,
      },
    });
  }

  // ── Top Sheet Income/Expense summary (from known data) ──
  // We seed these as reference summaries via a mock admin user
  const adminUser = await prisma.user.findFirst({ where: { companyId: company.id } });
  if (!adminUser) throw new Error('Admin user not found');

  // Piling expenses (representative)
  const pilingExpenses = [
    { category: ExpenseCategory.ROD_STEEL, description: 'Rod / Steel', descriptionBn: 'রড / স্টিল', quantity: 45000.3, unit: 'kg', unitPrice: 96.63, amount: 4348900 },
    { category: ExpenseCategory.CEMENT, description: 'Cement', descriptionBn: 'সিমেন্ট', quantity: 3828, unit: 'bag', unitPrice: 518.22, amount: 1983870 },
    { category: ExpenseCategory.STONE_AGGREGATE, description: 'Stone / Aggregate', descriptionBn: 'পাথর', quantity: 22988, unit: 'cft', unitPrice: 200.46, amount: 4608300 },
    { category: ExpenseCategory.SAND, description: 'Selection Sand', descriptionBn: 'সিলেকশন বালি', quantity: 26, unit: 'truck', unitPrice: 28500, amount: 741000 },
    { category: ExpenseCategory.LABOUR_BILL, description: 'Labour Bill', descriptionBn: 'শ্রমিক বিল', quantity: null, unit: null, unitPrice: null, amount: 55020 },
    { category: ExpenseCategory.OTHER, description: 'Electric Line Connection', descriptionBn: 'বৈদ্যুতিক লাইন সংযোগ', quantity: null, unit: null, unitPrice: null, amount: 25000 },
    { category: ExpenseCategory.OTHER, description: 'Water Line Connection', descriptionBn: 'পানির লাইন সংযোগ', quantity: null, unit: null, unitPrice: null, amount: 25000 },
    { category: ExpenseCategory.HARDWARE, description: 'Hardware Materials', descriptionBn: 'হার্ডওয়্যার মালামাল', quantity: null, unit: null, unitPrice: null, amount: 16121 },
    { category: ExpenseCategory.EQUIPMENT_HIRE, description: 'Motor', descriptionBn: 'মটর', quantity: null, unit: null, unitPrice: null, amount: 13400 },
    { category: ExpenseCategory.WATER_BILL, description: 'Water Bill', descriptionBn: 'পানির বিল', quantity: null, unit: null, unitPrice: null, amount: 182600 },
    { category: ExpenseCategory.SITE_FOOD_HOSPITALITY, description: 'Hospitality / Site Food', descriptionBn: 'আপ্যায়ন / সাইট খাবার', quantity: null, unit: null, unitPrice: null, amount: 19840 },
    { category: ExpenseCategory.ELECTRICAL_MATERIAL, description: 'Electric Materials', descriptionBn: 'বৈদ্যুতিক মালামাল', quantity: null, unit: null, unitPrice: null, amount: 38000 },
    { category: ExpenseCategory.SECURITY_SALARY, description: 'Security Salary', descriptionBn: 'নিরাপত্তা বেতন', quantity: null, unit: null, unitPrice: null, amount: 51000 },
  ];

  for (const exp of pilingExpenses) {
    await prisma.expense.create({
      data: {
        phaseId: 'phase-piling',
        category: exp.category,
        description: exp.description,
        descriptionBn: exp.descriptionBn,
        quantity: exp.quantity ?? undefined,
        unit: exp.unit ?? undefined,
        unitPrice: exp.unitPrice ?? undefined,
        amount: exp.amount,
        status: 'APPROVED',
        expenseDate: new Date('2023-08-01'),
        createdById: adminUser.id,
        approvedById: adminUser.id,
        approvedAt: new Date('2023-08-02'),
      },
    });
  }

  // Basement expenses (representative)
  const basementExpenses = [
    { category: ExpenseCategory.ROD_STEEL, description: 'Rod / Steel', descriptionBn: 'রড / স্টিল', quantity: 84456, unit: 'kg', unitPrice: 93.8, amount: 7921406 },
    { category: ExpenseCategory.CEMENT, description: 'Cement', descriptionBn: 'সিমেন্ট', quantity: 1855, unit: 'bag', unitPrice: 521.51, amount: 967300 },
    { category: ExpenseCategory.STONE_AGGREGATE, description: 'Stone / Aggregate', descriptionBn: 'পাথর', quantity: 4608, unit: 'cft', unitPrice: 199.36, amount: 918650 },
    { category: ExpenseCategory.SAND, description: 'Selection Sand', descriptionBn: 'সিলেকশন বালি', quantity: 25, unit: 'truck', unitPrice: 15472, amount: 386800 },
    { category: ExpenseCategory.LABOUR_BILL, description: 'Toilet Making Labour Bill', descriptionBn: 'টয়লেট শ্রমিক বিল', quantity: null, unit: null, unitPrice: null, amount: 8980 },
    { category: ExpenseCategory.HARDWARE, description: 'Hardware Materials', descriptionBn: 'হার্ডওয়্যার মালামাল', quantity: null, unit: null, unitPrice: null, amount: 140492 },
    { category: ExpenseCategory.CHEMICAL, description: 'Chemical for Retaining Wall', descriptionBn: 'রিটেইনিং ওয়াল কেমিক্যাল', quantity: null, unit: null, unitPrice: null, amount: 57800 },
    { category: ExpenseCategory.WATER_BILL, description: 'Water Bill', descriptionBn: 'পানির বিল', quantity: null, unit: null, unitPrice: null, amount: 45431 },
    { category: ExpenseCategory.SITE_FOOD_HOSPITALITY, description: 'Hospitality / Site Food', descriptionBn: 'আপ্যায়ন / সাইট খাবার', quantity: null, unit: null, unitPrice: null, amount: 73835 },
    { category: ExpenseCategory.READYMIX_CONCRETE, description: 'Readymix Concrete', descriptionBn: 'রেডিমিক্স কংক্রিট', quantity: null, unit: null, unitPrice: null, amount: 4883300 },
    { category: ExpenseCategory.ELECTRICAL_MATERIAL, description: 'Electric Materials', descriptionBn: 'বৈদ্যুতিক মালামাল', quantity: null, unit: null, unitPrice: null, amount: 76470 },
    { category: ExpenseCategory.ELECTRICITY_BILL, description: 'Meter Recharge', descriptionBn: 'মিটার রিচার্জ', quantity: null, unit: null, unitPrice: null, amount: 41000 },
    { category: ExpenseCategory.SECURITY_SALARY, description: 'Security Salary', descriptionBn: 'নিরাপত্তা বেতন', quantity: null, unit: null, unitPrice: null, amount: 137700 },
  ];

  for (const exp of basementExpenses) {
    await prisma.expense.create({
      data: {
        phaseId: 'phase-basement',
        category: exp.category,
        description: exp.description,
        descriptionBn: exp.descriptionBn,
        quantity: exp.quantity ?? undefined,
        unit: exp.unit ?? undefined,
        unitPrice: exp.unitPrice ?? undefined,
        amount: exp.amount,
        status: 'APPROVED',
        expenseDate: new Date('2024-04-01'),
        createdById: adminUser.id,
        approvedById: adminUser.id,
        approvedAt: new Date('2024-04-02'),
      },
    });
  }

  console.log('✅ Seed complete. Login: admin@relaxdevelopers.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
