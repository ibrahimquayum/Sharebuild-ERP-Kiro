import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as BDT currency — e.g. ৳ 1,23,45,678 */
export function formatBDT(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '৳ 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '৳ 0';
  return '৳ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Format a number as compact BDT — e.g. ৳ 1.35 Cr */
export function formatBDTCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '৳ 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '৳ 0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10_000_000) return `${sign}৳ ${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}৳ ${(abs / 100_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sign}৳ ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}৳ ${abs}`;
}

/** Phase type label */
export function phaseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PILING: 'Piling',
    BASEMENT: 'Basement',
    SLAB: 'Floor Slab',
    HALF_SLAB: 'Half Slab',
    GATHUNI: 'Gathuni',
    SANITARY: 'Sanitary',
    FINISHING: 'Finishing',
    CUSTOM: 'Custom',
  };
  return map[type] ?? type;
}

/** Phase status label + color */
export function phaseStatusMeta(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
    ACTIVE: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700' },
    INCLUDED_IN_SUMMARY: { label: 'In Summary', color: 'bg-emerald-100 text-emerald-700' },
    EXCLUDED_FROM_SUMMARY: { label: 'Excluded', color: 'bg-yellow-100 text-yellow-700' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
    DUPLICATE: { label: 'Duplicate', color: 'bg-orange-100 text-orange-600' },
  };
  return map[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
}

/** Expense category label */
export function expenseCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    ROD_STEEL: 'Rod / Steel',
    CEMENT: 'Cement',
    STONE_AGGREGATE: 'Stone / Aggregate',
    SAND: 'Sand',
    BRICK: 'Brick',
    READYMIX_CONCRETE: 'Readymix Concrete',
    TIMBER_SHUTTERING: 'Timber / Shuttering',
    PAINT: 'Paint',
    TILES: 'Tiles',
    SANITARY_FITTINGS: 'Sanitary Fittings',
    ELECTRICAL_MATERIAL: 'Electrical Material',
    HARDWARE: 'Hardware',
    CHEMICAL: 'Chemical',
    LABOUR_BILL: 'Labour Bill',
    CONTRACTOR_BILL: 'Contractor Bill',
    SECURITY_SALARY: 'Security Salary',
    SITE_STAFF_SALARY: 'Site Staff Salary',
    WATER_BILL: 'Water Bill',
    ELECTRICITY_BILL: 'Electricity Bill',
    SITE_FOOD_HOSPITALITY: 'Site Food / Hospitality',
    TRANSPORT: 'Transport',
    EQUIPMENT_HIRE: 'Equipment Hire',
    SURVEY_DRAWING: 'Survey / Drawing',
    LEGAL_REGISTRATION: 'Legal / Registration',
    MUNICIPALITY_FEE: 'Municipality Fee',
    BANK_CHARGE: 'Bank Charge',
    SERVICE_CHARGE: 'Service Charge',
    OTHER: 'Other',
  };
  return map[cat] ?? cat;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function balanceColor(amount: number): string {
  if (amount > 0) return 'text-green-600';
  if (amount < 0) return 'text-red-600';
  return 'text-gray-500';
}
