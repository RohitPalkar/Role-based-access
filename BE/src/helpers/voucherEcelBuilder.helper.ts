/**
 * Builds voucher / transaction Excel workbooks for export (EOI management).
 *
 * - **Vouchers** sheet: dynamic voucher-level columns.
 * - **Transactions** sheet (`TXN_SHEET_COLS`): payment lines keyed for finance export and PE-483 bulk re-import
 *   (headers must stay aligned with `bulk-transaction-upload.helper.ts`).
 * - **Readme**: instructions when present (e.g. `buildTxExcelSheet`).
 */
import * as ExcelJS from 'exceljs';
import * as moment from 'moment';
import {
  PaymentMethodEnum,
  PaymentModeEnum,
} from 'src/enums/payment-status.enum';
import { createDynamicColumns } from 'src/utils/role-based-filter.utils';
import { formatDateTime } from './date.helper';
import { safeString } from './stringHelper';
import {
  BULK_TXN_WORKSHEET_NAME,
  DISPLAY_YEAR_MONTH_DATE,
} from 'src/config/constants';
import { deriveVoucherTransactionIdFromPaymentDetails } from 'src/utils/voucher-payment-transaction-id.util';

/** Narrow transaction columns used on the **legacy** combined export path (not the full finance template). */
const TXN_COLS: Array<{ header: string; key: string; width: number }> = [
  { header: 'Payment Reference ID', key: 'paymentReferenceId', width: 25 },
  { header: 'Txn Count', key: 'index', width: 15 },
  { header: 'Txn Mode', key: 'txnMode', width: 20 },
  { header: 'Payment Date', key: 'txnPaymentDate', width: 20 },
  { header: 'Amount', key: 'txnAmount', width: 14 },
  { header: 'Txn ID', key: 'txnId', width: 25 },
  { header: 'Txn Method', key: 'txnMethod', width: 25 },
  { header: 'Receipt #', key: 'txnReceiptNo', width: 18 },
  { header: 'Upload URL', key: 'txnUploadUrl', width: 24 },
  { header: 'Comments', key: 'txnComments', width: 50 },
];

/**
 * **Transactions** sheet layout for `buildTxExcelSheet` (finance export).
 * Header text is the contract for bulk upload: `parseBulkTransactionsWorkbook` maps row 1 to these `key`s.
 * Transaction ID shown must match `voucher_payments.voucher_transaction_id` (via `mapTxnRow` / util).
 */
export const TXN_SHEET_COLS: Array<{
  header: string;
  key: string;
  width: number;
}> = [
  { header: 'Payment Reference ID', key: 'paymentReferenceId', width: 25 },
  { header: 'Voucher ID', key: 'paidVoucherId', width: 20 },
  { header: 'Standard ID', key: 'stdEoiId', width: 20 },
  { header: 'Preferential ID', key: 'preEoiId', width: 20 },
  { header: 'Sr. No', key: 'index', width: 15 },
  { header: 'Payment Mode', key: 'txnMode', width: 20 },
  { header: 'Payment Date', key: 'txnPaymentDate', width: 20 },
  { header: 'Transaction ID', key: 'txnId', width: 25 },
  { header: 'Amount', key: 'txnAmount', width: 14 },
  { header: 'Realization Date', key: 'realisationDate', width: 25 },
  { header: 'Receipt No', key: 'txnReceiptNo', width: 20 },
  { header: 'Comments', key: 'txnComments', width: 50 },
  { header: 'Status', key: 'status', width: 20 },
];

/**
 * Maps a voucher payment record to flat fields for Excel.
 * @param isForTxSheet - When true, includes realization date, status, and sheet-specific defaults for **Transactions** export.
 */
