import { interpolate } from 'src/utils/helper';

const REQUIRED_COLUMNS = [
  'Tower Name',
  'Floor',
  'Unit Number',
  'Unit Type',
  'SBA Sq.ft',
  'Status',
];

export type UnitInventorySheetMessages = {
  colHeaderMismatch: string;
  missingExpectedCol: string;
  atleastOneDataRow: string;
  valCanNotBeEmpty: string;
};

export function validateUnitInventorySheet(
  jsonData: any[][],
  expectedColumns: string[],
  messages: UnitInventorySheetMessages
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

  const normalizedRequiredColumns = REQUIRED_COLUMNS.map((col) => col.toLowerCase().trim());

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
        (cell) =>
          cell === undefined || cell === null || cell.toString().trim() === ''
      );

    if (isEmptyRow) {
      return null;
    }

    const emptyRequiredIdx = normalizedRequiredColumns.findIndex((colName) => {
      const colIdx = columnIndexMap[colName];
      const cellValue = (rowData as any[])[colIdx];
      return (
        cellValue === undefined ||
        cellValue === null ||
        cellValue.toString().trim() === ''
      );
    });

    if (emptyRequiredIdx === -1) {
      return null;
    }

    const originalColName = REQUIRED_COLUMNS[emptyRequiredIdx];
    return interpolate(messages.valCanNotBeEmpty, {
      rowIndex: String(rowIndex + 1),
      originalColName,
    });
  }, null);

  return rowLevelError;
}
