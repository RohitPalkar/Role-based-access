import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';
import * as moment from 'moment-timezone';
import { DISPLAY_DATE_TIME_FORMAT } from 'src/config/constants';
import { EoiLeaderboardView } from 'src/enums/eoi-form.enums';

interface ChannelPartnerLeaderboardRow {
  cpName: string;
  channelPartnerType: string | null;
  campaignName: string;
  noOfVouchers: number;
  voucherValue: number;
  amountCollected: number;
  cancellations: number;
  createdByName: string | null;
  lastCollectedDate: Date | null;
}

interface RelationshipManagerLeaderboardRow {
  rmName: string;
  campaignName: string;
  noOfVouchers: number;
  voucherValue: number;
  amountCollected: number;
  formFillingInProgress: number;
  formLinksShared: number;
  cancellations: number;
  converted: number;
  userGroup: string | null;
  lastCollectedDate: Date | null;
}

interface EoiLeaderboardExcelParams {
  viewType: EoiLeaderboardView;
  channelPartnerData?: ChannelPartnerLeaderboardRow[];
  relationshipManagerData?: RelationshipManagerLeaderboardRow[];
}

/**
 * Build EOI Leaderboard Excel sheet based on view type
 */
export function buildEoiLeaderboardExcelSheet(
  workbook: ExcelJS.Workbook,
  params: EoiLeaderboardExcelParams,
): void {
  const { viewType } = params;

  if (viewType === EoiLeaderboardView.CHANNEL_PARTNER) {
    buildChannelPartnerLeaderboardSheet(
      workbook,
      params.channelPartnerData || [],
    );
  } else {
    buildRelationshipManagerLeaderboardSheet(
      workbook,
      params.relationshipManagerData || [],
    );
  }
}

/**
 * Build Channel Partner leaderboard sheet
 */
function buildChannelPartnerLeaderboardSheet(
  workbook: ExcelJS.Workbook,
  data: ChannelPartnerLeaderboardRow[],
): void {
  const worksheet = workbook.addWorksheet('Channel Partner Leaderboard', {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'CP Name', key: 'cpName', width: 30 },
    { header: 'CP Type', key: 'channelPartnerType', width: 25 },
    { header: 'Campaign Name', key: 'campaignName', width: 30 },
    { header: 'Voucher/EOI Collected', key: 'noOfVouchers', width: 18 },
    { header: 'Voucher Value', key: 'voucherValue', width: 18 },
    { header: 'Collected', key: 'amountCollected', width: 20 },
    { header: 'Sourcing RM', key: 'createdByName', width: 25 },
    { header: 'Cancelled', key: 'cancellations', width: 18 },
    { header: 'EOI Last Collected', key: 'lastCollectedDate', width: 22 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Add data rows
  data.forEach((row) => {
    const excelRow = worksheet.addRow({
      cpName: row.cpName || '',
      channelPartnerType: row.channelPartnerType || 'N/A',
      campaignName: row.campaignName || '',
      noOfVouchers: row.noOfVouchers || 0,
      voucherValue: row.voucherValue || 0,
      amountCollected: row.amountCollected || 0,
      cancellations: row.cancellations || 0,
      createdByName: row.createdByName || '',
      lastCollectedDate: row.lastCollectedDate
        ? moment(row.lastCollectedDate).format(DISPLAY_DATE_TIME_FORMAT)
        : '',
    });

    // Format numeric columns
    numericCell(excelRow, 'noOfVouchers');
    numericCell(excelRow, 'voucherValue');
    numericCell(excelRow, 'amountCollected');
    numericCell(excelRow, 'cancellations');
  });

  // Apply borders
  const totalColCount = worksheet.columns.length;
  const dataEndRow = worksheet.rowCount;
  drawBlockBorder(worksheet, 1, dataEndRow, totalColCount);
}

/**
 * Build Relationship Manager leaderboard sheet
 */
function buildRelationshipManagerLeaderboardSheet(
  workbook: ExcelJS.Workbook,
  data: RelationshipManagerLeaderboardRow[],
): void {
  const worksheet = workbook.addWorksheet('Relationship Manager Leaderboard', {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'RM Name', key: 'rmName', width: 25 },
    { header: 'Campaign Name', key: 'campaignName', width: 30 },
    { header: 'Voucher/EOI Collected', key: 'noOfVouchers', width: 18 },
    { header: 'Voucher Value', key: 'voucherValue', width: 18 },
    { header: 'Collected', key: 'amountCollected', width: 20 },
    { header: 'User Group', key: 'userGroup', width: 20 },
    { header: 'Form Links Shared', key: 'formLinksShared', width: 20 },
    {
      header: 'In Progress',
      key: 'formFillingInProgress',
      width: 25,
    },
    { header: 'Cancelled', key: 'cancellations', width: 18 },
    { header: 'Converted to Booking', key: 'converted', width: 15 },
    { header: 'EOI Last Collected', key: 'lastCollectedDate', width: 22 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };

  // Add data rows
  data.forEach((row) => {
    const excelRow = worksheet.addRow({
      rmName: row.rmName || '',
      campaignName: row.campaignName || '',
      userGroup: row.userGroup || 'N/A',
      noOfVouchers: row.noOfVouchers || 0,
      voucherValue: row.voucherValue || 0,
      amountCollected: row.amountCollected || 0,
      formFillingInProgress: row.formFillingInProgress || 0,
      formLinksShared: row.formLinksShared || 0,
      cancellations: row.cancellations || 0,
      converted: row.converted || 0,
      lastCollectedDate: row.lastCollectedDate
        ? moment(row.lastCollectedDate).format(DISPLAY_DATE_TIME_FORMAT)
        : '',
    });

    // Format numeric columns
    numericCell(excelRow, 'noOfVouchers');
    numericCell(excelRow, 'voucherValue');
    numericCell(excelRow, 'amountCollected');
    numericCell(excelRow, 'formFillingInProgress');
    numericCell(excelRow, 'formLinksShared');
    numericCell(excelRow, 'cancellations');
    numericCell(excelRow, 'converted');
  });

  // Apply borders
  const totalColCount = worksheet.columns.length;
  const dataEndRow = worksheet.rowCount;
  drawBlockBorder(worksheet, 1, dataEndRow, totalColCount);
}

/**
 * Format numeric cell
 */
function numericCell(row: ExcelJS.Row, key: string): void {
  const cell = row.getCell(key);
  if (cell.value !== null && cell.value !== undefined) {
    cell.numFmt = '#,##0';
    cell.alignment = { horizontal: 'right' };
  }
}
