export function normalizeMobileForLookup(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  const digits = value.trim().replace(/\D/g, '');
  return digits || null;
}
