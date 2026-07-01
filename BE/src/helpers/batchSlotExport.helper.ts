import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';

interface SlotForExcel {
  name?: string | null;
  capacity?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  date?: string | Date | null;
  status?: string | null;
  attended?: number | null;
  headCount?: number | null;
}

interface SlotExcelParams {
  slotList: SlotForExcel[];
}

export function buildSlotExcelSheet(
  workbook: ExcelJS.Workbook,
  params: SlotExcelParams,
): void {
  const { slotList } = params;

  const worksheet = workbook.addWorksheet('Slots');

  worksheet.columns = [
    { header: 'Batch No.', key: 'name', width: 25 },
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Start Time', key: 'startTime', width: 18 },
    { header: 'End Time', key: 'endTime', width: 18 },
    { header: 'Record Count', key: 'capacity', width: 15 },
    { header: 'Attended', key: 'attended', width: 15 },
    { header: 'Head Count', key: 'headCount', width: 18 },
    { header: 'Status', key: 'status', width: 20 },
  ];

  const headerRowIndex = 1;

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  for (const slot of slotList) {
    const rowValues = makeSlotRowValues(slot);
    const row = worksheet.addRow(rowValues);
    centerAlignRow(row);
  }

  const dataEndRow = worksheet.rowCount;
  const totalColCount = worksheet.columns.length;

  worksheet.views = [
    {
      state: 'frozen',
      ySplit: headerRowIndex,
    },
  ];

  drawBlockBorder(worksheet, headerRowIndex, dataEndRow, totalColCount);
}

function centerAlignRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
  });
}

function makeSlotRowValues(slot: SlotForExcel) {
  return {
    name: slot.name || 'N/A',
    date: slot.date,
    startTime: slot.startTime || 'N/A',
    endTime: slot.endTime || 'N/A',
    capacity: slot.capacity || 0,
    headCount: slot.headCount || 0,
    attended: slot.attended || 0,
    status: slot.status || 'N/A',
  };
}