function mapTxnRow(
  t: any,
  DISPLAY_DATE_TIME_FORMAT: string,
  isForTxSheet = false,
) {
  const paymentProof = t?.paymentDetails?.paymentProof ?? null;
  const txnUploadUrl =
    paymentProof?.length > 0
      ? `${process.env.AWS_S3_ACCESS_URL}${paymentProof[0]}`
      : 'N/A';
  let txnAmount = 0;
  // Single source of truth with `voucher_payments.voucher_transaction_id` / finance bulk matching.
  const txnId =
    deriveVoucherTransactionIdFromPaymentDetails(t?.paymentDetails) ?? 'N/A';
  if (typeof t?.paidAmount === 'number') txnAmount = t.paidAmount;
  else if (t?.paidAmount) txnAmount = Number(t.paidAmount);

  const txnMode =
    t.paymentMode === PaymentModeEnum.GATEWAY
      ? PaymentModeEnum.GATEWAY
      : 'Direct';
  let txnMethod = t?.paymentDetails?.method ?? 'N/A';
  if (['upi', PaymentMethodEnum.UPI_CARD].includes(txnMethod.toLowerCase())) {
    txnMethod = 'UPI';
  }
  const safeString = (v?: string, fallback = 'N/A') =>
    v && String(v).trim() !== '' ? v : fallback;

  if (isForTxSheet) {
    return {
      txnMode,
      txnPaymentDate: t?.date
        ? moment(t.date).format(DISPLAY_DATE_TIME_FORMAT)
        : 'N/A',
      txnAmount,
      txnId,
      txnMethod,
      txnReceiptNo: safeString(t?.receiptNo, ''),
      txnComments: safeString(t?.comments, ''),
      realisationDate: t?.realisationDate
        ? moment(t.realisationDate).format(DISPLAY_YEAR_MONTH_DATE)
        : '',
      status: safeString(t?.status),
    };
  }

  return {
    txnMode: safeString(txnMode),
    txnPaymentDate: t?.date
      ? moment(t.date).format(DISPLAY_DATE_TIME_FORMAT)
      : 'N/A',
    txnAmount,
    txnId,
    txnMethod: safeString(txnMethod),
    txnReceiptNo: safeString(t?.receiptNo),
    txnUploadUrl: safeString(txnUploadUrl),
    txnComments: safeString(t?.comments),
  };
}

function setUploadCell(ws, row, colIndex, dataMap, key) {
  const value = dataMap[key];
  if (!value) return; // nothing to set

  const cell = ws.getCell(row, colIndex);

  if (value === 'N/A') {
    cell.value = value;
  } else {
    cell.value = { text: 'link', hyperlink: value };
    cell.font = { color: { argb: 'FF0563C1' }, underline: true };
  }
}

export function drawBlockBorder(
  ws,
  startRow: number,
  endRow: number,
  totalColCount: number,
) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    for (let cellIndex = 1; cellIndex <= totalColCount; cellIndex++) {
      const cell = ws.getCell(rowIndex, cellIndex);
      cell.border = {
        top: { style: 'thin', color: { argb: '#000000' } },
        bottom: { style: 'thin', color: { argb: '#000000' } },
        left: { style: 'thin', color: { argb: '#000000' } },
        right: { style: 'thin', color: { argb: '#000000' } },
      };
    }
  }
}

/**
 * Builds **Vouchers** + **Transactions** in one workbook.
 * The embedded Transactions sheet uses `TXN_COLS` (upload URL, narrower columns) — not the same as `buildTxExcelSheet` / PE-483 template.
 */
