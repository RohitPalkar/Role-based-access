/**
 * Derives the canonical “transaction id” string stored on `voucher_payments.voucher_transaction_id`.
 *
 * This mirrors how exports and finance UIs resolve **Transaction ID** (see `mapTxnRow` in
 * `voucherEcelBuilder.helper.ts`): bank/UPI/NEFT flows typically use `transactionNumber`,
 * cheque uses `chequeNumber`, gateway payments use `gatewayPaymentId` (and Easebuzz may
 * expose `easepayid` before normalization).
 *
 * @param paymentDetails - JSON `payment_details` on `VoucherPayment` (or equivalent plain object)
 * @returns Trimmed non-empty string, or `null` when nothing usable is present
 */
export function deriveVoucherTransactionIdFromPaymentDetails(
  paymentDetails: Record<string, unknown> | null | undefined,
): string | null {
  if (!paymentDetails || typeof paymentDetails !== 'object') {
    return null;
  }

  /** First matching key with a non-empty string value wins (same priority as Excel export). */
  const keys = [
    'transactionNumber',
    'chequeNumber',
    'gatewayPaymentId',
    'transactionId',
    'easepayid',
  ] as const;

  for (const key of keys) {
    const raw = paymentDetails[key];
    if (raw == null) continue;
    if (
      typeof raw !== 'string' &&
      typeof raw !== 'number' &&
      typeof raw !== 'boolean' &&
      typeof raw !== 'bigint'
    ) {
      continue;
    }
    const s = String(raw).trim();
    if (s !== '') return s;
  }

  return null;
}
