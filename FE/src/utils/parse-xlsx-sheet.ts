import * as XLSX from 'xlsx';

/**
 * Excel often stores `!ref` as the full sheet (e.g. A1:XFD1048576) after edits, even when only
 * the header row has data. Without a cap, SheetJS walks every row and freezes the UI.
 */
const XLSX_READ_MAX_ROWS = 100_000;

/** Drop trailing blank rows after JSON conversion (safety net). */
function trimTrailingEmptyRows(matrix: any[][]): any[][] {
  if (matrix.length <= 1) {
    return matrix;
  }
  let end = matrix.length - 1;
  while (end > 0) {
    const row = matrix[end];
    const empty =
      !Array.isArray(row) ||
      row.every(
        (cell) => cell === undefined || cell === null || String(cell).trim() === ''
      );
    if (!empty) {
      break;
    }
    end -= 1;
  }
  return matrix.slice(0, end + 1);
}

/** First worksheet as a 2D matrix (row-major), same shape as `sheet_to_json(..., { header: 1 })`. */
export const parseXlsxFirstSheetToMatrix = async (file: File): Promise<any[][]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: 'array',
    sheetRows: XLSX_READ_MAX_ROWS,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    // Omit rows with no cell values (avoids huge arrays when `!ref` spans the whole grid).
    blankrows: false,
  }) as any[][];
  const trimmed = trimTrailingEmptyRows(matrix);
  return trimmed;
};
