import { interpolate } from 'src/utils/helper';

const BASE_REQUIRED_COLUMNS = [
  'Payment Reference ID',
  'Payment Mode',
  'Payment Date',
  'Transaction ID',
  'Amount',
  'Status',
];

export type FinanceTxnSheetValidationMessages = {
  colHeaderMismatch: string;
  missingExpectedCol: string;
  atleastOneDataRow: string;
  valCanNotBeEmpty: string;
};

/**
 * Validates finance transaction template: headers, at least one data row,
 * and per-row required fields from the base column set.
 */
export function validateFinanceTxnSheet(
  jsonData: any[][],
  expectedColumns: string[],
  messages: FinanceTxnSheetValidationMessages
): string | null {
  if (!jsonData.length) {
    return messages.atleastOneDataRow;
  }

  const headerRow = jsonData[0] as string[];
  const normalizedHeaderRow = headerRow.map((col) => col?.toLowerCase().trim());
  const normalizedExpectedColumns = expectedColumns.map((col) => col.toLowerCase().trim());

  if (normalizedHeaderRow.length !== normalizedExpectedColumns.length) {
    return `${interpolate(messages.colHeaderMismatch, {
      colLength: String(expectedColumns.length),
    })}: ${expectedColumns.join(', ')}`;
  }

  const missingColumns = expectedColumns.filter(
    (col) => !normalizedHeaderRow.includes(col.toLowerCase().trim())
  );

  if (missingColumns.length > 0) {
    return `${messages.missingExpectedCol}: ${missingColumns.join(', ')}`;
  }

  const columnIndexMap: Record<string, number> = {};
  normalizedHeaderRow.forEach((col, index) => {
    columnIndexMap[col] = index;
  });

  const hasValidDataRow = jsonData
    .slice(1)
    .some(
      (row) =>
        Array.isArray(row) &&
        row.some((cell) => cell !== undefined && cell !== null && cell.toString().trim() !== '')
    );

  if (!hasValidDataRow) {
    return messages.atleastOneDataRow;
  }

  const dataRows = jsonData.slice(1);

  const rowLevelError = dataRows.reduce<string | null>((found, rowData, index) => {
    if (found) {
      return found;
    }

    const rowIndex = index + 1;

    const isEmptyRow =
      !rowData ||
      (rowData as any[]).every(
        (cell) => cell === undefined || cell === null || cell.toString().trim() === ''
      );

    if (isEmptyRow) {
      return null;
    }

    const requiredColumns = BASE_REQUIRED_COLUMNS.map((col) => col.toLowerCase().trim());

    const emptyColName = requiredColumns.find((colName) => {
      const colIdx = columnIndexMap[colName];
      const cellValue = (rowData as any[])[colIdx];
      return (
        cellValue === undefined || cellValue === null || cellValue.toString().trim() === ''
      );
    });

    if (emptyColName) {
      const colIdx = columnIndexMap[emptyColName];
      const originalColName = headerRow[colIdx] ?? emptyColName;
      return interpolate(messages.valCanNotBeEmpty, {
        rowIndex: String(rowIndex + 1),
        originalColName,
      });
    }

    return null;
  }, null);

  return rowLevelError;
}
