import { interpolate } from 'src/utils/helper';

export type BookingDateSheetMessages = {
  colHeaderMismatch: string;
  missingExpectedCol: string;
  atleastOneDataRow: string;
};

/** Sheet parsers often pad rows to the worksheet range; strip trailing blanks so column count matches the template. */
function trimTrailingEmptyHeaderCells(row: any[]): any[] {
  let end = row.length;
  while (end > 0) {
    const cell = row[end - 1];
    const isEmpty =
      cell === undefined ||
      cell === null ||
      String(cell).trim() === '';
    if (!isEmpty) {
      break;
    }
    end -= 1;
  }
  return row.slice(0, end);
}

export function validateBookingDateSheet(
  jsonData: any[][],
  expectedColumns: string[],
  messages: BookingDateSheetMessages
): string | null {
  if (!jsonData.length) {
    return messages.atleastOneDataRow;
  }

  const headerRow = trimTrailingEmptyHeaderCells(jsonData[0] as string[]);
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

  return null;
}
