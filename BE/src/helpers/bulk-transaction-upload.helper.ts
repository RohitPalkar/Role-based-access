/**
 * PE-483 finance bulk transaction upload — Excel parsing and **field-level** validation only.
 *
 * Parses the exported **Transactions** worksheet (same headers as `TXN_SHEET_COLS` in
 * `voucherEcelBuilder.helper.ts`). DB lookups, eligibility (e.g. Pending Reco), and applying
 * updates live in `EoiManagementService` via `updateTransaction`.
 */
import * as ExcelJS from 'exceljs';
import { isValid, parse } from 'date-fns';
import { Readable } from 'node:stream';
import { BULK_TXN_WORKSHEET_NAME } from 'src/config/constants';
import { PaymentTxStatusEnum } from 'src/enums/payment-status.enum';
import { TXN_SHEET_COLS } from 'src/helpers/voucherEcelBuilder.helper';
import { safeString } from './stringHelper';

/** One populated data row from the sheet; `excelRow` is the 1-based Excel row index (for error reports). */
export type BulkExcelRow = {
  excelRow: number;
  paymentReferenceId: string;
  txnId: string;
  txnAmountRaw: string;
  realisationDateRaw: string;
  txnReceiptNo: string;
  txnComments: string;
  statusRaw: string;
};

/** Result of validating Excel cells only — no voucher/payment DB access. */
export type BulkFieldValidationResult =
  | {
      ok: true;
      dto: {
        status: PaymentTxStatusEnum;
        realisationDate?: string;
        comments?: string;
        receiptNo?: string;
      };
    }
  | { ok: 'skip' }
  | { ok: false; reasons: string[] };

/**
 * Reads row 1 of the sheet and builds **column index → internal field key** (e.g. `paymentReferenceId`).
 * Only columns whose header text matches `TXN_SHEET_COLS` are included; `Map#size` is how many Excel columns matched (≤ `TXN_SHEET_COLS.length`).
 * Matching is case-insensitive so order can differ slightly from export.
 */
function mapHeaderRowToKeyByColIndex(
  headerRow: ExcelJS.Row,
): Map<number, string> {
  const colIndexToKey = new Map<number, string>();
  const headerToKey = new Map(
    TXN_SHEET_COLS.map((c) => [c.header.trim().toLowerCase(), c.key]),
  );
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = normalizeCellToHeaderText(cell.value);
    if (!text) return;
    const key = headerToKey.get(text.toLowerCase());
    if (key) colIndexToKey.set(colNumber, key);
  });
  return colIndexToKey;
}

/** Normalize a header cell for lookup (strings, numbers, dates, rich text, hyperlinks). */
function normalizeCellToHeaderText(value: ExcelJS.CellValue): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rt = value.richText;
    return (
      rt
        ?.map((t) => t.text)
        .join('')
        .trim() ?? ''
    );
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String(value.text ?? '').trim();
  }
  return String(value).trim();
}

/**
 * Turn an Excel body cell into a string for validation.
 * Dates become **YYYY-MM-DD** (local calendar date) so they align with `parseBulkRealisationDateToIso`.
 */
export function normalizeBulkCellValue(value: ExcelJS.CellValue): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  // Formula: use computed result if present.
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return normalizeBulkCellValue(
      (value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue,
    );
  }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rt = value.richText;
    return (
      rt
        ?.map((t) => t.text)
        .join('')
        .trim() ?? ''
    );
  }
  return String(value).trim();
}

/** Skip rows where every mapped column is blank after normalization. */
function isRowEffectivelyEmpty(values: Record<string, string>): boolean {
  const s = Object.values(values).join('').trim();
  return s.length === 0;
}

/**
 * Load `.xlsx` from buffer, find **Transactions**, map row-1 headers to field keys, return one `BulkExcelRow` per non-empty data row.
 * Every column in `TXN_SHEET_COLS` (13 headers) must be recognized — same contract as finance export.
 */
