export const GROUPS = {
  REF: 'Ref',
  NRI: 'NRI',
  CLOSING_RM: 'Closing RM',
  SOURCING_CP_RM: 'Sourcing CP RM',
  CP_RM_AOP: 'CP RM - AOP',
  LOYALTY_RM: 'Loyalty RM',
  GCC: "GCC",
} as const;

export const INDIAN_GROUPS = new Set<string>([
  GROUPS.CLOSING_RM,
  GROUPS.SOURCING_CP_RM,
  GROUPS.CP_RM_AOP,
]);

// Case-insensitive check helper
export const isIndianGroup = (
  groupId?: string,
  groups?: {id: number; name: string;}[]
): boolean => {
  if (!groupId || !Array.isArray(groups)) return false;

  const group = groups.find(
    (g) => String(g?.id) === String(groupId)
  );

  if (!group?.name) return false;

  return INDIAN_GROUPS?.has(group?.name);
};