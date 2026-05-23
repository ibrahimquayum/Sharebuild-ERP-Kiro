import { FINAL_EXPENSE_STATUSES } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import type {
  CashBankPartyType,
  CashBankSourceType,
  CashBankTransactionStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
} from '@prisma/client';

type TxClient = PrismaClient | Prisma.TransactionClient;

function numberValue(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function transactionDirection(type: string) {
  if (type === 'INFLOW' || type === 'TRANSFER_IN') return 'inflow';
  if (type === 'OUTFLOW' || type === 'TRANSFER_OUT') return 'outflow';
  return 'adjustment';
}

function pendingChequeStatus(paymentMethod: PaymentMethod) {
  return paymentMethod === 'CHEQUE' ? 'PENDING' : undefined;
}

function postedTransactionStatus(paymentMethod: PaymentMethod): CashBankTransactionStatus {
  return paymentMethod === 'CHEQUE' ? 'DRAFT' : 'POSTED';
}

export async function getActiveCompanyAccounts(companyId: string) {
  return prisma.cashBankAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function getCompanyDefaultAccount(companyId: string) {
  return prisma.cashBankAccount.findFirst({
    where: { companyId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function assertAccountBelongsToCompany(accountId: string, companyId: string) {
  const account = await prisma.cashBankAccount.findFirst({
    where: { id: accountId, companyId, isActive: true },
  });
  if (!account) throw new Error('Selected cash/bank account was not found in this company.');
  return account;
}

export async function getCompanyAccountBalances(companyId: string) {
  const accounts = await prisma.cashBankAccount.findMany({
    where: { companyId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: {
      transactions: {
        where: { status: { in: ['POSTED'] } },
        select: { amount: true, type: true },
      },
      cheques: {
        where: { status: 'PENDING' },
        select: { id: true, amount: true, chequeType: true },
      },
    },
  });

  return accounts.map((account) => {
    const movement = account.transactions.reduce(
      (sum, transaction) => {
        const amount = numberValue(transaction.amount);
        const direction = transactionDirection(transaction.type);
        if (direction === 'inflow') sum.inflow += amount;
        if (direction === 'outflow') sum.outflow += amount;
        return sum;
      },
      { inflow: 0, outflow: 0 },
    );
    const balance = numberValue(account.openingBalance) + movement.inflow - movement.outflow;
    return {
      ...account,
      summary: {
        inflow: movement.inflow,
        outflow: movement.outflow,
        balance,
        pendingChequeCount: account.cheques.length,
      },
    };
  });
}

export async function getProjectCashBankSummary(projectId: string) {
  const [project, transactions, cheques] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, companyId: true, name: true },
    }),
    prisma.cashBankTransaction.findMany({
      where: { projectId },
      include: { account: true },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.chequeLog.findMany({
      where: { projectId },
      orderBy: [{ chequeDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  if (!project) return null;

  const postedTransactions = transactions.filter((transaction) => transaction.status === 'POSTED');
  const summary = postedTransactions.reduce(
    (sum, transaction) => {
      const amount = numberValue(transaction.amount);
      const direction = transactionDirection(transaction.type);
      if (direction === 'inflow') sum.inflow += amount;
      if (direction === 'outflow') sum.outflow += amount;
      return sum;
    },
    { inflow: 0, outflow: 0 },
  );

  const accountMap = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      type: string;
      openingBalance: number;
      inflow: number;
      outflow: number;
      balance: number;
    }
  >();

  for (const transaction of postedTransactions) {
    const current = accountMap.get(transaction.accountId) ?? {
      accountId: transaction.accountId,
      accountName: transaction.account.name,
      type: transaction.account.type,
      openingBalance: numberValue(transaction.account.openingBalance),
      inflow: 0,
      outflow: 0,
      balance: 0,
    };
    const amount = numberValue(transaction.amount);
    const direction = transactionDirection(transaction.type);
    if (direction === 'inflow') current.inflow += amount;
    if (direction === 'outflow') current.outflow += amount;
    current.balance = current.openingBalance + current.inflow - current.outflow;
    accountMap.set(transaction.accountId, current);
  }

  const pendingReceivedCheques = cheques.filter((cheque) => cheque.status === 'PENDING' && cheque.chequeType === 'RECEIVED');
  const pendingIssuedCheques = cheques.filter((cheque) => cheque.status === 'PENDING' && cheque.chequeType === 'ISSUED');
  const bouncedCheques = cheques.filter((cheque) => cheque.status === 'BOUNCED');
  const clearedCheques = cheques.filter((cheque) => cheque.status === 'CLEARED');

  return {
    project,
    transactions,
    cheques,
    accountsUsed: Array.from(accountMap.values()).sort((a, b) => a.accountName.localeCompare(b.accountName)),
    totals: {
      inflow: summary.inflow,
      outflow: summary.outflow,
      netMovement: summary.inflow - summary.outflow,
      accountBalance: Array.from(accountMap.values()).reduce((sum, account) => sum + account.balance, 0),
      pendingReceivedCheques: pendingReceivedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      pendingIssuedCheques: pendingIssuedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      bouncedCheques: bouncedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      clearedCheques: clearedCheques.reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
    },
  };
}

export async function getAccountTransactions(accountId: string) {
  const account = await prisma.cashBankAccount.findUnique({
    where: { id: accountId },
    include: {
      transactions: {
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      },
      cheques: {
        orderBy: [{ chequeDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });
  if (!account) return null;

  const posted = account.transactions.filter((transaction) => transaction.status === 'POSTED');
  const inflow = posted
    .filter((transaction) => ['INFLOW', 'TRANSFER_IN'].includes(transaction.type))
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const outflow = posted
    .filter((transaction) => ['OUTFLOW', 'TRANSFER_OUT'].includes(transaction.type))
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  return {
    ...account,
    summary: {
      inflow,
      outflow,
      balance: numberValue(account.openingBalance) + inflow - outflow,
    },
  };
}

async function createChequeLog(
  tx: TxClient,
  input: {
    companyId: string;
    projectId?: string | null;
    accountId?: string | null;
    chequeType: 'ISSUED' | 'RECEIVED';
    chequeNo: string;
    bankName: string;
    branchName?: string | null;
    chequeDate: Date;
    maturityDate?: Date | null;
    amount: number;
    partyType: CashBankPartyType;
    partyId?: string | null;
    partyName?: string | null;
    sourceType: CashBankSourceType;
    sourceId: string;
    notes?: string | null;
  },
) {
  const existing = await tx.chequeLog.findFirst({
    where: { sourceType: input.sourceType, sourceId: input.sourceId },
    select: { id: true },
  });
  if (existing) return existing;

  return tx.chequeLog.create({
    data: {
      companyId: input.companyId,
      projectId: input.projectId ?? undefined,
      accountId: input.accountId ?? undefined,
      chequeType: input.chequeType,
      chequeNo: input.chequeNo,
      bankName: input.bankName,
      branchName: input.branchName ?? undefined,
      chequeDate: input.chequeDate,
      maturityDate: input.maturityDate ?? undefined,
      amount: input.amount,
      partyType: input.partyType,
      partyId: input.partyId ?? undefined,
      partyName: input.partyName ?? undefined,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: 'PENDING',
      notes: input.notes ?? undefined,
    },
  });
}

async function createCashBankTransaction(
  tx: TxClient,
  input: {
    companyId: string;
    projectId?: string | null;
    accountId: string;
    type: 'INFLOW' | 'OUTFLOW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
    sourceType: CashBankSourceType;
    sourceId: string;
    partyType?: CashBankPartyType | null;
    partyId?: string | null;
    partyName?: string | null;
    amount: number;
    transactionDate: Date;
    paymentMethod: PaymentMethod;
    referenceNo?: string | null;
    description?: string | null;
    createdById?: string | null;
    status?: CashBankTransactionStatus;
  },
) {
  const existing = await tx.cashBankTransaction.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: { not: 'REVERSED' },
    },
  });
  if (existing) return existing;

  return tx.cashBankTransaction.create({
    data: {
      companyId: input.companyId,
      projectId: input.projectId ?? undefined,
      accountId: input.accountId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      partyType: input.partyType ?? undefined,
      partyId: input.partyId ?? undefined,
      partyName: input.partyName ?? undefined,
      amount: input.amount,
      transactionDate: input.transactionDate,
      paymentMethod: input.paymentMethod,
      referenceNo: input.referenceNo ?? undefined,
      description: input.description ?? undefined,
      status: input.status ?? postedTransactionStatus(input.paymentMethod),
      createdById: input.createdById ?? undefined,
    },
  });
}

export async function createCashBankTransactionFromCollection(
  tx: TxClient,
  collectionId: string,
  createdById?: string | null,
) {
  const collection = await tx.collection.findUnique({
    where: { id: collectionId },
    include: {
      phase: { include: { project: { select: { companyId: true } } } },
      buyer: { select: { id: true, name: true } },
    },
  });
  if (!collection || !collection.accountId || collection.status === 'REVERSED') return null;

  const transaction = await createCashBankTransaction(tx, {
    companyId: collection.phase.project.companyId,
    projectId: collection.phase.projectId,
    accountId: collection.accountId,
    type: 'INFLOW',
    sourceType: 'BUYER_COLLECTION',
    sourceId: collection.id,
    partyType: 'BUYER',
    partyId: collection.buyerId,
    partyName: collection.buyer.name,
    amount: numberValue(collection.amount),
    transactionDate: collection.receivedDate,
    paymentMethod: collection.paymentMethod,
    referenceNo: collection.reference ?? collection.receiptNo,
    description: collection.notes ?? 'Buyer collection',
    createdById,
  });

  if (collection.paymentMethod === 'CHEQUE' && collection.chequeNo && collection.bankName && collection.chequeDate) {
    await createChequeLog(tx, {
      companyId: collection.phase.project.companyId,
      projectId: collection.phase.projectId,
      accountId: collection.accountId,
      chequeType: 'RECEIVED',
      chequeNo: collection.chequeNo,
      bankName: collection.bankName,
      branchName: collection.chequeBranchName,
      chequeDate: collection.chequeDate,
      maturityDate: collection.chequeMaturityDate,
      amount: numberValue(collection.amount),
      partyType: 'BUYER',
      partyId: collection.buyerId,
      partyName: collection.buyer.name,
      sourceType: 'BUYER_COLLECTION',
      sourceId: collection.id,
      notes: collection.notes,
    });
  }

  return transaction;
}

export async function createCashBankTransactionFromExpense(
  tx: TxClient,
  expenseId: string,
  createdById?: string | null,
) {
  const expense = await tx.expense.findUnique({
    where: { id: expenseId },
    include: {
      phase: { include: { project: { select: { companyId: true } } } },
      supplier: { select: { id: true, name: true, supplierType: true } },
    },
  });
  if (!expense || !expense.accountId || expense.reversedAt || !FINAL_EXPENSE_STATUSES.includes(expense.status as (typeof FINAL_EXPENSE_STATUSES)[number])) {
    return null;
  }

  const partyType: CashBankPartyType | undefined =
    expense.supplierMode === 'LOCAL_SHOP'
      ? 'LOCAL_SHOP'
      : expense.supplierId
        ? expense.supplier?.supplierType === 'LABOUR_CONTRACTOR'
          ? 'SUBCONTRACTOR'
          : 'SUPPLIER'
        : undefined;

  const partyId =
    expense.supplierMode === 'LOCAL_SHOP'
      ? undefined
      : expense.supplierId ?? undefined;

  const partyName =
    expense.supplierMode === 'LOCAL_SHOP'
      ? expense.localShopName ?? expense.description
      : expense.supplier?.name ?? undefined;

  const transaction = await createCashBankTransaction(tx, {
    companyId: expense.phase.project.companyId,
    projectId: expense.phase.projectId,
    accountId: expense.accountId,
    type: 'OUTFLOW',
    sourceType: 'DIRECT_EXPENSE',
    sourceId: expense.id,
    partyType,
    partyId,
    partyName,
    amount: numberValue(expense.amount),
    transactionDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod,
    referenceNo: expense.referenceNo ?? expense.billNo,
    description: expense.description,
    createdById,
  });

  if (expense.paymentMethod === 'CHEQUE' && expense.chequeNo && expense.chequeBankName && expense.chequeDate) {
    await createChequeLog(tx, {
      companyId: expense.phase.project.companyId,
      projectId: expense.phase.projectId,
      accountId: expense.accountId,
      chequeType: 'ISSUED',
      chequeNo: expense.chequeNo,
      bankName: expense.chequeBankName,
      branchName: expense.chequeBranchName,
      chequeDate: expense.chequeDate,
      maturityDate: expense.chequeMaturityDate,
      amount: numberValue(expense.amount),
      partyType: partyType ?? 'OTHER',
      partyId,
      partyName,
      sourceType: 'DIRECT_EXPENSE',
      sourceId: expense.id,
      notes: expense.notes,
    });
  }

  return transaction;
}

export async function createCashBankTransactionFromSupplierPayment(
  tx: TxClient,
  paymentId: string,
  sourceType: 'SUPPLIER_PAYMENT' | 'SUBCONTRACTOR_PAYMENT',
  createdById?: string | null,
) {
  const payment = await tx.supplierPayment.findUnique({
    where: { id: paymentId },
    include: {
      payable: {
        include: {
          project: { select: { companyId: true } },
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!payment || !payment.accountId || payment.reversedAt || payment.status === 'REVERSED') return null;

  const partyType = sourceType === 'SUBCONTRACTOR_PAYMENT' ? 'SUBCONTRACTOR' : 'SUPPLIER';
  const transaction = await createCashBankTransaction(tx, {
    companyId: payment.payable.project.companyId,
    projectId: payment.payable.projectId,
    accountId: payment.accountId,
    type: 'OUTFLOW',
    sourceType,
    sourceId: payment.id,
    partyType,
    partyId: payment.payable.supplierId,
    partyName: payment.payable.supplier.name,
    amount: numberValue(payment.amount),
    transactionDate: payment.paidAt,
    paymentMethod: payment.paymentMethod,
    referenceNo: payment.reference ?? payment.chequeNo,
    description: payment.notes ?? `${partyType === 'SUPPLIER' ? 'Supplier' : 'Subcontractor'} payment`,
    createdById,
  });

  if (payment.paymentMethod === 'CHEQUE' && payment.chequeNo && payment.bankName && payment.chequeDate) {
    await createChequeLog(tx, {
      companyId: payment.payable.project.companyId,
      projectId: payment.payable.projectId,
      accountId: payment.accountId,
      chequeType: 'ISSUED',
      chequeNo: payment.chequeNo,
      bankName: payment.bankName,
      branchName: payment.chequeBranchName,
      chequeDate: payment.chequeDate,
      maturityDate: payment.chequeMaturityDate,
      amount: numberValue(payment.amount),
      partyType,
      partyId: payment.payable.supplierId,
      partyName: payment.payable.supplier.name,
      sourceType,
      sourceId: payment.id,
      notes: payment.notes,
    });
  }

  return transaction;
}

export async function createAccountTransferEntries(
  tx: TxClient,
  transferId: string,
  createdById?: string | null,
) {
  const transfer = await tx.accountTransfer.findUnique({
    where: { id: transferId },
    include: {
      company: { select: { id: true } },
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
    },
  });
  if (!transfer || transfer.status !== 'POSTED') return null;

  const outTransaction = await createCashBankTransaction(tx, {
    companyId: transfer.companyId,
    accountId: transfer.fromAccountId,
    type: 'TRANSFER_OUT',
    sourceType: 'ACCOUNT_TRANSFER',
    sourceId: `${transfer.id}:OUT`,
    partyType: 'COMPANY',
    partyName: `Transfer to ${transfer.toAccount.name}`,
    amount: numberValue(transfer.amount),
    transactionDate: transfer.transferDate,
    paymentMethod: 'OTHER',
    referenceNo: transfer.referenceNo,
    description: transfer.notes ?? 'Account transfer out',
    createdById,
    status: 'POSTED',
  });

  const inTransaction = await createCashBankTransaction(tx, {
    companyId: transfer.companyId,
    accountId: transfer.toAccountId,
    type: 'TRANSFER_IN',
    sourceType: 'ACCOUNT_TRANSFER',
    sourceId: `${transfer.id}:IN`,
    partyType: 'COMPANY',
    partyName: `Transfer from ${transfer.fromAccount.name}`,
    amount: numberValue(transfer.amount),
    transactionDate: transfer.transferDate,
    paymentMethod: 'OTHER',
    referenceNo: transfer.referenceNo,
    description: transfer.notes ?? 'Account transfer in',
    createdById,
    status: 'POSTED',
  });

  return { outTransaction, inTransaction };
}

export async function reverseCashBankTransaction(
  tx: TxClient,
  input: {
    sourceType: CashBankSourceType;
    sourceId: string;
    userId?: string | null;
    reason: string;
  },
) {
  await tx.cashBankTransaction.updateMany({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: { in: ['POSTED', 'DRAFT'] },
    },
    data: {
      status: 'REVERSED',
      reversedAt: new Date(),
      reversedById: input.userId ?? undefined,
      reversalReason: input.reason,
    },
  });

  await tx.chequeLog.updateMany({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: { in: ['PENDING', 'CLEARED'] },
    },
    data: {
      status: 'CANCELLED',
      cancelledDate: new Date(),
      notes: input.reason,
    },
  });
}

export async function getChequeSummary(companyId: string, projectId?: string) {
  const cheques = await prisma.chequeLog.findMany({
    where: { companyId, ...(projectId ? { projectId } : {}) },
    include: { account: true },
    orderBy: [{ chequeDate: 'desc' }, { createdAt: 'desc' }],
  });

  return {
    cheques,
    totals: {
      pending: cheques.filter((cheque) => cheque.status === 'PENDING').reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      cleared: cheques.filter((cheque) => cheque.status === 'CLEARED').reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      bounced: cheques.filter((cheque) => cheque.status === 'BOUNCED').reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
      cancelled: cheques.filter((cheque) => cheque.status === 'CANCELLED').reduce((sum, cheque) => sum + numberValue(cheque.amount), 0),
    },
  };
}

export function cashBankTransactionStatusLabel(status: CashBankTransactionStatus) {
  return status.replaceAll('_', ' ');
}