export async function parseBulkTransactionsWorkbook(
  buffer: Buffer,
): Promise<{ ok: true; rows: BulkExcelRow[] } | { ok: false; error: string }> {
  try {
    const stream = Readable.from(buffer);
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      sharedStrings: 'cache',
      hyperlinks: 'cache',
      worksheets: 'emit',
      styles: 'cache',
    });

    let worksheetFound = false;
    const rows: BulkExcelRow[] = [];

    for await (const worksheetReader of workbookReader) {
      const sheetName: string = (worksheetReader as any).name;
      if (sheetName !== BULK_TXN_WORKSHEET_NAME) continue;
      worksheetFound = true;

      let colIndexToKey: Map<number, string> | null = null;

      for await (const row of worksheetReader) {
        if (row.number === 1) {
          colIndexToKey = mapHeaderRowToKeyByColIndex(row);
          const mappedKeys = new Set(colIndexToKey.values());
          const missingCols = TXN_SHEET_COLS.filter(
            (c) => !mappedKeys.has(c.key),
          );
          if (missingCols.length > 0) {
            return {
              ok: false,
              error: `Could not map column headers — file must match the exported Transactions template (unmapped: ${missingCols.map((c) => c.header).join(', ')})`,
            };
          }
          continue;
        }

        if (!colIndexToKey) continue;

        const cells: Record<string, string> = {};
        colIndexToKey.forEach((key, colIndex) => {
          cells[key] = normalizeBulkCellValue(row.getCell(colIndex).value);
        });

        if (isRowEffectivelyEmpty(cells)) continue;

        rows.push({
          excelRow: row.number,
          paymentReferenceId: safeString(cells.paymentReferenceId, ''),
          txnId: safeString(cells.txnId, ''),
          txnAmountRaw: safeString(cells.txnAmount, ''),
          realisationDateRaw: safeString(cells.realisationDate, ''),
          txnReceiptNo: safeString(cells.txnReceiptNo, ''),
          txnComments: safeString(cells.txnComments, ''),
          statusRaw: safeString(cells.status, ''),
        });
      }
      break;
    }

    if (!worksheetFound) {
      return {
        ok: false,
        error: `Worksheet "${BULK_TXN_WORKSHEET_NAME}" not found`,
      };
    }

    return { ok: true, rows };
  } catch {
    return { ok: false, error: 'Invalid or corrupted Excel file' };
  }
}

/** Precomputed map: normalized status label → `PaymentTxStatusEnum` (case/spacing insensitive). */
const NORMALIZED_STATUS_TO_ENUM = (() => {
  const m = new Map<string, PaymentTxStatusEnum>();
  for (const v of Object.values(PaymentTxStatusEnum)) {
    m.set(v.replaceAll(/\s+/g, ' ').trim().toLowerCase(), v);
  }
  return m;
})();

/** Parse the Status column; returns `null` if empty or not a known enum label. */
export function parseExcelPaymentStatus(
  raw: string,
): PaymentTxStatusEnum | null {
  const key = raw.replaceAll(/\s+/g, ' ').trim().toLowerCase();
  if (!key) return null;
  return NORMALIZED_STATUS_TO_ENUM.get(key) ?? null;
}

/**
 * Realization date from Excel: **DD-MM-YYYY** (PE-483) or **YYYY-MM-DD** (export / date cells).
 * Output is ISO 8601 for `UpdateTransactionDto.realisationDate` (`@IsDateString()`).
 */
export function parseBulkRealisationDateToIso(raw: string): string | null {
  const s = raw.replaceAll(/\s+/g, ' ').trim();
  if (!s) return null;

  let d: Date | null = null;
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const parsed = parse(s, 'dd-MM-yyyy', new Date());
    d = isValid(parsed) ? parsed : null;
  } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parsed = parse(s, 'yyyy-MM-dd', new Date());
    d = isValid(parsed) ? parsed : null;
  }

  if (!d) return null;
  return d.toISOString();
}

