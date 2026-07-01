import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { parse, isValid, format } from 'date-fns';
import { EMAIL_REGEX } from 'src/config/constants';
import { logger } from 'src/logger/logger';

export async function parseExcelFile(fileBuffer: Buffer): Promise<any[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in uploaded file');
    }

    const rawData: any[] = [];
    // Assume the first row is the header row
    const headerRow = worksheet.getRow(1);

    // Iterate over all rows starting from the second row
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const record: any = {};
      row.eachCell((cell, colNumber) => {
        const header = getCellText(headerRow.getCell(colNumber).value);
        if (!header) return;
        record[header] = getCellText(cell.value);
      });
      rawData.push(record);
    });

    if (rawData.length === 0) {
      throw new Error('Uploaded file is empty');
    }

    return rawData;
  } catch (error) {
    logger.error(error);
    throw new BadRequestException('Failed To Parse File');
  }
}

export function normalizeData(
  rawData: any[],
  columns: ExcelColumnDefinition[],
): any[] {
  const labelMap = new Map(
    columns.map((col) => [col.label.trim().toLowerCase(), col]),
  );

  return rawData.map((record) => {
    const normalized: Record<string, any> = {};

    for (const [rawKey, rawValue] of Object.entries(record)) {
      const col = labelMap.get(rawKey.trim().toLowerCase());
      if (!col) continue;

      let value = getCellText(rawValue);

      if (col.type === 'date' && value) {
        const parsed = tryFlexibleDateParse(value);
        value = parsed ? format(parsed, 'yyyy-MM-dd') : null;
      }

      normalized[col.key] = value;
    }

    return normalized;
  });
}

// Utility function to extract cell text
export function getCellText(cell: any): string {
  if (cell == null) return '';

  if (typeof cell === 'object') {
    const objectText = getCellTextFromExcelObject(cell);
    if (objectText !== null) return objectText;
  }

  // Primitive types
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number' || typeof cell === 'boolean')
    return cell.toString();
  if (cell instanceof Date) return cell.toISOString();

  return '';
}

function getCellTextFromExcelObject(cell: any): string | null {
  // ExcelJS: Hyperlink cell
  if (
    typeof cell.hyperlink === 'string' &&
    cell.hyperlink.startsWith('mailto:')
  ) {
    return cell.hyperlink.slice(7).trim();
  }
  if (typeof cell.text === 'string') {
    return cell.text.trim();
  }
  // ExcelJS: Rich text array
  if (Array.isArray(cell.richText)) {
    return cell.richText
      .map((rt: any) => rt.text)
      .join('')
      .trim();
  }
  // ExcelJS: Formula result
  if (cell.result !== undefined) {
    return getCellText(cell.result);
  }
  // Fallback: value property
  if (cell.value !== undefined) {
    return getCellText(cell.value);
  }

  return null;
}

export type ExcelColumnType = 'string' | 'number' | 'date' | 'email';

async function loadAndValidateExcelHeader(
  fileBuffer: Buffer,
  expectedColumns: ExcelColumnDefinition[],
): Promise<
  | {
      worksheet: ExcelJS.Worksheet;
      colKeyMap: {
        key: string;
        colIndex: number;
        label: string;
        required?: boolean;
        type?: string;
        format?: string;
      }[];
    }
  | { errors: string[] }
> {
  const MAX_SIZE = 10 * 1024 * 1024;

  if (fileBuffer?.length > MAX_SIZE) {
    return { errors: ['File size exceeds 10MB limit.'] };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return { errors: ['No worksheet found in the uploaded file.'] };
  }

  const headerRow = worksheet.getRow(1);
  const headers = (headerRow.values as any[])
    .slice(1)
    .map((v) => v?.toString().trim().toLowerCase());

  const expectedLabels = expectedColumns.map((c) => c.label.toLowerCase());
  const errors: string[] = [];

  if (headers.length === expectedLabels.length) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] !== expectedLabels[i]) {
        errors.push(
          `Column ${i + 1} should be '${expectedLabels[i]}', found '${headers[i] || ''}'.`,
        );
      }
    }
  } else {
    errors.push(
      `Incorrect number of columns. Expected ${expectedLabels.length}, found ${headers.length}.`,
    );
  }

  if (errors.length > 0) {
    return { errors };
  }

  const colKeyMap = expectedColumns.map((c, idx) => ({
    colIndex: idx + 1,
    ...c,
  }));

  return { worksheet, colKeyMap };
}

