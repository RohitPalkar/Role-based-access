import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';

interface InventoryForExcel {
  towerId?: string | null;
  unitId?: string | null;
  campaignName?: string | null;
  towerName?: string | null;
  floor?: number | string | null;
  unitNumber?: string | null;
  series?: string | null;
  configuration?: string | null;
  facing?: string | null;
  carParkType?: string | null;
  numberOfCarParks?: number | null;
  areaSba?: number | null;
  carpetArea?: number | null;
  agreementValue?: number | null;
  status?: string | null;
}

interface InventoryExcelParams {
  inventory: InventoryForExcel[];
}

export function buildInventoryExcelSheet(
  workbook: ExcelJS.Workbook,
  params: InventoryExcelParams,
): void {
  const { inventory } = params;

  const worksheet = workbook.addWorksheet('Inventory');

  worksheet.columns = [
    { header: 'Tower Id', key: 'towerId', width: 30 },
    { header: 'Unit Id', key: 'unitId', width: 30 },
    { header: 'Campaign Name', key: 'campaignName', width: 30 },
    { header: 'Tower Name', key: 'towerName', width: 25 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Unit Number', key: 'unitNumber', width: 18 },
    { header: 'Series', key: 'series', width: 15 },
    { header: 'Unit Type', key: 'configuration', width: 20 },
    { header: 'Facing', key: 'facing', width: 15 },
    { header: 'Car Park Type', key: 'carParkType', width: 35 },
    { header: 'No. Of Car Parks', key: 'numberOfCarParks', width: 20 },
    { header: 'SBA Sq.ft', key: 'areaSba', width: 15 },
    { header: 'Carpet Area Sq.ft', key: 'carpetArea', width: 18 },
    { header: 'Agreement Value', key: 'agreementValue', width: 20 },
    { header: 'Status', key: 'status', width: 30 },
  ];

  const headerRowIndex = 1;

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for (const item of inventory) {
    const rowValues = makeInventoryRowValues(item);
    const row = worksheet.addRow(rowValues);
    centerAlignRow(row);
  }

  const dataEndRow = worksheet.rowCount;
  const totalColCount = worksheet.columns.length;

  worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

  drawBlockBorder(worksheet, headerRowIndex, dataEndRow, totalColCount);
}

function centerAlignRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

function makeInventoryRowValues(item: InventoryForExcel) {
  return {
    towerId: item.towerId || 'N/A',
    unitId: item.unitId || 'N/A',
    campaignName: item.campaignName,
    towerName: item.towerName,
    floor: item.floor || '',
    unitNumber: item.unitNumber || '',
    series: item.series || 'N/A',
    configuration: item.configuration || 'N/A',
    facing: item.facing || 'N/A',
    carParkType: item.carParkType || 'N/A',
    numberOfCarParks: item.numberOfCarParks ?? 0,
    areaSba: item.areaSba ?? 0,
    carpetArea: item.carpetArea ?? 0,
    agreementValue: item.agreementValue ?? 0,
    status: item.status,
  };
}