/** @returns Error message if status is not an allowed bulk outcome; otherwise `null`. */
function bulkStatusOutcomeError(status: PaymentTxStatusEnum): string | null {
  const allowed =
    status === PaymentTxStatusEnum.VERIFIED ||
    status === PaymentTxStatusEnum.REJECTED ||
    status === PaymentTxStatusEnum.REVERSED;
  if (!allowed) {
    return `Bulk upload only supports ${PaymentTxStatusEnum.VERIFIED}, ${PaymentTxStatusEnum.REJECTED}, or ${PaymentTxStatusEnum.REVERSED} (got "${status}")`;
  }
  return null;
}

function collectBulkOutcomeFieldReasons(
  status: PaymentTxStatusEnum,
  realisationIso: string | null,
  receiptNo: string,
  comments: string,
): string[] {
  const out: string[] = [];
  if (status === PaymentTxStatusEnum.VERIFIED) {
    if (!realisationIso) {
      out.push(
        'Realization date is required for Realized status (use DD-MM-YYYY or YYYY-MM-DD)',
      );
    }
    if (!receiptNo) {
      out.push('Receipt No is required for Realized status');
    }
  }
  if (
    status === PaymentTxStatusEnum.REJECTED ||
    status === PaymentTxStatusEnum.REVERSED
  ) {
    if (!comments) {
      out.push(`Comments are required for status "${status}"`);
    }
  }
  if (comments.length > 500) {
    out.push('Comments cannot exceed 500 characters');
  }
  if (receiptNo.length > 50) {
    out.push('Receipt number cannot exceed 50 characters');
  }
  return out;
}

/**
 * Validate mandatory combinations for finance bulk (story rules). Does **not** hit the database.
 * - **Realized**: realization date + receipt no.
 * - **Rejected** / **Not Realized**: comments.
 * Bulk may only set **Realized**, **Rejected**, or **Not Realized** (not Refunded / remain Pending Reco).
 */
export function validateBulkRowFields(
  row: BulkExcelRow,
): BulkFieldValidationResult {
  const reasons: string[] = [];

  if (!row.paymentReferenceId?.trim()) {
    reasons.push('Payment Reference ID is required');
  }
  if (!row.txnId?.trim() || row.txnId.trim().toUpperCase() === 'N/A') {
    reasons.push('Transaction ID is required');
  }

  const status = parseExcelPaymentStatus(row.statusRaw);
  if (!status) {
    reasons.push(
      `Invalid or empty Status (use values such as ${PaymentTxStatusEnum.VERIFIED}, ${PaymentTxStatusEnum.REJECTED}, ${PaymentTxStatusEnum.REVERSED})`,
    );
  }

  if (reasons.length) {
    return { ok: false, reasons };
  }

  if (status === PaymentTxStatusEnum.UNVERIFIED) {
    return { ok: 'skip' };
  }

  const outcomeErr = bulkStatusOutcomeError(status);
  if (outcomeErr) {
    return { ok: false, reasons: [outcomeErr] };
  }
  const realisationIso = parseBulkRealisationDateToIso(row.realisationDateRaw);
  const receiptNo = row.txnReceiptNo?.trim() ?? '';
  const comments = row.txnComments?.trim() ?? '';

  const fieldReasons = collectBulkOutcomeFieldReasons(
    status,
    realisationIso,
    receiptNo,
    comments,
  );
  if (fieldReasons.length) {
    return { ok: false, reasons: fieldReasons };
  }

  return {
    ok: true,
    dto: {
      status,
      ...(realisationIso ? { realisationDate: realisationIso } : {}),
      ...(comments ? { comments } : {}),
      ...(receiptNo ? { receiptNo } : {}),
    },
  };
}

/**
 * Optional tamper check: compare **Amount** column (after stripping commas) to `voucher_payments.paid_amount`.
 * Uses a small absolute tolerance for decimal rounding.
 */
export function bulkAmountMatchesDb(
  excelRaw: string,
  paidAmount: number | string,
): boolean {
  const normalized = excelRaw.replaceAll(',', '').trim();
  const n = Number(normalized);
  if (Number.isNaN(n)) return false;
  const db = Number(paidAmount);
  if (Number.isNaN(db)) return false;
  return Math.abs(n - db) < 0.015;
}