export interface ExcelColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  type?: ExcelColumnType; // 'string', 'number', 'date', 'email'
  format?: string;
}
type RowValidator = (
  row: Record<string, string | number | Date>,
  rowIndex: number,
) => string[];

function validateColumnValue(
  col: {
    key: string;
    label: string;
    required?: boolean;
    type?: string;
    format?: string;
  },
  value: any,
  rowIndex: number,
  rowData: Record<string, any>,
): string[] {
  const errors: string[] = [];

  if (col.required && !value) {
    errors.push(
      `Missing required value for '${col.label}' at row ${rowIndex}.`,
    );
    return errors;
  }

  if (col.type === 'email' && value && !EMAIL_REGEX.test(value)) {
    errors.push(`Invalid email at row ${rowIndex}: ${value}`);
  }

  if (col.type === 'number' && value && Number.isNaN(Number(value))) {
    errors.push(
      `Invalid number for '${col.label}' at row ${rowIndex}: ${value}`,
    );
  }

  if (col.type === 'date' && value) {
    const parsedDate = tryFlexibleDateParse(value);
    if (parsedDate) {
      rowData[col.key] = parsedDate;
    } else {
      errors.push(
        `Invalid date format for '${col.label}' at row ${rowIndex}: ${value}. Expected format: ${col.format || 'yyyy-MM-dd'}`,
      );
    }
  }

  return errors;
}

function validateExcelRows(
  worksheet: ExcelJS.Worksheet,
  colKeyMap: {
    key: string;
    colIndex: number;
    label: string;
    required?: boolean;
    type?: string;
    format?: string;
  }[],
  customRowValidator?: RowValidator,
): string[] {
  const errors: string[] = [];
  const rowCount = worksheet.rowCount;

  for (let i = 2; i <= rowCount; i++) {
    const row = worksheet.getRow(i);
    const rowValues = (row.values as any[]).slice(1);

    if (rowValues.every((v) => v === null || v === undefined || v === '')) {
      continue;
    }

    const rowData: Record<string, any> = {};
    colKeyMap.forEach(({ key, colIndex }) => {
      const cellValue = row.getCell(colIndex)?.value;
      rowData[key] = normalizeExcelCellValue(cellValue);
    });

    for (const col of colKeyMap) {
      const value = rowData[col.key];
      const columnErrors = validateColumnValue(col, value, i, rowData);
      errors.push(...columnErrors);
    }

    if (customRowValidator) {
      const rowErrs = customRowValidator(rowData, i);
      errors.push(...rowErrs);
    }
  }

  return errors;
}

function normalizeExcelCellValue(value: any): string {
  if (value == null) return '';

  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    if ('text' in value) return String(value.text).trim();
    if ('result' in value) return String(value.result).trim();
    if ('richText' in value)
      return value.richText
        .map((r: any) => r.text)
        .join('')
        .trim();
  }

  return String(value).trim();
}

export async function validateExcelFile(
  fileBuffer: Buffer,
  expectedColumns: ExcelColumnDefinition[],
  customRowValidator?: RowValidator,
): Promise<string[]> {
  const headerResult = await loadAndValidateExcelHeader(
    fileBuffer,
    expectedColumns,
  );

  if ('errors' in headerResult) {
    return headerResult.errors;
  }

  return validateExcelRows(
    headerResult.worksheet,
    headerResult.colKeyMap,
    customRowValidator,
  );
}

function tryFlexibleDateParse(value: string): Date | null {
  const commonDateFormats = [
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy/MM/dd',
    'dd MMM yyyy',
    'MMM dd, yyyy',
  ];

  // Try native Date (for long strings like "Tue Apr 15 2025...")
  const nativeParsed = new Date(value);
  if (isValid(nativeParsed)) return nativeParsed;
  // Try common patterns
  for (const fmt of commonDateFormats) {
    const parsed = parse(value, fmt, new Date());
    if (isValid(parsed) && format(parsed, fmt) === value) {
      return parsed;
    }
  }

  return null;
}

export function getCellValue(row, colIndex) {
  return row.getCell(colIndex)?.value;
}
