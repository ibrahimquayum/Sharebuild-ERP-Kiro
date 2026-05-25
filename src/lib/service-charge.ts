type NumericLike = number | string | null | undefined | { toString(): string };

export function numberValue(value: NumericLike) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseServiceChargePercentSetting(value: string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getEffectiveServiceChargePercent({
  companyDefaultPct,
  projectDefaultPct,
  phaseOverridePct,
}: {
  companyDefaultPct?: NumericLike;
  projectDefaultPct?: NumericLike;
  phaseOverridePct?: NumericLike;
}) {
  if (phaseOverridePct !== null && phaseOverridePct !== undefined) {
    return numberValue(phaseOverridePct);
  }
  if (projectDefaultPct !== null && projectDefaultPct !== undefined) {
    return numberValue(projectDefaultPct);
  }
  if (companyDefaultPct !== null && companyDefaultPct !== undefined) {
    return numberValue(companyDefaultPct);
  }
  return 0;
}
