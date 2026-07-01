import * as ExcelJS from 'exceljs';

const MAX_COLUMN_WIDTH = 50;

// this is generic fucntion to this we can pass the colunms,and data and it will return buffer
export async function generateExcelBuffer<T extends Record<string, unknown>>(
  columns: { header: string; key: string; width?: number }[],
  data: T[],
  worksheetName = 'Sheet1',
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: '000000' } };

  worksheet.addRows(data);

  worksheet.columns.forEach((column, index) => {
    if (columns[index]?.width != null) {
      return;
    }

    const key = columns[index].key;
    let maxLength = columns[index].header.length;

    for (const row of data) {
      const value = row[key];
      const length = value == null ? 0 : String(value).length;
      maxLength = Math.max(maxLength, length);
    }

    column.width = Math.min(maxLength + 2, MAX_COLUMN_WIDTH);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
