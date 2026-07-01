/** Narrow `unknown` API fields to a string-keyed object, or `null`. */
export const toPlainRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Blocking row `status: "Approved"` — unit mapped; timer/payment window UI is not shown. */
export const isBlockingApprovedStatus = (blocking: Record<string, unknown> | null): boolean => {
  if (!blocking) {
    return false;
  }
  const raw = blocking.status;
  if (typeof raw !== 'string') {
    return false;
  }
  return raw.trim().toLowerCase() === 'approved';
};

export const parsePositiveMinutes = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (value != null && Number.isFinite(Number(value)) && Number(value) > 0) {
    return Number(value);
  }
  return null;
};

/**
 * When a unit is blocked, the payment countdown ends at `blocking.unitBlockExpiry` if present.
 * Otherwise: `blocking.createdAt` + `unitBlockDuration` from the **unit root** (same field as before block).
 * `timerExtension` is only for the optional client extension after this window — it is not added here.
 */
export function getBlockPaymentWindowEndMs(
  inventoryUnit: Record<string, unknown>
): number | null {
  const blocking = toPlainRecord(inventoryUnit.blocking);
  if (!blocking) {
    return null;
  }

  const unitBlockExpiryIso =
    (typeof blocking.unitBlockExpiry === 'string' && blocking.unitBlockExpiry.trim()) ||
    (typeof inventoryUnit.unitBlockExpiry === 'string' && inventoryUnit.unitBlockExpiry.trim()) ||
    '';
  if (unitBlockExpiryIso) {
    const expiryTimeMs = Date.parse(unitBlockExpiryIso);
    if (Number.isFinite(expiryTimeMs)) {
      return expiryTimeMs;
    }
  }

  const blockCreatedAtIso =
    typeof blocking.createdAt === 'string' ? blocking.createdAt.trim() : '';
  if (!blockCreatedAtIso) {
    return null;
  }
  const blockCreatedAtMs = Date.parse(blockCreatedAtIso);
  if (!Number.isFinite(blockCreatedAtMs)) {
    return null;
  }

  const unitBlockDurationMinutes =
    parsePositiveMinutes(inventoryUnit.unitBlockDuration) ?? 10;
  return blockCreatedAtMs + Math.max(1, unitBlockDurationMinutes) * 60 * 1000;
}

/** Post–first-window grace period length; always from unit root, not from `blocking`. */
export function getTimerExtensionMinutesFromUnit(
  inventoryUnit: Record<string, unknown> | undefined
): number | null {
  return inventoryUnit ? parsePositiveMinutes(inventoryUnit.timerExtension) : null;
}