export function buildExcelSheet(
  workbook: ExcelJS.Workbook,
  vouchers: any[],
  DISPLAY_DATE_TIME_FORMAT: string,
) {
  // 1) build voucher columns dynamically from data
  const VOUCHER_COLS = createDynamicColumns(vouchers);

  // helpers
  type VoucherInput = Record<string, unknown>;

  type Formatter = (val: unknown) => unknown; // display value (string or primitive)
  type FormattersByField = Record<string, Formatter>;

  const isNullish = (x: unknown): x is null | undefined => x == null;

  const toDisplayString = (x: unknown): string => {
    if (isNullish(x)) return 'N/A';
    if (typeof x === 'object') {
      try {
        return JSON.stringify(x);
      } catch {
        return Object.prototype.toString.call(x);
      }
    }
    return JSON.stringify(x);
  };

  const parseJsonObjectIfNeeded = (
    val: unknown,
  ): Record<string, unknown> | null => {
    if (val && typeof val === 'object') return val as Record<string, unknown>;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return parsed && typeof parsed === 'object'
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const formatRemarks: Formatter = (val: unknown) => {
    const obj = parseJsonObjectIfNeeded(val);
    if (obj) {
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${toDisplayString(v)}`)
        .join(', ');
    }
    return typeof val === 'string' ? val : 'N/A';
  };

  // if field type is unknown format it to default
  const formatDefault: Formatter = (val: unknown) => {
    if (val && typeof val === 'object' && (val as { name?: unknown }).name) {
      return (val as { name?: unknown }).name as string;
    }
    if (isNullish(val)) return 'N/A';
    return typeof val === 'object' ? JSON.stringify(val) : val;
  };

  // Formatter for professional fields - return N/A for null/undefined/empty strings
  const formatProfessionalField: Formatter = (val: unknown) => {
    if (val == null) return 'N/A';
    if (typeof val === 'string') {
      return val.trim() === '' ? 'N/A' : val;
    }
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return 'N/A';
  };

  const FORMATTERS_BY_FIELD: FormattersByField = {
    createdAt: formatDateTime,
    finalPaidDate: formatDateTime,
    checkerRemarks: formatRemarks,
    occupation: formatProfessionalField,
    industry: formatProfessionalField,
    companyName: formatProfessionalField,
    designation: formatProfessionalField,
    annualIncome: formatProfessionalField,
    companyAddress: formatProfessionalField,
  };

  function mapVoucherFields(voucher: VoucherInput): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const { key: field } of VOUCHER_COLS) {
      const value = voucher?.[field];
      const formatter = FORMATTERS_BY_FIELD[field] ?? formatDefault;
      result[field] = formatter(value);
    }

    return result;
  }

  // 2) Create Vouchers sheet (voucher data only, no transactions)
  const vouchersWs = workbook.addWorksheet('Vouchers', {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  vouchersWs.columns = VOUCHER_COLS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  const vouchersHeader = vouchersWs.getRow(1);
  vouchersHeader.font = { bold: true };
  vouchersHeader.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Populate Vouchers sheet (one row per voucher)
  for (const v of vouchers) {
    const voucherMapped = mapVoucherFields(v);
    const row = vouchersWs.addRow(voucherMapped);
    row.height = 18;
  }

  // Apply borders and formatting to Vouchers sheet
  const vouchersTotalColCount = VOUCHER_COLS.length;
  const vouchersDataEndRow = vouchersWs.rowCount;
  drawBlockBorder(vouchersWs, 1, vouchersDataEndRow, vouchersTotalColCount);

  // Enable text wrapping for customerAddress column
  const customerAddressColIndex = VOUCHER_COLS.findIndex(
    (c) => c.key === 'customerAddress',
  );
  if (customerAddressColIndex !== -1) {
    const colIndex = customerAddressColIndex + 1; // ExcelJS is 1-based
    vouchersWs.getColumn(colIndex).alignment = { wrapText: true };
  }

  vouchersWs.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', wrapText: false };
      // Enable wrapText for customerAddress cells
      if (customerAddressColIndex !== -1) {
        const cell = row.getCell(customerAddressColIndex + 1);
        cell.alignment = { vertical: 'middle', wrapText: true };
      }
    }
  });

  // 3) Create Transactions sheet (Payment Reference ID + transaction data)
  const transactionsWs = workbook.addWorksheet(BULK_TXN_WORKSHEET_NAME, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  transactionsWs.columns = TXN_COLS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  const transactionsHeader = transactionsWs.getRow(1);
  transactionsHeader.font = { bold: true };
  transactionsHeader.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Build index map for transaction columns
  const txnIndexByKey: Record<string, number> = TXN_COLS.reduce(
    (acc, c, i) => {
      acc[c.key] = i + 1; // +1 because ExcelJS columns are 1-based
      return acc;
    },
    {} as Record<string, number>,
  );

  const AMOUNT_KEY = 'txnAmount';
  const UPLOAD_KEY = 'txnUploadUrl';

  // Collect all transactions and group by Payment Reference ID to count totals
  const allTransactions: Array<{
    paymentReferenceId: string;
    index: number;
    totalCount: number;
    txnMapped: Record<string, any>;
  }> = [];

  // First pass: collect all transactions and count totals per Payment Reference ID
  const transactionCountsByRefId: Record<string, number> = {};

  for (const v of vouchers) {
    const paymentReferenceId = v?.uniqueReferenceId || 'N/A';
    const txns: any[] = Array.isArray(v?.transactionDetails)
      ? v.transactionDetails
      : [];

    // Count transactions for this Payment Reference ID
    const txnsCount = txns.length;
    transactionCountsByRefId[paymentReferenceId] = txnsCount;

    for (let i = 0; i < txns.length; i++) {
      const t = txns[i];
      if (t) {
        const txnMapped = mapTxnRow(t, DISPLAY_DATE_TIME_FORMAT);
        allTransactions.push({
          paymentReferenceId,
          index: i + 1,
          totalCount: txnsCount,
          txnMapped,
        });
      }
    }
  }

  // Add all transactions to the sheet
  let transactionRow = 2;
  for (const {
    paymentReferenceId,
    index,
    totalCount,
    txnMapped,
  } of allTransactions) {
    // Format index as "X of Y"
    const formattedIndex = `${index} of ${totalCount}`;

    const rowData = {
      ...txnMapped,
      paymentReferenceId,
      index: formattedIndex, // Set formatted index last to ensure it's not overwritten
    };
    const row = transactionsWs.addRow(rowData);
    row.height = 18;

    // Format amount column
    const amountColIndex = txnIndexByKey[AMOUNT_KEY];
    const amountCell = transactionsWs.getCell(transactionRow, amountColIndex);
    amountCell.numFmt = '#,##0.00';

    // Format upload URL column (hyperlink)
    const uploadColIndex = txnIndexByKey[UPLOAD_KEY];
    setUploadCell(
      transactionsWs,
      transactionRow,
      uploadColIndex,
      txnMapped,
      UPLOAD_KEY,
    );

    transactionRow++;
  }

  // Apply borders and formatting to Transactions sheet
  const transactionsTotalColCount = TXN_COLS.length;
  const transactionsDataEndRow = transactionsWs.rowCount;
  drawBlockBorder(
    transactionsWs,
    1,
    transactionsDataEndRow,
    transactionsTotalColCount,
  );

  transactionsWs.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: 'middle', wrapText: false };
  });

  return vouchersWs;
}

/**
 * Append a **Transactions** worksheet (+ **Readme**) listing every payment line across vouchers.
 * Used by finance export; re-uploaded file is parsed by `parseBulkTransactionsWorkbook` for PE-483 bulk updates.
 */
export function buildTxExcelSheet(
  workbook: ExcelJS.Workbook,
  vouchers: any[],
  DISPLAY_DATE_TIME_FORMAT: string,
) {
  // 1) Create Transactions sheet (Payment Reference ID + transaction data)
  const transactionsWs = workbook.addWorksheet(BULK_TXN_WORKSHEET_NAME, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  transactionsWs.columns = TXN_SHEET_COLS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  const transactionsHeader = transactionsWs.getRow(1);
  transactionsHeader.font = { bold: true };
  transactionsHeader.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Build index map for transaction columns
  const txnIndexByKey: Record<string, number> = TXN_SHEET_COLS.reduce(
    (acc, c, i) => {
      acc[c.key] = i + 1; // +1 because ExcelJS columns are 1-based
      return acc;
    },
    {} as Record<string, number>,
  );

  const AMOUNT_KEY = 'txnAmount';
  const STATUS_KEY = 'status';

  // Collect all transactions and group by Payment Reference ID to count totals
  const allTransactions: Array<{
    paymentReferenceId: string;
    paidVoucherId: string;
    preEoiId: string;
    stdEoiId: string;
    index: number;
    totalCount: number;
    txnMapped: Record<string, any>;
  }> = [];

  // First pass: collect all transactions and count totals per Payment Reference ID
  const transactionCountsByRefId: Record<string, number> = {};

  for (const v of vouchers) {
    const paymentReferenceId = v?.uniqueReferenceId || 'N/A';
    const txns: any[] = Array.isArray(v?.transactionDetails)
      ? v.transactionDetails
      : [];

    // Count transactions for this Payment Reference ID
    const txnsCount = txns.length;
    transactionCountsByRefId[paymentReferenceId] = txnsCount;

    for (let i = 0; i < txns.length; i++) {
      const t = txns[i];
      if (t) {
        const txnMapped = mapTxnRow(t, DISPLAY_DATE_TIME_FORMAT, true);
        allTransactions.push({
          paymentReferenceId,
          paidVoucherId: safeString(v?.paidVoucherId),
          preEoiId: safeString(v?.preEoiId),
          stdEoiId: safeString(v?.stdEoiId),
          index: i + 1,
          totalCount: txnsCount,
          txnMapped,
        });
      }
    }
  }

  // Add all transactions to the sheet
  let transactionRow = 2;
  for (const {
    paymentReferenceId,
    paidVoucherId,
    preEoiId,
    stdEoiId,
    index,
    totalCount,
    txnMapped,
  } of allTransactions) {
    // Format index as "X of Y"
    const formattedIndex = `${index} of ${totalCount}`;

    const rowData = {
      ...txnMapped,
      paidVoucherId,
      preEoiId,
      stdEoiId,
      paymentReferenceId,
      index: formattedIndex, // Set formatted index last to ensure it's not overwritten
    };

    const row = transactionsWs.addRow(rowData);
    row.height = 18;

    const amountColIndex = txnIndexByKey[AMOUNT_KEY];
    transactionsWs.getCell(transactionRow, amountColIndex).numFmt = '#,##0.00';

    transactionRow++;
  }

  // Range-based data validations: a single bounded range (e.g. J2:J501) stays
  // bounded when Excel deletes/inserts rows, unlike per-cell validations which
  // Excel may consolidate into a full-column range (J2:J1048576).
  const transactionsDataEndRow = transactionsWs.rowCount;
  if (transactionsDataEndRow >= 2) {
    const realisationDateCol = transactionsWs.getColumn(
      txnIndexByKey['realisationDate'],
    ).letter;
    const statusCol = transactionsWs.getColumn(
      txnIndexByKey[STATUS_KEY],
    ).letter;

    const validations = (transactionsWs as any).dataValidations;

    validations.add(
      `${realisationDateCol}2:${realisationDateCol}${transactionsDataEndRow}`,
      {
        type: 'date',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        formulae: [new Date(2026, 0, 1)],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid date in YYYY-MM-DD format.',
      },
    );

    validations.add(`${statusCol}2:${statusCol}${transactionsDataEndRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: ['"Pending Reco,Realized,Not Realized,Rejected"'],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Entry',
      error: 'Please select a value from the dropdown list.',
    });
  }

  // Apply borders and formatting to Transactions sheet
  const transactionsTotalColCount = TXN_SHEET_COLS.length;
  drawBlockBorder(
    transactionsWs,
    1,
    transactionsDataEndRow,
    transactionsTotalColCount,
  );

  transactionsWs.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: 'middle', wrapText: false };
  });

  const readmeWs = workbook.addWorksheet('Readme', {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  readmeWs.columns = [
    { header: 'Sr. No', key: 'serial_no', width: 8 },
    { header: 'Instructions', key: 'instructions', width: 130 },
  ];

  const readmeHeader = readmeWs.getRow(1);
  readmeHeader.font = { bold: true };
  const instructions = [
    {
      serial_no: 1,
      instructions:
        'This workbook contains transaction data exported from the payment management system.',
    },
    {
      serial_no: 2,
      instructions:
        'The "Transactions" sheet lists all payment transactions with details like amount, date, and reference ID.',
    },
    {
      serial_no: 3,
      instructions:
        'Payment amounts are formatted as currency with two decimal places.',
    },
    {
      serial_no: 4,
      instructions:
        'Transaction IDs may include check numbers, gateway payment IDs, or transaction numbers depending on payment method.',
    },
    {
      serial_no: 5,
      instructions:
        'Click on the "Upload URL" links to access uploaded payment proof documents stored in AWS S3.',
    },
    {
      serial_no: 6,
      instructions:
        'Transaction counts are shown in the format "X of Y" where X is the transaction number and Y is the total count for that payment reference.',
    },
    {
      serial_no: 7,
      instructions:
        'Use filters on the header row to sort or filter transactions by date, amount, or payment method. For data discrepancies or missing information, contact the finance team with the Payment Reference ID',
    },
    {
      serial_no: 8,
      instructions:
        'Payment Mode indicates whether the transaction was processed through the Gateway or made Directly.',
    },
    {
      serial_no: 9,
      instructions:
        'Comments column may contain additional notes or remarks about specific transactions.',
    },
    {
      serial_no: 10,
      instructions:
        'For data discrepancies or missing information, contact the finance team with the Payment Reference ID.',
    },
  ];

  for (const instruction of instructions) {
    readmeWs.addRow(instruction);
  }

  readmeWs.eachRow((row, rowNumber) => {
    // Apply alignment (what you already did)
    row.alignment = { vertical: 'middle', wrapText: true };

    if (rowNumber === 1) return; // skip header

    const cell = row.getCell('instructions');
    const text =
      cell.value && typeof cell.value !== 'object' ? cell.value.toString() : '';

    const columnWidth = readmeWs.getColumn('instructions').width || 130;

    // crude but workable approximation
    const approxCharPerLine = Math.floor(columnWidth / 1.2);

    const lines = text.split('\n');
    let totalLines = 0;

    for (const line of lines) {
      totalLines += Math.max(1, Math.ceil(line.length / approxCharPerLine));
    }

    const baseHeight = 20; // your default row height
    row.height = totalLines * baseHeight;
  });

  drawBlockBorder(readmeWs, 1, 11, 2);

  return readmeWs;
}
