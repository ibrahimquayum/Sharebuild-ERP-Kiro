import type { PaymentMethod, PrismaClient } from '@prisma/client';

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function distributeWeightedAmount(
  totalAmount: number,
  rows: Array<{ key: string; weight: number }>,
) {
  if (!rows.length || totalAmount <= 0) {
    return rows.map((row) => ({ ...row, amount: 0 }));
  }

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const raw = rows.map((row) => {
    const exact = (totalAmount * row.weight) / totalWeight;
    const base = Math.floor(exact * 100) / 100;
    return { ...row, exact, base, remainder: exact - base };
  });

  let remainingCents = Math.round((totalAmount - raw.reduce((sum, row) => sum + row.base, 0)) * 100);
  const ranked = [...raw].sort((a, b) => b.remainder - a.remainder || b.weight - a.weight || a.key.localeCompare(b.key));
  const bonus = new Map<string, number>();

  for (const row of ranked) {
    if (remainingCents <= 0) break;
    bonus.set(row.key, (bonus.get(row.key) ?? 0) + 0.01);
    remainingCents -= 1;
  }

  return raw.map((row) => ({
    ...row,
    amount: roundMoney(row.base + (bonus.get(row.key) ?? 0)),
  }));
}

export async function seedDemoProject({
  prisma,
  companyId,
  adminId,
  officeCashAccountId,
  mainBankAccountId,
}: {
  prisma: PrismaClient;
  companyId: string;
  adminId: string;
  officeCashAccountId: string;
  mainBankAccountId: string;
}) {
  const demoNow = new Date('2026-05-25T10:00:00.000Z');

  console.log('\n  Seeding Madina Demo Complete Project...');

  const mobileAccount = await prisma.cashBankAccount.upsert({
    where: { id: 'account-demo-mobile' },
    update: {
      companyId,
      name: 'Demo Mobile Banking',
      type: 'MOBILE_BANKING',
      mobileProvider: 'BKASH',
      accountHolderName: 'Madina Demo Collections',
      openingBalance: 0,
      currency: 'BDT',
      isActive: true,
      notes: 'Seeded mobile account for demo project report coverage.',
    },
    create: {
      id: 'account-demo-mobile',
      companyId,
      name: 'Demo Mobile Banking',
      type: 'MOBILE_BANKING',
      mobileProvider: 'BKASH',
      accountHolderName: 'Madina Demo Collections',
      openingBalance: 0,
      currency: 'BDT',
      isActive: true,
      notes: 'Seeded mobile account for demo project report coverage.',
    },
  });

  const chequeClearingAccount = await prisma.cashBankAccount.upsert({
    where: { id: 'account-demo-cheque-clearing' },
    update: {
      companyId,
      name: 'Demo Cheque Clearing',
      type: 'CHEQUE_CLEARING',
      openingBalance: 0,
      currency: 'BDT',
      isActive: true,
      notes: 'Seeded cheque-clearing account for demo project cheque coverage.',
    },
    create: {
      id: 'account-demo-cheque-clearing',
      companyId,
      name: 'Demo Cheque Clearing',
      type: 'CHEQUE_CLEARING',
      openingBalance: 0,
      currency: 'BDT',
      isActive: true,
      notes: 'Seeded cheque-clearing account for demo project cheque coverage.',
    },
  });

  const demoProject = await prisma.project.upsert({
    where: { id: 'project-madina-demo-complete' },
    update: {
      companyId,
      name: 'Madina Demo Complete Project',
      nameBn: 'Madina Demo Complete Project',
      code: 'MDCP-2026',
      address: 'Ashkona, Dakshinkhan, Dhaka',
      area: 'Ashkona',
      city: 'Dhaka',
      phone: '01714000010',
      totalFloors: 8,
      residentialFloors: 6,
      unitsPerFloor: 2,
      totalPlannedUnits: 14,
      defaultServiceChargePct: 7.5,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      notes: 'Comprehensive seeded demo project for report, workbook, voucher, and billing QA.',
    },
    create: {
      id: 'project-madina-demo-complete',
      companyId,
      name: 'Madina Demo Complete Project',
      nameBn: 'Madina Demo Complete Project',
      code: 'MDCP-2026',
      address: 'Ashkona, Dakshinkhan, Dhaka',
      area: 'Ashkona',
      city: 'Dhaka',
      phone: '01714000010',
      totalFloors: 8,
      residentialFloors: 6,
      unitsPerFloor: 2,
      totalPlannedUnits: 14,
      defaultServiceChargePct: 7.5,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      notes: 'Comprehensive seeded demo project for report, workbook, voucher, and billing QA.',
    },
  });

  await prisma.auditLog.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.cashBankTransaction.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.chequeLog.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.document.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.collection.deleteMany({ where: { phase: { projectId: demoProject.id } } });
  await prisma.demand.deleteMany({ where: { unit: { projectId: demoProject.id } } });
  await prisma.finalReconciliation.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.serviceChargeEntry.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.expense.deleteMany({ where: { phase: { projectId: demoProject.id } } });
  await prisma.supplierPayment.deleteMany({ where: { payable: { projectId: demoProject.id } } });
  await prisma.supplierBillItem.deleteMany({ where: { payable: { projectId: demoProject.id } } });
  await prisma.supplierPayable.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.projectSupplier.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.projectSubcontractor.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.unitBuyer.deleteMany({ where: { unit: { projectId: demoProject.id } } });
  await prisma.unit.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.projectBuyer.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.phase.deleteMany({ where: { projectId: demoProject.id } });
  await prisma.accountTransfer.deleteMany({ where: { id: { in: ['demo-transfer-001'] } } });

  const phases = [
    {
      id: 'demo-phase-land',
      name: 'Land Registration / Paperwork',
      phaseType: 'CUSTOM',
      floorNo: null,
      sequence: 1,
      status: 'APPROVED',
      workDesc: 'Land registry, legal processing, and project approvals.',
    },
    {
      id: 'demo-phase-piling',
      name: 'Piling',
      phaseType: 'PILING',
      floorNo: null,
      sequence: 2,
      status: 'APPROVED',
      workDesc: 'Bore piling, pile cap, and early foundation preparation.',
    },
    {
      id: 'demo-phase-basement',
      name: 'Basement',
      phaseType: 'BASEMENT',
      floorNo: 0,
      sequence: 3,
      status: 'APPROVED',
      workDesc: 'Basement slab, wall, and retaining structure.',
    },
    {
      id: 'demo-phase-ground',
      name: 'Ground Floor / Parking',
      phaseType: 'SLAB',
      floorNo: 0,
      sequence: 4,
      status: 'APPROVED',
      workDesc: 'Ground floor slab, parking, and common utility setup.',
    },
    {
      id: 'demo-phase-first-slab',
      name: '1st Slab',
      phaseType: 'SLAB',
      floorNo: 1,
      sequence: 5,
      status: 'ACTIVE',
      workDesc: 'First floor slab casting and structural framing.',
    },
    {
      id: 'demo-phase-second-slab',
      name: '2nd Slab',
      phaseType: 'SLAB',
      floorNo: 2,
      sequence: 6,
      status: 'ACTIVE',
      workDesc: 'Second slab and vertical reinforcement continuation.',
    },
    {
      id: 'demo-phase-brick-work',
      name: 'Brick Work / Gathuni',
      phaseType: 'GATHUNI',
      floorNo: null,
      sequence: 7,
      status: 'ACTIVE',
      workDesc: 'Brick masonry, partition walls, and common-area blocking.',
      auditLockedAt: new Date('2026-05-18T00:00:00.000Z'),
      auditLockedById: adminId,
      auditLockReason: 'Demo audit lock to exercise report audit visibility.',
    },
    {
      id: 'demo-phase-finishing',
      name: 'Finishing',
      phaseType: 'FINISHING',
      floorNo: null,
      sequence: 8,
      status: 'ACTIVE',
      workDesc: 'Tiles, paint, plumbing, and electrical finishing work.',
    },
  ] as const;

  await prisma.phase.createMany({
    data: phases.map((phase) => ({
      ...phase,
      projectId: demoProject.id,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      serviceChargePct: phase.id === 'demo-phase-first-slab' ? 3 : null,
    })),
  });

  const buyers = [
    { id: 'buyer-demo-arif', name: 'Arif Hasan', phone: '01714000021' },
    { id: 'buyer-demo-nusrat', name: 'Nusrat Jahan', phone: '01714000022' },
    { id: 'buyer-demo-mahmud', name: 'Mahmud Rahman', phone: '01714000023' },
    { id: 'buyer-demo-farzana', name: 'Farzana Akter', phone: '01714000024' },
    { id: 'buyer-demo-rakib', name: 'Rakib Chowdhury', phone: '01714000025' },
    { id: 'buyer-demo-sabiha', name: 'Sabiha Noor', phone: '01714000026' },
    { id: 'buyer-demo-imran', name: 'Imran Hossain', phone: '01714000027' },
    { id: 'buyer-demo-tania', name: 'Tania Sultana', phone: '01714000028' },
  ] as const;

  const projectBuyerIds = new Map<string, string>();
  for (const buyer of buyers) {
    await prisma.buyer.upsert({
      where: { id: buyer.id },
      update: {
        companyId,
        name: buyer.name,
        phone: buyer.phone,
        status: 'ACTIVE',
      },
      create: {
        id: buyer.id,
        companyId,
        name: buyer.name,
        phone: buyer.phone,
        status: 'ACTIVE',
      },
    });

    const membership = await prisma.projectBuyer.upsert({
      where: {
        projectId_buyerId: {
          projectId: demoProject.id,
          buyerId: buyer.id,
        },
      },
      update: {},
      create: {
        projectId: demoProject.id,
        buyerId: buyer.id,
      },
    });
    projectBuyerIds.set(buyer.id, membership.id);
  }

  const units = [
    { id: 'demo-unit-101', floor: 1, unitNo: '101', unitType: 'FLAT', status: 'SOLD', sizesqft: 1450, agreedPrice: 9800000 },
    { id: 'demo-unit-102', floor: 1, unitNo: '102', unitType: 'FLAT', status: 'SOLD', sizesqft: 1465, agreedPrice: 9900000 },
    { id: 'demo-unit-103', floor: 1, unitNo: '103', unitType: 'FLAT', status: 'SOLD', sizesqft: 1480, agreedPrice: 10100000 },
    { id: 'demo-unit-104', floor: 1, unitNo: '104', unitType: 'FLAT', status: 'SOLD', sizesqft: 1495, agreedPrice: 10300000 },
    { id: 'demo-unit-201', floor: 2, unitNo: '201', unitType: 'FLAT', status: 'SOLD', sizesqft: 1450, agreedPrice: 10200000 },
    { id: 'demo-unit-202', floor: 2, unitNo: '202', unitType: 'FLAT', status: 'BOOKED', sizesqft: 1465, agreedPrice: 10000000 },
    { id: 'demo-unit-203', floor: 2, unitNo: '203', unitType: 'FLAT', status: 'SOLD', sizesqft: 1480, agreedPrice: 10400000 },
    { id: 'demo-unit-204', floor: 2, unitNo: '204', unitType: 'FLAT', status: 'SOLD', sizesqft: 1495, agreedPrice: 10450000 },
    { id: 'demo-unit-301', floor: 3, unitNo: '301', unitType: 'FLAT', status: 'BOOKED', sizesqft: 1455, agreedPrice: 10700000 },
    { id: 'demo-unit-302', floor: 3, unitNo: '302', unitType: 'FLAT', status: 'BOOKED', sizesqft: 1470, agreedPrice: 10800000 },
    { id: 'demo-unit-303', floor: 3, unitNo: '303', unitType: 'FLAT', status: 'AVAILABLE', sizesqft: 1485, agreedPrice: 0 },
    { id: 'demo-unit-304', floor: 3, unitNo: '304', unitType: 'FLAT', status: 'AVAILABLE', sizesqft: 1500, agreedPrice: 0 },
    { id: 'demo-unit-p01', floor: 0, unitNo: 'P-01', unitType: 'PARKING', status: 'BOOKED', sizesqft: 135, agreedPrice: 900000 },
    { id: 'demo-unit-p02', floor: 0, unitNo: 'P-02', unitType: 'PARKING', status: 'AVAILABLE', sizesqft: 135, agreedPrice: 0 },
  ] as const;

  await prisma.unit.createMany({
    data: units.map((unit) => ({
      ...unit,
      projectId: demoProject.id,
      notes: 'Seeded unit for modern report and billing QA.',
    })),
  });

  const ownershipRows = [
    { key: 'ow-101-arif', unitId: 'demo-unit-101', unitNo: '101', buyerId: 'buyer-demo-arif', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-102-nusrat', unitId: 'demo-unit-102', unitNo: '102', buyerId: 'buyer-demo-nusrat', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-103-mahmud', unitId: 'demo-unit-103', unitNo: '103', buyerId: 'buyer-demo-mahmud', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-104-farzana', unitId: 'demo-unit-104', unitNo: '104', buyerId: 'buyer-demo-farzana', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-201-arif', unitId: 'demo-unit-201', unitNo: '201', buyerId: 'buyer-demo-arif', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-202-farzana', unitId: 'demo-unit-202', unitNo: '202', buyerId: 'buyer-demo-farzana', sharePercent: 60, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-202-rakib', unitId: 'demo-unit-202', unitNo: '202', buyerId: 'buyer-demo-rakib', sharePercent: 40, relationship: 'CO_OWNER', isPrimary: false, isPayer: true },
    { key: 'ow-203-sabiha', unitId: 'demo-unit-203', unitNo: '203', buyerId: 'buyer-demo-sabiha', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-204-imran', unitId: 'demo-unit-204', unitNo: '204', buyerId: 'buyer-demo-imran', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-301-tania', unitId: 'demo-unit-301', unitNo: '301', buyerId: 'buyer-demo-tania', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
    { key: 'ow-302-mahmud', unitId: 'demo-unit-302', unitNo: '302', buyerId: 'buyer-demo-mahmud', sharePercent: 100, relationship: 'OWNER', isPrimary: true, isPayer: true },
  ] as const;

  await prisma.unitBuyer.createMany({
    data: ownershipRows.map((row) => ({
      unitId: row.unitId,
      buyerId: row.buyerId,
      sharePercent: row.sharePercent,
      relationship: row.relationship,
      isPrimary: row.isPrimary,
      isPayer: row.isPayer,
      notes: 'Seeded ownership row for demo project demand and reconciliation coverage.',
    })),
  });

  const suppliers = [
    {
      id: 'supplier-demo-new-sk',
      name: 'New SK Traders',
      supplierType: 'MATERIAL_SUPPLIER',
      phone: '01810000031',
      address: 'Tongi Bazar, Gazipur',
    },
    {
      id: 'supplier-demo-bismillah',
      name: 'Bismillah Cement & Hardware',
      supplierType: 'MATERIAL_SUPPLIER',
      phone: '01810000032',
      address: 'Dakshinkhan, Dhaka',
    },
    {
      id: 'supplier-demo-piling',
      name: 'Rahman Piling Works',
      supplierType: 'LABOUR_CONTRACTOR',
      phone: '01810000033',
      address: 'Mymensingh Road, Dhaka',
    },
    {
      id: 'supplier-demo-structure',
      name: 'Mizan Structure Works',
      supplierType: 'LABOUR_CONTRACTOR',
      phone: '01810000034',
      address: 'Uttara, Dhaka',
    },
    {
      id: 'supplier-demo-bright',
      name: 'Bright Plumbing & Electrical',
      supplierType: 'LABOUR_CONTRACTOR',
      phone: '01810000035',
      address: 'Khilkhet, Dhaka',
    },
  ] as const;

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { id: supplier.id },
      update: {
        companyId,
        name: supplier.name,
        supplierType: supplier.supplierType,
        phone: supplier.phone,
        address: supplier.address,
        isActive: true,
      },
      create: {
        id: supplier.id,
        companyId,
        name: supplier.name,
        supplierType: supplier.supplierType,
        phone: supplier.phone,
        address: supplier.address,
        isActive: true,
      },
    });
  }

  await prisma.projectSupplier.createMany({
    data: [
      {
        id: 'demo-project-supplier-sk',
        companyId,
        projectId: demoProject.id,
        supplierId: 'supplier-demo-new-sk',
        materialCategory: 'Rod, sand, stone, brick',
        contractNo: 'SUP-NSK-2026-01',
        contractDate: new Date('2026-02-20T00:00:00.000Z'),
        startDate: new Date('2026-02-20T00:00:00.000Z'),
        paymentTerms: '45-day rolling credit',
        openingBalance: 0,
        status: 'ACTIVE',
        notes: 'Primary material vendor for basement and slab work.',
      },
      {
        id: 'demo-project-supplier-bismillah',
        companyId,
        projectId: demoProject.id,
        supplierId: 'supplier-demo-bismillah',
        materialCategory: 'Cement, hardware, electrical materials',
        contractNo: 'SUP-BCH-2026-02',
        contractDate: new Date('2026-03-12T00:00:00.000Z'),
        startDate: new Date('2026-03-12T00:00:00.000Z'),
        paymentTerms: 'Partial advance against approved bills',
        openingBalance: 0,
        status: 'ACTIVE',
        notes: 'Secondary material vendor for common items and utility works.',
      },
    ],
  });

  await prisma.projectSubcontractor.createMany({
    data: [
      {
        id: 'demo-project-sub-piling',
        companyId,
        projectId: demoProject.id,
        supplierId: 'supplier-demo-piling',
        workType: 'Piling',
        assignedPhaseId: 'demo-phase-piling',
        contractAmount: 1900000,
        paymentTerms: 'Certified running bill with 5% retention',
        contractNo: 'SUB-PILING-2026-01',
        contractDate: new Date('2026-01-14T00:00:00.000Z'),
        startDate: new Date('2026-01-18T00:00:00.000Z'),
        deadline: new Date('2026-02-28T00:00:00.000Z'),
        status: 'ACTIVE',
        notes: 'Seeded piling subcontractor for progress bill and retention QA.',
      },
      {
        id: 'demo-project-sub-structure',
        companyId,
        projectId: demoProject.id,
        supplierId: 'supplier-demo-structure',
        workType: 'Structure',
        assignedPhaseId: 'demo-phase-first-slab',
        contractAmount: 3600000,
        paymentTerms: 'Running bill with cheque-backed payments and retention release',
        contractNo: 'SUB-STR-2026-01',
        contractDate: new Date('2026-02-28T00:00:00.000Z'),
        startDate: new Date('2026-03-10T00:00:00.000Z'),
        deadline: new Date('2026-06-30T00:00:00.000Z'),
        status: 'ACTIVE',
        notes: 'Seeded structure subcontractor for cheque and retention-release QA.',
      },
      {
        id: 'demo-project-sub-bright',
        companyId,
        projectId: demoProject.id,
        supplierId: 'supplier-demo-bright',
        workType: 'Plumbing / Electrical',
        assignedPhaseId: 'demo-phase-finishing',
        contractAmount: 1400000,
        paymentTerms: 'Stage bill with retention and deduction handling',
        contractNo: 'SUB-PE-2026-01',
        contractDate: new Date('2026-04-18T00:00:00.000Z'),
        startDate: new Date('2026-04-20T00:00:00.000Z'),
        deadline: new Date('2026-08-31T00:00:00.000Z'),
        status: 'ACTIVE',
        notes: 'Seeded MEP subcontractor for finishing report coverage.',
      },
    ],
  });

  const expenses = [
    {
      id: 'demo-exp-legal-reg',
      phaseId: 'demo-phase-land',
      category: 'LEGAL_REGISTRATION',
      description: 'Land registration and mutation documentation',
      amount: 120000,
      paymentMethod: 'BANK_TRANSFER',
      accountId: mainBankAccountId,
      expenseDate: new Date('2026-01-12T00:00:00.000Z'),
      billNo: 'LG-001',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'LEGAL-2026-01',
      approvedAt: new Date('2026-01-13T00:00:00.000Z'),
      notes: 'Approved land registration support cost.',
    },
    {
      id: 'demo-exp-survey',
      phaseId: 'demo-phase-land',
      category: 'SURVEY_DRAWING',
      description: 'Soil test and survey drawing coordination',
      amount: 35000,
      paymentMethod: 'BANK_TRANSFER',
      accountId: mainBankAccountId,
      expenseDate: new Date('2026-01-20T00:00:00.000Z'),
      billNo: 'SUR-015',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'SURVEY-2026-01',
      approvedAt: new Date('2026-01-20T00:00:00.000Z'),
      notes: 'Survey and drawing support.',
    },
    {
      id: 'demo-exp-piling-food',
      phaseId: 'demo-phase-piling',
      category: 'SITE_FOOD_HOSPITALITY',
      description: 'Site food and labour refreshment',
      amount: 8500,
      paymentMethod: 'CASH',
      accountId: null,
      expenseDate: new Date('2026-02-05T00:00:00.000Z'),
      billNo: 'FOOD-001',
      status: 'PENDING_APPROVAL',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: 'Site Pantry',
      referenceNo: null,
      approvedAt: null,
      notes: 'Voucher not attached yet.',
    },
    {
      id: 'demo-exp-piling-diesel',
      phaseId: 'demo-phase-piling',
      category: 'TRANSPORT',
      description: 'Excavator fuel and transport support',
      amount: 18000,
      paymentMethod: 'CASH',
      accountId: officeCashAccountId,
      expenseDate: new Date('2026-02-08T00:00:00.000Z'),
      billNo: 'TRN-011',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: 'Rahim Fuel Point',
      referenceNo: 'TRN-011',
      approvedAt: new Date('2026-02-08T00:00:00.000Z'),
      notes: 'Approved site transport and diesel support.',
    },
    {
      id: 'demo-exp-basement-water',
      phaseId: 'demo-phase-basement',
      category: 'WATER_BILL',
      description: 'Basement curing water line and utility charge',
      amount: 10200,
      paymentMethod: 'BANK_TRANSFER',
      accountId: mainBankAccountId,
      expenseDate: new Date('2026-03-06T00:00:00.000Z'),
      billNo: 'WTR-044',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'WTR-044',
      approvedAt: new Date('2026-03-06T00:00:00.000Z'),
      notes: 'Water line utility support.',
    },
    {
      id: 'demo-exp-ground-electricity',
      phaseId: 'demo-phase-ground',
      category: 'ELECTRICITY_BILL',
      description: 'Temporary meter recharge and common-area power',
      amount: 18500,
      paymentMethod: 'BANK_TRANSFER',
      accountId: mainBankAccountId,
      expenseDate: new Date('2026-04-04T00:00:00.000Z'),
      billNo: 'ELE-012',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'ELE-012',
      approvedAt: new Date('2026-04-04T00:00:00.000Z'),
      notes: 'Temporary electricity cost.',
    },
    {
      id: 'demo-exp-ground-hardware',
      phaseId: 'demo-phase-ground',
      category: 'HARDWARE',
      description: 'Local hardware and consumables for parking shuttering',
      amount: 22750,
      paymentMethod: 'CASH',
      accountId: officeCashAccountId,
      expenseDate: new Date('2026-04-07T00:00:00.000Z'),
      billNo: 'HDW-019',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: 'M/S Bismillah Hardware',
      referenceNo: 'HDW-019',
      approvedAt: new Date('2026-04-07T00:00:00.000Z'),
      notes: 'Approved local shop expense.',
    },
    {
      id: 'demo-exp-first-security',
      phaseId: 'demo-phase-first-slab',
      category: 'SECURITY_SALARY',
      description: 'Night security and gate control wage',
      amount: 42000,
      paymentMethod: 'CASH',
      accountId: officeCashAccountId,
      expenseDate: new Date('2026-05-04T00:00:00.000Z'),
      billNo: 'SEC-005',
      status: 'APPROVED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'SEC-005',
      approvedAt: new Date('2026-05-04T00:00:00.000Z'),
      notes: 'Approved project security salary.',
    },
    {
      id: 'demo-exp-brick-staff',
      phaseId: 'demo-phase-brick-work',
      category: 'SITE_STAFF_SALARY',
      description: 'Site supervisor salary pending approval',
      amount: 28000,
      paymentMethod: 'BANK_TRANSFER',
      accountId: null,
      expenseDate: new Date('2026-05-12T00:00:00.000Z'),
      billNo: 'STF-003',
      status: 'PENDING_APPROVAL',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: null,
      referenceNo: 'STF-003',
      approvedAt: null,
      notes: 'Pending approval example for audit reporting.',
    },
    {
      id: 'demo-exp-finish-cancelled',
      phaseId: 'demo-phase-finishing',
      category: 'OTHER',
      description: 'Duplicate finishing consumable entry',
      amount: 12000,
      paymentMethod: 'CASH',
      accountId: null,
      expenseDate: new Date('2026-05-16T00:00:00.000Z'),
      billNo: 'FIN-ERR-01',
      status: 'CANCELLED',
      quantity: null,
      unit: null,
      unitPrice: null,
      localShopName: 'North Paint House',
      referenceNo: 'FIN-ERR-01',
      approvedAt: null,
      notes: 'Cancelled duplicate row for reversed/cancelled filter coverage.',
      reversedAt: new Date('2026-05-17T00:00:00.000Z'),
      reversalReason: 'Duplicate entry',
    },
  ] as const;

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        id: expense.id,
        phaseId: expense.phaseId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        accountId: expense.accountId ?? undefined,
        localShopName: expense.localShopName ?? undefined,
        expenseDate: expense.expenseDate,
        billNo: expense.billNo,
        referenceNo: expense.referenceNo ?? undefined,
        status: expense.status,
        createdById: adminId,
        approvedById: expense.status === 'APPROVED' ? adminId : undefined,
        approvedAt: expense.approvedAt ?? undefined,
        notes: expense.notes,
        reversedAt: 'reversedAt' in expense ? expense.reversedAt : undefined,
        reversedById: 'reversedAt' in expense ? adminId : undefined,
        reversalReason: 'reversalReason' in expense ? expense.reversalReason : undefined,
      },
    });
  }

  const approvedExpenses = expenses.filter(
    (expense) => expense.status === 'APPROVED' && expense.accountId,
  );
  await prisma.cashBankTransaction.createMany({
    data: approvedExpenses.map((expense) => ({
      companyId,
      projectId: demoProject.id,
      accountId: expense.accountId!,
      type: 'OUTFLOW',
      sourceType: 'DIRECT_EXPENSE',
      sourceId: expense.id,
      amount: expense.amount,
      transactionDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      referenceNo: expense.referenceNo ?? expense.billNo,
      description: expense.description,
      status: 'POSTED',
      createdById: adminId,
    })),
  });

  const serviceCharges = [
    {
      id: 'demo-sc-piling',
      phaseId: 'demo-phase-piling',
      basisType: 'PHASE_TOTAL_COST',
      basisAmount: 1600000,
      percentage: 7.5,
      serviceChargeAmount: 120000,
      includedInDemand: true,
      status: 'APPROVED',
      settlementStatus: 'INCLUDED_IN_DEMAND',
      approvedAt: new Date('2026-02-10T00:00:00.000Z'),
      notes: 'Included in piling demand batch.',
    },
    {
      id: 'demo-sc-basement',
      phaseId: 'demo-phase-basement',
      basisType: 'PHASE_TOTAL_COST',
      basisAmount: 2200000,
      percentage: 7.5,
      serviceChargeAmount: 165000,
      includedInDemand: true,
      status: 'APPROVED',
      settlementStatus: 'INCLUDED_IN_DEMAND',
      approvedAt: new Date('2026-03-10T00:00:00.000Z'),
      notes: 'Included in basement demand batch.',
    },
    {
      id: 'demo-sc-ground',
      phaseId: 'demo-phase-ground',
      basisType: 'PHASE_TOTAL_COST',
      basisAmount: 1350000,
      percentage: 7.5,
      serviceChargeAmount: 101250,
      includedInDemand: true,
      status: 'APPROVED',
      settlementStatus: 'INCLUDED_IN_DEMAND',
      approvedAt: new Date('2026-04-10T00:00:00.000Z'),
      notes: 'Included in ground-floor demand batch.',
    },
    {
      id: 'demo-sc-first',
      phaseId: 'demo-phase-first-slab',
      basisType: 'PHASE_TOTAL_COST',
      basisAmount: 1950000,
      percentage: 3,
      serviceChargeAmount: 58500,
      includedInDemand: true,
      status: 'APPROVED',
      settlementStatus: 'INCLUDED_IN_DEMAND',
      approvedAt: new Date('2026-05-08T00:00:00.000Z'),
      notes: 'Included in first-slab demand batch using phase override.',
    },
    {
      id: 'demo-sc-manual',
      phaseId: null,
      basisType: 'MANUAL',
      basisAmount: 500000,
      percentage: 0,
      serviceChargeAmount: 25000,
      includedInDemand: false,
      status: 'APPROVED',
      settlementStatus: 'SETTLED',
      settlementAccountId: officeCashAccountId,
      settlementMethod: 'CASH',
      settledAt: new Date('2026-05-18T00:00:00.000Z'),
      approvedAt: new Date('2026-05-15T00:00:00.000Z'),
      notes: 'Project-level supervision fee settled separately.',
    },
    {
      id: 'demo-sc-finishing-draft',
      phaseId: 'demo-phase-finishing',
      basisType: 'PHASE_TOTAL_COST',
      basisAmount: 900000,
      percentage: 7.5,
      serviceChargeAmount: 67500,
      includedInDemand: false,
      status: 'CALCULATED',
      settlementStatus: 'UNSETTLED',
      approvedAt: null,
      notes: 'Calculated only; kept for pending/audit reporting.',
    },
  ] as const;

  await prisma.serviceChargeEntry.createMany({
    data: serviceCharges.map((entry) => ({
      id: entry.id,
      companyId,
      projectId: demoProject.id,
      phaseId: entry.phaseId ?? undefined,
      basisType: entry.basisType,
      basisAmount: entry.basisAmount,
      percentage: entry.percentage,
      serviceChargeAmount: entry.serviceChargeAmount,
      includedInDemand: entry.includedInDemand,
      status: entry.status,
      settlementStatus: entry.settlementStatus,
      settlementAccountId: 'settlementAccountId' in entry ? entry.settlementAccountId : undefined,
      settlementMethod: 'settlementMethod' in entry ? entry.settlementMethod : undefined,
      settledAt: 'settledAt' in entry ? entry.settledAt : undefined,
      calculatedAt: entry.approvedAt ?? demoNow,
      approvedAt: entry.approvedAt ?? undefined,
      approvedById: entry.approvedAt ? adminId : undefined,
      notes: entry.notes,
    })),
  });

  const demandBatches = [
    {
      id: 'demo-batch-piling',
      batchNo: 'DB-MDCP-0001',
      phaseId: 'demo-phase-piling',
      title: 'Piling Phase Bill',
      basisType: 'OWNERSHIP_SHARE',
      baseAmount: 1600000,
      serviceChargeEntryId: 'demo-sc-piling',
      serviceChargeAmount: 120000,
      adjustmentAmount: 0,
      carryForwardAmount: 0,
      dueDate: new Date('2026-02-15T00:00:00.000Z'),
      notes: 'Initial piling demand with included supervision charge.',
    },
    {
      id: 'demo-batch-basement',
      batchNo: 'DB-MDCP-0002',
      phaseId: 'demo-phase-basement',
      title: 'Basement Phase Bill',
      basisType: 'OWNERSHIP_SHARE',
      baseAmount: 2200000,
      serviceChargeEntryId: 'demo-sc-basement',
      serviceChargeAmount: 165000,
      adjustmentAmount: 25000,
      carryForwardAmount: 40000,
      dueDate: new Date('2026-03-15T00:00:00.000Z'),
      notes: 'Includes carry-forward and basement adjustment coverage.',
    },
    {
      id: 'demo-batch-ground',
      batchNo: 'DB-MDCP-0003',
      phaseId: 'demo-phase-ground',
      title: 'Ground Floor / Parking Bill',
      basisType: 'OWNERSHIP_SHARE',
      baseAmount: 1350000,
      serviceChargeEntryId: 'demo-sc-ground',
      serviceChargeAmount: 101250,
      adjustmentAmount: -15000,
      carryForwardAmount: 120000,
      dueDate: new Date('2026-04-15T00:00:00.000Z'),
      notes: 'Ground-floor bill with adjustment credit and carry-forward.',
    },
    {
      id: 'demo-batch-first',
      batchNo: 'DB-MDCP-0004',
      phaseId: 'demo-phase-first-slab',
      title: '1st Slab Bill',
      basisType: 'OWNERSHIP_SHARE',
      baseAmount: 1950000,
      serviceChargeEntryId: 'demo-sc-first',
      serviceChargeAmount: 58500,
      adjustmentAmount: 0,
      carryForwardAmount: 75000,
      dueDate: new Date('2026-05-15T00:00:00.000Z'),
      notes: 'First slab running bill with carry-forward support.',
    },
  ] as const;

  const demandLookup = new Map<string, { id: string; amount: number; title: string; unitId: string; buyerId: string; phaseId: string }>();
  const weightedRows = ownershipRows.map((row) => ({ key: row.key, weight: row.sharePercent }));

  for (const batch of demandBatches) {
    await prisma.demandBatch.create({
      data: {
        id: batch.id,
        companyId,
        projectId: demoProject.id,
        phaseId: batch.phaseId,
        title: batch.title,
        batchNo: batch.batchNo,
        basisType: batch.basisType,
        baseAmount: batch.baseAmount,
        serviceChargeEntryId: batch.serviceChargeEntryId,
        serviceChargeAmount: batch.serviceChargeAmount,
        adjustmentAmount: batch.adjustmentAmount,
        carryForwardAmount: batch.carryForwardAmount,
        totalBillableAmount: roundMoney(
          batch.baseAmount + batch.serviceChargeAmount + batch.adjustmentAmount + batch.carryForwardAmount,
        ),
        dueDate: batch.dueDate,
        status: 'ISSUED',
        issuedAt: new Date(batch.dueDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        issuedById: adminId,
        notes: batch.notes,
      },
    });

    const baseAllocations = new Map(distributeWeightedAmount(batch.baseAmount, weightedRows).map((row) => [row.key, row.amount]));
    const serviceAllocations = new Map(distributeWeightedAmount(batch.serviceChargeAmount, weightedRows).map((row) => [row.key, row.amount]));
    const adjustmentAllocations = new Map(distributeWeightedAmount(Math.abs(batch.adjustmentAmount), weightedRows).map((row) => [row.key, row.amount]));
    const carryAllocations = new Map(distributeWeightedAmount(batch.carryForwardAmount, weightedRows).map((row) => [row.key, row.amount]));

    let counter = 1;
    for (const ownership of ownershipRows) {
      const baseAmount = baseAllocations.get(ownership.key) ?? 0;
      const serviceChargeAmount = serviceAllocations.get(ownership.key) ?? 0;
      const adjustmentMagnitude = adjustmentAllocations.get(ownership.key) ?? 0;
      const adjustmentAmount = batch.adjustmentAmount < 0 ? -adjustmentMagnitude : adjustmentMagnitude;
      const carryForwardAmount = carryAllocations.get(ownership.key) ?? 0;
      const amount = roundMoney(baseAmount + serviceChargeAmount + adjustmentAmount + carryForwardAmount);
      const demandId = `demo-demand-${batch.id}-${String(counter).padStart(3, '0')}`;
      const title = `${batch.title} - Unit ${ownership.unitNo}`;

      await prisma.demand.create({
        data: {
          id: demandId,
          unitId: ownership.unitId,
          buyerId: ownership.buyerId,
          phaseId: batch.phaseId,
          demandBatchId: batch.id,
          demandNo: `${batch.batchNo}-${String(counter).padStart(3, '0')}`,
          title,
          amount,
          baseAmount,
          serviceChargeAmount,
          adjustmentAmount,
          carryForwardAmount,
          dueDate: batch.dueDate,
          demandType: 'REGULAR',
          status: 'ISSUED',
          issuedAt: new Date(batch.dueDate.getTime() - 5 * 24 * 60 * 60 * 1000),
          notes: batch.notes,
        },
      });

      demandLookup.set(`${batch.id}:${ownership.unitId}:${ownership.buyerId}`, {
        id: demandId,
        amount,
        title,
        unitId: ownership.unitId,
        buyerId: ownership.buyerId,
        phaseId: batch.phaseId,
      });
      counter += 1;
    }
  }

  const getDemand = (batchId: string, unitId: string, buyerId: string) => {
    const demand = demandLookup.get(`${batchId}:${unitId}:${buyerId}`);
    if (!demand) {
      throw new Error(`Seed demand lookup failed for ${batchId} / ${unitId} / ${buyerId}`);
    }
    return demand;
  };

  const collections = [
    {
      id: 'demo-col-001',
      phaseId: 'demo-phase-piling',
      buyerId: 'buyer-demo-arif',
      accountId: mainBankAccountId,
      amount: roundMoney(
        getDemand('demo-batch-piling', 'demo-unit-101', 'buyer-demo-arif').amount +
        getDemand('demo-batch-piling', 'demo-unit-201', 'buyer-demo-arif').amount,
      ),
      paymentMethod: 'BANK_TRANSFER',
      receiptNo: 'RCP-MDCP-0001',
      reference: 'MB-DEP-001',
      receivedDate: new Date('2026-02-18T00:00:00.000Z'),
      notes: 'Bank transfer covering both owned piling demands.',
      allocations: [
        {
          demandId: getDemand('demo-batch-piling', 'demo-unit-101', 'buyer-demo-arif').id,
          amount: getDemand('demo-batch-piling', 'demo-unit-101', 'buyer-demo-arif').amount,
        },
        {
          demandId: getDemand('demo-batch-piling', 'demo-unit-201', 'buyer-demo-arif').id,
          amount: getDemand('demo-batch-piling', 'demo-unit-201', 'buyer-demo-arif').amount,
        },
      ],
    },
    {
      id: 'demo-col-002',
      phaseId: 'demo-phase-piling',
      buyerId: 'buyer-demo-nusrat',
      accountId: officeCashAccountId,
      amount: getDemand('demo-batch-piling', 'demo-unit-102', 'buyer-demo-nusrat').amount,
      paymentMethod: 'CASH',
      receiptNo: 'RCP-MDCP-0002',
      reference: 'CASH-102',
      receivedDate: new Date('2026-02-19T00:00:00.000Z'),
      notes: 'Cash receipt for the first piling bill.',
      demandId: getDemand('demo-batch-piling', 'demo-unit-102', 'buyer-demo-nusrat').id,
      allocations: [
        {
          demandId: getDemand('demo-batch-piling', 'demo-unit-102', 'buyer-demo-nusrat').id,
          amount: getDemand('demo-batch-piling', 'demo-unit-102', 'buyer-demo-nusrat').amount,
        },
      ],
    },
    {
      id: 'demo-col-003',
      phaseId: 'demo-phase-piling',
      buyerId: 'buyer-demo-mahmud',
      accountId: chequeClearingAccount.id,
      amount: 100000,
      paymentMethod: 'CHEQUE',
      receiptNo: 'RCP-MDCP-0003',
      reference: 'CHQ-RCV-301',
      chequeNo: 'RCV-332211',
      bankName: 'Demo Bank',
      chequeBranchName: 'Airport Branch',
      chequeDate: new Date('2026-02-20T00:00:00.000Z'),
      chequeMaturityDate: new Date('2026-02-25T00:00:00.000Z'),
      receivedDate: new Date('2026-02-20T00:00:00.000Z'),
      notes: 'Cheque receipt kept pending in clearing account.',
      demandId: getDemand('demo-batch-piling', 'demo-unit-103', 'buyer-demo-mahmud').id,
      allocations: [
        {
          demandId: getDemand('demo-batch-piling', 'demo-unit-103', 'buyer-demo-mahmud').id,
          amount: 100000,
        },
      ],
    },
    {
      id: 'demo-col-004',
      phaseId: 'demo-phase-basement',
      buyerId: 'buyer-demo-farzana',
      accountId: mobileAccount.id,
      amount: 220000,
      paymentMethod: 'MOBILE_BANKING',
      receiptNo: 'RCP-MDCP-0004',
      reference: 'BKASH-20260401',
      receivedDate: new Date('2026-03-22T00:00:00.000Z'),
      notes: 'Mobile collection allocated across unit 104 and co-owned unit 202 share.',
      allocations: [
        {
          demandId: getDemand('demo-batch-basement', 'demo-unit-104', 'buyer-demo-farzana').id,
          amount: 130000,
        },
        {
          demandId: getDemand('demo-batch-basement', 'demo-unit-202', 'buyer-demo-farzana').id,
          amount: 90000,
        },
      ],
    },
    {
      id: 'demo-col-005',
      phaseId: 'demo-phase-basement',
      buyerId: 'buyer-demo-arif',
      accountId: mainBankAccountId,
      amount: 520000,
      paymentMethod: 'BANK_TRANSFER',
      receiptNo: 'RCP-MDCP-0005',
      reference: 'MB-DEP-002',
      receivedDate: new Date('2026-03-24T00:00:00.000Z'),
      notes: 'Partial settlement against basement demands for two owned units.',
      allocations: [
        {
          demandId: getDemand('demo-batch-basement', 'demo-unit-101', 'buyer-demo-arif').id,
          amount: 260000,
        },
        {
          demandId: getDemand('demo-batch-basement', 'demo-unit-201', 'buyer-demo-arif').id,
          amount: 260000,
        },
      ],
    },
    {
      id: 'demo-col-006',
      phaseId: 'demo-phase-ground',
      buyerId: 'buyer-demo-sabiha',
      accountId: mainBankAccountId,
      amount: roundMoney(
        getDemand('demo-batch-ground', 'demo-unit-203', 'buyer-demo-sabiha').amount + 25000,
      ),
      paymentMethod: 'BANK_TRANSFER',
      receiptNo: 'RCP-MDCP-0006',
      reference: 'MB-DEP-003',
      receivedDate: new Date('2026-04-19T00:00:00.000Z'),
      notes: 'Ground-floor payment with extra advance left unallocated.',
      demandId: getDemand('demo-batch-ground', 'demo-unit-203', 'buyer-demo-sabiha').id,
      allocations: [
        {
          demandId: getDemand('demo-batch-ground', 'demo-unit-203', 'buyer-demo-sabiha').id,
          amount: getDemand('demo-batch-ground', 'demo-unit-203', 'buyer-demo-sabiha').amount,
        },
      ],
    },
    {
      id: 'demo-col-007',
      phaseId: 'demo-phase-ground',
      buyerId: 'buyer-demo-imran',
      accountId: officeCashAccountId,
      amount: 90000,
      paymentMethod: 'CASH',
      receiptNo: 'RCP-MDCP-0007',
      reference: 'CASH-204',
      receivedDate: new Date('2026-04-21T00:00:00.000Z'),
      notes: 'Partial cash collection for ground-floor demand.',
      demandId: getDemand('demo-batch-ground', 'demo-unit-204', 'buyer-demo-imran').id,
      allocations: [
        {
          demandId: getDemand('demo-batch-ground', 'demo-unit-204', 'buyer-demo-imran').id,
          amount: 90000,
        },
      ],
    },
    {
      id: 'demo-col-008',
      phaseId: 'demo-phase-first-slab',
      buyerId: 'buyer-demo-tania',
      accountId: mainBankAccountId,
      amount: getDemand('demo-batch-first', 'demo-unit-301', 'buyer-demo-tania').amount,
      paymentMethod: 'BANK_TRANSFER',
      receiptNo: 'RCP-MDCP-0008',
      reference: 'MB-DEP-004',
      receivedDate: new Date('2026-05-18T00:00:00.000Z'),
      notes: 'First-slab bill fully settled by bank transfer.',
      demandId: getDemand('demo-batch-first', 'demo-unit-301', 'buyer-demo-tania').id,
      allocations: [
        {
          demandId: getDemand('demo-batch-first', 'demo-unit-301', 'buyer-demo-tania').id,
          amount: getDemand('demo-batch-first', 'demo-unit-301', 'buyer-demo-tania').amount,
        },
      ],
    },
    {
      id: 'demo-col-009',
      phaseId: 'demo-phase-first-slab',
      buyerId: 'buyer-demo-arif',
      accountId: mobileAccount.id,
      amount: 50000,
      paymentMethod: 'MOBILE_BANKING',
      receiptNo: 'RCP-MDCP-0009',
      reference: 'BKASH-ADV-001',
      receivedDate: new Date('2026-05-20T00:00:00.000Z'),
      notes: 'Pure advance collection for later slab billing.',
      allocations: [],
    },
  ] as const;

  for (const collection of collections) {
    await prisma.collection.create({
      data: {
        id: collection.id,
        phaseId: collection.phaseId,
        buyerId: collection.buyerId,
        demandId: 'demandId' in collection ? collection.demandId : undefined,
        accountId: collection.accountId,
        receiptNo: collection.receiptNo,
        amount: collection.amount,
        paymentMethod: collection.paymentMethod,
        transactionType: 'COLLECTION',
        chequeNo: 'chequeNo' in collection ? collection.chequeNo : undefined,
        chequeDate: 'chequeDate' in collection ? collection.chequeDate : undefined,
        bankName: 'bankName' in collection ? collection.bankName : undefined,
        chequeBranchName: 'chequeBranchName' in collection ? collection.chequeBranchName : undefined,
        chequeMaturityDate: 'chequeMaturityDate' in collection ? collection.chequeMaturityDate : undefined,
        reference: collection.reference,
        receivedDate: collection.receivedDate,
        notes: collection.notes,
        status: 'APPROVED',
      },
    });

    for (const allocation of collection.allocations) {
      await prisma.collectionAllocation.create({
        data: {
          collectionId: collection.id,
          demandId: allocation.demandId,
          amount: allocation.amount,
        },
      });
    }
  }

  await prisma.cashBankTransaction.createMany({
    data: collections.map((collection) => ({
      companyId,
      projectId: demoProject.id,
      accountId: collection.accountId,
      type: 'INFLOW',
      sourceType: 'BUYER_COLLECTION',
      sourceId: collection.id,
      partyType: 'BUYER',
      partyId: collection.buyerId,
      partyName: buyers.find((buyer) => buyer.id === collection.buyerId)?.name ?? 'Buyer',
      amount: collection.amount,
      transactionDate: collection.receivedDate,
      paymentMethod: collection.paymentMethod,
      referenceNo: collection.reference,
      description: collection.notes,
      status: collection.paymentMethod === 'CHEQUE' ? 'DRAFT' : 'POSTED',
      createdById: adminId,
    })),
  });

  await prisma.chequeLog.createMany({
    data: collections
      .filter((collection) => collection.paymentMethod === 'CHEQUE')
      .map((collection) => ({
        companyId,
        projectId: demoProject.id,
        accountId: collection.accountId,
        chequeType: 'RECEIVED',
        chequeNo: collection.chequeNo!,
        bankName: collection.bankName!,
        branchName: collection.chequeBranchName,
        chequeDate: collection.chequeDate!,
        maturityDate: collection.chequeMaturityDate,
        amount: collection.amount,
        partyType: 'BUYER',
        partyId: collection.buyerId,
        partyName: buyers.find((buyer) => buyer.id === collection.buyerId)?.name ?? 'Buyer',
        sourceType: 'BUYER_COLLECTION',
        sourceId: collection.id,
        status: 'PENDING',
        notes: collection.notes,
      })),
  });

  const payableSeeds = [
    {
      id: 'demo-payable-sk-001',
      supplierId: 'supplier-demo-new-sk',
      projectSupplierId: 'demo-project-supplier-sk',
      phaseId: 'demo-phase-basement',
      billNo: 'PB-NSK-001',
      billDate: new Date('2026-03-05T00:00:00.000Z'),
      totalAmount: 541500,
      vatPct: 0,
      vatAmount: 0,
      aitTdsPct: 0,
      aitTdsAmount: 0,
      otherDeductionAmount: 0,
      retentionType: 'NONE',
      retentionPct: 0,
      retentionAmount: 0,
      retentionReleasedAmount: 0,
      retentionStatus: 'NOT_APPLICABLE',
      dueDate: new Date('2026-04-15T00:00:00.000Z'),
      notes: 'Combined material bill with multiple item rows.',
      items: [
        { description: 'Iron rod - 3.5 ton', category: 'ROD_STEEL', quantity: 3.5, unit: 'ton', unitPrice: 89000, amount: 311500 },
        { description: 'Selection sand', category: 'SAND', quantity: 600, unit: 'cft', unitPrice: 60, amount: 36000 },
        { description: 'Stone chips', category: 'STONE_AGGREGATE', quantity: 400, unit: 'cft', unitPrice: 95, amount: 38000 },
        { description: 'Bricks', category: 'BRICK', quantity: 12000, unit: 'pcs', unitPrice: 13, amount: 156000 },
      ],
      payments: [
        {
          id: 'demo-payment-sk-001',
          amount: 200000,
          accountId: mainBankAccountId,
          paymentMethod: 'BANK_TRANSFER',
          reference: 'SUP-PAY-001',
          paidAt: new Date('2026-03-12T00:00:00.000Z'),
          status: 'CLEARED',
          chequeStatus: null,
          notes: 'First supplier payment against basement materials.',
        },
      ],
    },
    {
      id: 'demo-payable-bh-004',
      supplierId: 'supplier-demo-bismillah',
      projectSupplierId: 'demo-project-supplier-bismillah',
      phaseId: 'demo-phase-ground',
      billNo: 'PB-BCH-004',
      billDate: new Date('2026-04-03T00:00:00.000Z'),
      totalAmount: 420000,
      vatPct: 5,
      vatAmount: 21000,
      aitTdsPct: 2,
      aitTdsAmount: 8400,
      otherDeductionAmount: 1600,
      deductionReference: 'VAT/AIT-APR-04',
      retentionType: 'NONE',
      retentionPct: 0,
      retentionAmount: 0,
      retentionReleasedAmount: 0,
      retentionStatus: 'NOT_APPLICABLE',
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
      notes: 'Material bill with VAT and AIT/TDS deduction examples.',
      items: [
        { description: 'Cement - 500 bags', category: 'CEMENT', quantity: 500, unit: 'bag', unitPrice: 510, amount: 255000 },
        { description: 'General hardware materials', category: 'HARDWARE', quantity: null, unit: null, unitPrice: null, amount: 80000 },
        { description: 'Electrical conduits and accessories', category: 'ELECTRICAL_MATERIAL', quantity: null, unit: null, unitPrice: null, amount: 85000 },
      ],
      payments: [
        {
          id: 'demo-payment-bh-004',
          amount: 150000,
          accountId: officeCashAccountId,
          paymentMethod: 'CASH',
          reference: 'SUP-PAY-002',
          paidAt: new Date('2026-04-08T00:00:00.000Z'),
          status: 'CLEARED',
          chequeStatus: null,
          notes: 'Partial supplier settlement paid from office cash.',
        },
      ],
    },
    {
      id: 'demo-payable-piling-01',
      supplierId: 'supplier-demo-piling',
      projectSubcontractorId: 'demo-project-sub-piling',
      phaseId: 'demo-phase-piling',
      billNo: 'SCB-PILING-01',
      billDate: new Date('2026-02-18T00:00:00.000Z'),
      totalAmount: 780000,
      vatPct: 0,
      vatAmount: 0,
      aitTdsPct: 2,
      aitTdsAmount: 15600,
      otherDeductionAmount: 0,
      deductionReference: 'AIT-PILING-01',
      retentionType: 'PERCENTAGE',
      retentionPct: 5,
      retentionAmount: 39000,
      retentionReleasedAmount: 0,
      retentionStatus: 'HELD',
      dueDate: new Date('2026-03-31T00:00:00.000Z'),
      notes: 'Seeded piling progress bill with retention held.',
      items: [
        { description: 'Piling progress work - bore, cage, cap', category: 'CONTRACTOR_BILL', quantity: 1, unit: 'lot', unitPrice: 780000, amount: 780000 },
      ],
      payments: [
        {
          id: 'demo-payment-piling-01',
          amount: 300000,
          accountId: mainBankAccountId,
          paymentMethod: 'BANK_TRANSFER',
          reference: 'SUB-PAY-001',
          paidAt: new Date('2026-02-25T00:00:00.000Z'),
          status: 'CLEARED',
          chequeStatus: null,
          notes: 'First progress payment for piling contractor.',
        },
      ],
    },
    {
      id: 'demo-payable-structure-02',
      supplierId: 'supplier-demo-structure',
      projectSubcontractorId: 'demo-project-sub-structure',
      phaseId: 'demo-phase-first-slab',
      billNo: 'SCB-STR-02',
      billDate: new Date('2026-05-05T00:00:00.000Z'),
      totalAmount: 960000,
      vatPct: 0,
      vatAmount: 0,
      aitTdsPct: 3,
      aitTdsAmount: 28800,
      otherDeductionAmount: 0,
      deductionReference: 'AIT-STR-02',
      retentionType: 'PERCENTAGE',
      retentionPct: 5,
      retentionAmount: 48000,
      retentionReleasedAmount: 20000,
      retentionStatus: 'PARTIALLY_RELEASED',
      dueDate: new Date('2026-06-15T00:00:00.000Z'),
      notes: 'Structure running bill with pending cheque and retention release.',
      items: [
        { description: 'RCC frame progress bill - first slab', category: 'CONTRACTOR_BILL', quantity: 1, unit: 'lot', unitPrice: 960000, amount: 960000 },
      ],
      payments: [
        {
          id: 'demo-payment-structure-progress',
          amount: 400000,
          accountId: mainBankAccountId,
          paymentMethod: 'CHEQUE',
          reference: 'CHQ-ISS-5001',
          chequeNo: 'ISS-5001',
          chequeDate: new Date('2026-05-09T00:00:00.000Z'),
          bankName: 'Demo Bank',
          chequeBranchName: 'Corporate Branch',
          chequeMaturityDate: new Date('2026-05-12T00:00:00.000Z'),
          paidAt: new Date('2026-05-09T00:00:00.000Z'),
          status: 'ISSUED',
          chequeStatus: 'ISSUED',
          notes: 'Issued cheque against structure running bill.',
        },
        {
          id: 'demo-payment-structure-release',
          amount: 20000,
          accountId: mainBankAccountId,
          paymentMethod: 'BANK_TRANSFER',
          reference: 'RET-REL-001',
          paidAt: new Date('2026-05-20T00:00:00.000Z'),
          status: 'CLEARED',
          chequeStatus: null,
          notes: 'Retention release voucher sample.',
        },
      ],
    },
    {
      id: 'demo-payable-bright-03',
      supplierId: 'supplier-demo-bright',
      projectSubcontractorId: 'demo-project-sub-bright',
      phaseId: 'demo-phase-finishing',
      billNo: 'SCB-PE-03',
      billDate: new Date('2026-05-16T00:00:00.000Z'),
      totalAmount: 265000,
      vatPct: 0,
      vatAmount: 0,
      aitTdsPct: 0,
      aitTdsAmount: 0,
      otherDeductionAmount: 5000,
      deductionReference: 'DED-PE-03',
      retentionType: 'PERCENTAGE',
      retentionPct: 5,
      retentionAmount: 13250,
      retentionReleasedAmount: 0,
      retentionStatus: 'HELD',
      dueDate: new Date('2026-06-25T00:00:00.000Z'),
      notes: 'Finishing-stage plumbing and electrical progress bill.',
      items: [
        { description: 'Plumbing rough-in progress', category: 'SANITARY_FITTINGS', quantity: null, unit: null, unitPrice: null, amount: 150000 },
        { description: 'Electrical conduit and point preparation', category: 'ELECTRICAL_MATERIAL', quantity: null, unit: null, unitPrice: null, amount: 115000 },
      ],
      payments: [
        {
          id: 'demo-payment-bright-03',
          amount: 100000,
          accountId: mainBankAccountId,
          paymentMethod: 'BANK_TRANSFER',
          reference: 'SUB-PAY-003',
          paidAt: new Date('2026-05-22T00:00:00.000Z'),
          status: 'CLEARED',
          chequeStatus: null,
          notes: 'Partial finishing-stage payment.',
        },
      ],
    },
  ] as const;

  const payableIds: string[] = [];
  const paymentRows: Array<{
    id: string;
    payableId: string;
    supplierId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    accountId: string;
    reference: string | null | undefined;
    paidAt: Date;
    status: string;
    chequeStatus: string | null | undefined;
    chequeNo?: string;
    chequeDate?: Date;
    bankName?: string;
    chequeBranchName?: string;
    chequeMaturityDate?: Date;
    notes?: string;
    sourceType: 'SUPPLIER_PAYMENT' | 'SUBCONTRACTOR_PAYMENT';
    partyType: 'SUPPLIER' | 'SUBCONTRACTOR';
    partyName: string;
  }> = [];

  for (const payable of payableSeeds) {
    const vatAmount = payable.vatAmount ?? 0;
    const aitTdsAmount = payable.aitTdsAmount ?? 0;
    const otherDeductionAmount = payable.otherDeductionAmount ?? 0;
    const retentionAmount = payable.retentionAmount ?? 0;
    const paidAmount = payable.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const netPayableAmount = roundMoney(payable.totalAmount - vatAmount - aitTdsAmount - otherDeductionAmount);
    const dueAmount = roundMoney(netPayableAmount - retentionAmount - paidAmount);
    const supplier = suppliers.find((row) => row.id === payable.supplierId)!;
    const sourceType = supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'SUBCONTRACTOR_PAYMENT' : 'SUPPLIER_PAYMENT';
    const partyType = supplier.supplierType === 'LABOUR_CONTRACTOR' ? 'SUBCONTRACTOR' : 'SUPPLIER';

    await prisma.supplierPayable.create({
      data: {
        id: payable.id,
        supplierId: payable.supplierId,
        projectId: demoProject.id,
        phaseId: payable.phaseId,
        projectSupplierId: 'projectSupplierId' in payable ? payable.projectSupplierId : undefined,
        projectSubcontractorId: 'projectSubcontractorId' in payable ? payable.projectSubcontractorId : undefined,
        billNo: payable.billNo,
        billDate: payable.billDate,
        totalAmount: payable.totalAmount,
        vatPct: payable.vatPct,
        vatAmount,
        aitTdsPct: payable.aitTdsPct,
        aitTdsAmount,
        otherDeductionAmount,
        deductionReference: 'deductionReference' in payable ? payable.deductionReference : undefined,
        retentionType: payable.retentionType,
        retentionPct: payable.retentionPct,
        retentionAmount,
        retentionStatus: payable.retentionStatus,
        retentionReleasedAmount: payable.retentionReleasedAmount,
        netPayableAmount,
        paidAmount,
        dueAmount,
        dueDate: payable.dueDate,
        status: dueAmount <= 0 && retentionAmount <= payable.retentionReleasedAmount ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        notes: payable.notes,
        billItems: {
          create: payable.items.map((item) => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity ?? undefined,
            unit: item.unit ?? undefined,
            unitPrice: item.unitPrice ?? undefined,
            amount: item.amount,
          })),
        },
      },
    });

    payableIds.push(payable.id);

    for (const payment of payable.payments) {
      await prisma.supplierPayment.create({
        data: {
          id: payment.id,
          payableId: payable.id,
          accountId: payment.accountId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          chequeNo: 'chequeNo' in payment ? payment.chequeNo : undefined,
          chequeDate: 'chequeDate' in payment ? payment.chequeDate : undefined,
          bankName: 'bankName' in payment ? payment.bankName : undefined,
          chequeBranchName: 'chequeBranchName' in payment ? payment.chequeBranchName : undefined,
          chequeMaturityDate: 'chequeMaturityDate' in payment ? payment.chequeMaturityDate : undefined,
          reference: payment.reference ?? undefined,
          paidAt: payment.paidAt,
          notes: payment.notes,
          status: payment.status,
          chequeStatus: payment.chequeStatus ?? undefined,
        },
      });

      paymentRows.push({
        id: payment.id,
        payableId: payable.id,
        supplierId: payable.supplierId,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        accountId: payment.accountId,
        reference: payment.reference,
        paidAt: payment.paidAt,
        status: payment.status,
        chequeStatus: payment.chequeStatus,
        chequeNo: 'chequeNo' in payment ? payment.chequeNo : undefined,
        chequeDate: 'chequeDate' in payment ? payment.chequeDate : undefined,
        bankName: 'bankName' in payment ? payment.bankName : undefined,
        chequeBranchName: 'chequeBranchName' in payment ? payment.chequeBranchName : undefined,
        chequeMaturityDate: 'chequeMaturityDate' in payment ? payment.chequeMaturityDate : undefined,
        notes: payment.notes,
        sourceType,
        partyType,
        partyName: supplier.name,
      });
    }
  }

  await prisma.cashBankTransaction.createMany({
    data: paymentRows.map((payment) => ({
      companyId,
      projectId: demoProject.id,
      accountId: payment.accountId,
      type: 'OUTFLOW',
      sourceType: payment.sourceType,
      sourceId: payment.id,
      partyType: payment.partyType,
      partyId: payment.supplierId,
      partyName: payment.partyName,
      amount: payment.amount,
      transactionDate: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.reference ?? payment.chequeNo,
      description: payment.notes ?? `${payment.partyName} payment`,
      status: payment.paymentMethod === 'CHEQUE' ? 'DRAFT' : 'POSTED',
      createdById: adminId,
    })),
  });

  await prisma.chequeLog.createMany({
    data: paymentRows
      .filter((payment) => payment.paymentMethod === 'CHEQUE')
      .map((payment) => ({
        companyId,
        projectId: demoProject.id,
        accountId: payment.accountId,
        chequeType: 'ISSUED',
        chequeNo: payment.chequeNo!,
        bankName: payment.bankName!,
        branchName: payment.chequeBranchName,
        chequeDate: payment.chequeDate!,
        maturityDate: payment.chequeMaturityDate,
        amount: payment.amount,
        partyType: payment.partyType,
        partyId: payment.supplierId,
        partyName: payment.partyName,
        sourceType: payment.sourceType,
        sourceId: payment.id,
        status: 'PENDING',
        notes: payment.notes,
      })),
  });

  const transfer = await prisma.accountTransfer.create({
    data: {
      id: 'demo-transfer-001',
      companyId,
      fromAccountId: officeCashAccountId,
      toAccountId: mainBankAccountId,
      amount: 150000,
      transferDate: new Date('2026-04-12T00:00:00.000Z'),
      referenceNo: 'DEMO-TRF-001',
      notes: 'Seeded internal transfer for treasury reporting coverage.',
      status: 'POSTED',
      createdById: adminId,
    },
  });

  await prisma.cashBankTransaction.createMany({
    data: [
      {
        companyId,
        projectId: demoProject.id,
        accountId: officeCashAccountId,
        type: 'TRANSFER_OUT',
        sourceType: 'ACCOUNT_TRANSFER',
        sourceId: transfer.id,
        partyType: 'COMPANY',
        partyName: 'Internal transfer out',
        amount: 150000,
        transactionDate: transfer.transferDate,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: transfer.referenceNo ?? undefined,
        description: transfer.notes ?? undefined,
        status: 'POSTED',
        createdById: adminId,
      },
      {
        companyId,
        projectId: demoProject.id,
        accountId: mainBankAccountId,
        type: 'TRANSFER_IN',
        sourceType: 'ACCOUNT_TRANSFER',
        sourceId: transfer.id,
        partyType: 'COMPANY',
        partyName: 'Internal transfer in',
        amount: 150000,
        transactionDate: transfer.transferDate,
        paymentMethod: 'BANK_TRANSFER',
        referenceNo: transfer.referenceNo ?? undefined,
        description: transfer.notes ?? undefined,
        status: 'POSTED',
        createdById: adminId,
      },
    ],
  });

  const demoCollectionAgg = await prisma.collection.aggregate({
    where: { phase: { projectId: demoProject.id }, status: { not: 'REVERSED' } },
    _sum: { amount: true },
  });
  const demoExpenseAgg = await prisma.expense.aggregate({
    where: {
      phase: { projectId: demoProject.id },
      status: { in: ['APPROVED', 'PAID', 'PARTIALLY_PAID'] },
      reversedAt: null,
    },
    _sum: { amount: true },
  });
  const demoDemandAgg = await prisma.demand.aggregate({
    where: { unit: { projectId: demoProject.id }, status: { not: 'CANCELLED' }, demandType: 'REGULAR' },
    _sum: { amount: true },
  });
  const demoPayableAgg = await prisma.supplierPayable.aggregate({
    where: { projectId: demoProject.id, reversedAt: null },
    _sum: {
      totalAmount: true,
      dueAmount: true,
      retentionAmount: true,
      retentionReleasedAmount: true,
      vatAmount: true,
      aitTdsAmount: true,
      otherDeductionAmount: true,
    },
  });
  const demoServiceAgg = await prisma.serviceChargeEntry.aggregate({
    where: { projectId: demoProject.id, reversedAt: null, status: { not: 'REVERSED' } },
    _sum: { serviceChargeAmount: true },
  });

  const finalReconciliation = await prisma.finalReconciliation.create({
    data: {
      id: 'demo-final-reconciliation-001',
      companyId,
      projectId: demoProject.id,
      type: 'DEFICIT_DEMAND',
      status: 'POSTED',
      totalDemand: Number(demoDemandAgg._sum.amount ?? 0),
      totalCollection: Number(demoCollectionAgg._sum.amount ?? 0),
      totalCost: Number(demoExpenseAgg._sum.amount ?? 0) + Number(demoPayableAgg._sum.totalAmount ?? 0),
      totalPayable: Number(demoPayableAgg._sum.dueAmount ?? 0),
      totalRetention: Math.max(
        Number(demoPayableAgg._sum.retentionAmount ?? 0) - Number(demoPayableAgg._sum.retentionReleasedAmount ?? 0),
        0,
      ),
      totalServiceCharge: Number(demoServiceAgg._sum.serviceChargeAmount ?? 0),
      totalTaxDeduction:
        Number(demoPayableAgg._sum.vatAmount ?? 0) +
        Number(demoPayableAgg._sum.aitTdsAmount ?? 0) +
        Number(demoPayableAgg._sum.otherDeductionAmount ?? 0),
      finalAmount: 120000,
      postedAt: new Date('2026-05-21T00:00:00.000Z'),
      postedById: adminId,
      notes: 'Seeded posted final reconciliation for report and notice QA.',
    },
  });

  const reconciliationLines = [
    { id: 'demo-rec-line-001', buyerId: 'buyer-demo-arif', unitId: 'demo-unit-101', ownershipShare: 100, amount: 50000 },
    { id: 'demo-rec-line-002', buyerId: 'buyer-demo-farzana', unitId: 'demo-unit-104', ownershipShare: 100, amount: 40000 },
    { id: 'demo-rec-line-003', buyerId: 'buyer-demo-sabiha', unitId: 'demo-unit-203', ownershipShare: 100, amount: 30000 },
  ] as const;

  for (const line of reconciliationLines) {
    await prisma.finalReconciliationLine.create({
      data: {
        id: line.id,
        reconciliationId: finalReconciliation.id,
        buyerId: line.buyerId,
        projectBuyerId: projectBuyerIds.get(line.buyerId),
        unitId: line.unitId,
        ownershipShare: line.ownershipShare,
        amount: line.amount,
        settlementStatus: 'NOT_APPLICABLE',
        notes: 'Seeded final reconciliation distribution line.',
      },
    });
  }

  const finalDemandSeeds = [
    { id: 'demo-final-demand-001', buyerId: 'buyer-demo-arif', unitId: 'demo-unit-101', amount: 50000 },
    { id: 'demo-final-demand-002', buyerId: 'buyer-demo-farzana', unitId: 'demo-unit-104', amount: 40000 },
    { id: 'demo-final-demand-003', buyerId: 'buyer-demo-sabiha', unitId: 'demo-unit-203', amount: 30000 },
  ] as const;

  for (const demand of finalDemandSeeds) {
    await prisma.demand.create({
      data: {
        id: demand.id,
        unitId: demand.unitId,
        buyerId: demand.buyerId,
        title: `Final Reconciliation - ${units.find((unit) => unit.id === demand.unitId)?.unitNo ?? demand.unitId}`,
        amount: demand.amount,
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
        demandType: 'FINAL_RECONCILIATION',
        finalReconciliationId: finalReconciliation.id,
        status: 'ISSUED',
        issuedAt: new Date('2026-05-21T00:00:00.000Z'),
        notes: 'System-generated from seeded final reconciliation.',
      },
    });
  }

  const allDemands = await prisma.demand.findMany({
    where: { unit: { projectId: demoProject.id }, status: { not: 'CANCELLED' } },
    include: { allocations: { select: { amount: true } } },
  });
  for (const demand of allDemands) {
    const paid = demand.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    let status: 'ISSUED' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' = 'ISSUED';
    if (paid >= Number(demand.amount)) {
      status = 'FULLY_PAID';
    } else if (paid > 0) {
      status = 'PARTIALLY_PAID';
    } else if (demand.dueDate && demand.dueDate < demoNow) {
      status = 'OVERDUE';
    }

    await prisma.demand.update({
      where: { id: demand.id },
      data: { status },
    });
  }

  const documents = [
    {
      id: 'demo-doc-supplier-rate',
      projectId: demoProject.id,
      projectSupplierId: 'demo-project-supplier-sk',
      title: 'New SK Traders rate sheet',
      category: 'RATE_SHEET',
      scope: 'PROJECT',
      status: 'VERIFIED',
      fileName: 'new-sk-traders-bill.txt',
      fileUrl: '/uploads/demo-docs/new-sk-traders-bill.txt',
      fileType: 'text/plain',
      description: 'Placeholder supplier rate-sheet document for demo QA.',
    },
    {
      id: 'demo-doc-payable-sk',
      projectId: demoProject.id,
      phaseId: 'demo-phase-basement',
      payableId: 'demo-payable-sk-001',
      projectSupplierId: 'demo-project-supplier-sk',
      title: 'New SK Traders bill copy',
      category: 'SUPPLIER_INVOICE',
      scope: 'SUPPLIER_BILL',
      status: 'VERIFIED',
      fileName: 'new-sk-traders-bill.txt',
      fileUrl: '/uploads/demo-docs/new-sk-traders-bill.txt',
      fileType: 'text/plain',
      description: 'Placeholder supplier invoice for the material bill.',
    },
    {
      id: 'demo-doc-expense-legal',
      projectId: demoProject.id,
      phaseId: 'demo-phase-land',
      expenseId: 'demo-exp-legal-reg',
      title: 'Land registration voucher',
      category: 'EXPENSE_VOUCHER',
      scope: 'EXPENSE',
      status: 'VERIFIED',
      fileName: 'site-expense-voucher.txt',
      fileUrl: '/uploads/demo-docs/site-expense-voucher.txt',
      fileType: 'text/plain',
      description: 'Placeholder voucher file for the legal registration expense.',
    },
    {
      id: 'demo-doc-sub-piling',
      projectId: demoProject.id,
      phaseId: 'demo-phase-piling',
      payableId: 'demo-payable-piling-01',
      projectSubcontractorId: 'demo-project-sub-piling',
      title: 'Piling measurement sheet',
      category: 'MEASUREMENT_SHEET',
      scope: 'SUBCONTRACTOR_BILL',
      status: 'VERIFIED',
      fileName: 'rahman-piling-measurement.txt',
      fileUrl: '/uploads/demo-docs/rahman-piling-measurement.txt',
      fileType: 'text/plain',
      description: 'Placeholder measurement-sheet document for piling bill QA.',
    },
    {
      id: 'demo-doc-final-reconciliation',
      projectId: demoProject.id,
      title: 'Final reconciliation basis note',
      category: 'AUDIT_NOTE',
      scope: 'AUDIT',
      status: 'VERIFIED',
      fileName: 'final-reconciliation-note.txt',
      fileUrl: '/uploads/demo-docs/final-reconciliation-note.txt',
      fileType: 'text/plain',
      description: 'Placeholder final-reconciliation note for report QA.',
    },
  ] as const;

  await prisma.document.createMany({
    data: documents.map((document) => ({
      ...document,
      uploadedById: adminId,
      uploadedAt: demoNow,
    })),
  });

  const auditEntries = [
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'CREATE',
      entityType: 'demand_batch',
      entityId: 'demo-batch-piling',
      newValues: { title: 'Piling Phase Bill', total: 1720000 },
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
    },
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'CREATE',
      entityType: 'collection',
      entityId: 'demo-col-001',
      newValues: { receiptNo: 'RCP-MDCP-0001', amount: collections[0].amount },
      createdAt: new Date('2026-02-18T00:00:00.000Z'),
    },
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'CREATE',
      entityType: 'supplier_payable',
      entityId: 'demo-payable-sk-001',
      newValues: { billNo: 'PB-NSK-001', amount: 541500 },
      createdAt: new Date('2026-03-05T00:00:00.000Z'),
    },
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'APPROVE',
      entityType: 'service_charge',
      entityId: 'demo-sc-ground',
      newValues: { serviceChargeAmount: 101250, includedInDemand: true },
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
    },
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'UPDATE',
      entityType: 'phase',
      entityId: 'demo-phase-brick-work',
      newValues: { auditLocked: true, reason: 'Demo audit lock to exercise report visibility.' },
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
    },
    {
      userId: adminId,
      projectId: demoProject.id,
      action: 'APPROVE',
      entityType: 'final_reconciliation',
      entityId: finalReconciliation.id,
      newValues: { finalAmount: 120000, type: 'DEFICIT_DEMAND' },
      createdAt: new Date('2026-05-21T00:00:00.000Z'),
    },
  ] as const;

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }

  console.log(`  OK  Demo project seeded: ${demoProject.name}`);
  console.log(`  OK  Demo phases: ${phases.length}`);
  console.log(`  OK  Demo units: ${units.length}, ownership rows: ${ownershipRows.length}`);
  console.log(`  OK  Demand batches: ${demandBatches.length}, collections: ${collections.length}`);
  console.log(`  OK  Payables: ${payableSeeds.length}, payments: ${paymentRows.length}`);
}
