import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';
import { formatIndianAmount } from './formatIndianAmount';

interface RmDashboardCampaign {
  inProgressEoiCount: number;
  paidEoiCollectedCounts: number;
  partiallyPaidEoiCollectedCounts: number;
  loyalty: number;
  digital: any;
  channelpartner: number;
  campaign: string;
  campaignId: number;
  allotedIdCount: number;
  activeEoiCount: number;
  pendingRMCount: number;
  totalEoiAmount: number;
  pendingCRMCount: number;
  pendingFINCount: number;
  pendingMISCount: number;
  cancellationCount: {
    processed: number;
    requested: number;
    inProgress: number;
    totalCount: number;
  };
  collectedEoiCount: number;
  totalEoiAmountCollected: number;
  purvaChampion: string;
}

interface RmDashboardExcelParams {
  campaigns: RmDashboardCampaign[];
  viewMode: 'default' | 'source';
}

/**
 * Build RM dashboard Excel sheet based on selected view mode.
 * Supports:
 *  - Default view with cancellation sub-headers
 *  - Source-wise view with channel-wise columns
 */
export function buildRmDashboardExcelSheet(
  workbook: ExcelJS.Workbook,
  params: RmDashboardExcelParams,
): void {
  const { campaigns, viewMode } = params;
  const worksheet = workbook.addWorksheet('RM Dashboard');

  if (viewMode === 'source') {
    buildSourceWiseViewSheet(worksheet, campaigns);
    return;
  }

  buildDefaultViewSheet(worksheet, campaigns);
}

/**
 * Builds the default view sheet with a two-row header and
 * cancellations split into four sub-columns.
 */
function buildDefaultViewSheet(
  worksheet: ExcelJS.Worksheet,
  campaigns: RmDashboardCampaign[],
): void {
  // First header row: high-level columns, Cancellations merged
  const headerRow1 = worksheet.addRow([
    'Campaign',
    'EOIs Collected - Units',
    'Fully Paid',
    'Partially Paid',
    'EOI Inprogress - Units',
    'Value of EOIs',
    'EOI Amount Collected',
    'Voucher IDs Allotted',
    'Active EOIs',
    'MIS Pending',
    'CRM Pending',
    'Finance Pending',
    'RM Pending',
    'Cancellations',
    null,
    null,
    null,
  ]);

  // Second header row: sub-headers under Cancellations
  const headerRow2 = worksheet.addRow([
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'Processed',
    'In Progress',
    'Requested',
    'Total Count(Processed + In Progress + Requested)',
  ]);

  headerRow1.font = { bold: true };
  headerRow2.font = { bold: true };

  // Merge cells for columns that span both header rows
  worksheet.mergeCells('A1:A2');
  worksheet.mergeCells('B1:B2');
  worksheet.mergeCells('C1:C2');
  worksheet.mergeCells('D1:D2');
  worksheet.mergeCells('E1:E2');
  worksheet.mergeCells('F1:F2');
  worksheet.mergeCells('G1:G2');
  worksheet.mergeCells('H1:H2');
  worksheet.mergeCells('I1:I2');
  worksheet.mergeCells('J1:J2');
  worksheet.mergeCells('K1:K2');
  worksheet.mergeCells('L1:L2');
  worksheet.mergeCells('M1:M2');

  // Merge Cancellations header across four sub-columns
  worksheet.mergeCells('N1:Q1');

  // Define columns for data rows (keys used for addRow)
  worksheet.columns = [
    { key: 'campaign', width: 30 },
    { key: 'collectedEoiCount', width: 22 },
    { key: 'paidEoiCollectedCounts', width: 22 },
    { key: 'partiallyPaidEoiCollectedCounts', width: 22 },
    { key: 'inProgressEoiCount', width: 22 },
    { key: 'totalEoiAmount', width: 22 },
    { key: 'totalEoiAmountCollected', width: 24 },
    { key: 'allotedIdCount', width: 20 },
    { key: 'activeEoiCount', width: 20 },
    { key: 'pendingMISCount', width: 16 },
    { key: 'pendingCRMCount', width: 16 },
    { key: 'pendingFINCount', width: 16 },
    { key: 'pendingRMCount', width: 16 },
    { key: 'cancellationProcessed', width: 16 },
    { key: 'cancellationInProgress', width: 16 },
    { key: 'cancellationRequested', width: 16 },
    { key: 'cancellationTotalCount', width: 50 },
  ];
  const totalColCount = worksheet.columns.length;
  const headerStartRow = 1;
  const headerEndRow = 2;
  const dataStartRow = headerEndRow + 1;
  const dataEndRow = dataStartRow + campaigns.length - 1;

  const num = (v: any) => v ?? 0;
  const money = (v: any) => formatIndianAmount(v) ?? 0;
  const cancellationDefaults = {
    processed: 0,
    requested: 0,
    inProgress: 0,
    totalCount: 0,
  };
  // Add data rows
  campaigns.forEach((c) => {
    const cancellation = { ...cancellationDefaults, ...c.cancellationCount };

    worksheet.addRow({
      campaign: c.campaign,
      collectedEoiCount: num(c.collectedEoiCount),
      paidEoiCollectedCounts: num(c.paidEoiCollectedCounts),
      partiallyPaidEoiCollectedCounts: num(c.partiallyPaidEoiCollectedCounts),
      inProgressEoiCount: num(c.inProgressEoiCount),
      totalEoiAmount: money(c.totalEoiAmount),
      totalEoiAmountCollected: money(c.totalEoiAmountCollected),
      allotedIdCount: num(c.allotedIdCount),
      activeEoiCount: num(c.activeEoiCount),
      pendingMISCount: num(c.pendingMISCount),
      pendingCRMCount: num(c.pendingCRMCount),
      pendingFINCount: num(c.pendingFINCount),
      pendingRMCount: num(c.pendingRMCount),
      cancellationProcessed: num(cancellation.processed),
      cancellationInProgress: num(cancellation.inProgress),
      cancellationRequested: num(cancellation.requested),
      cancellationTotalCount: num(cancellation.totalCount),
    });
  });

  // Optional: freeze header rows for better usability
  worksheet.views = [{ state: 'frozen', ySplit: 2 }];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
  drawBlockBorder(worksheet, headerStartRow, dataEndRow, totalColCount);
}

/**
 * Builds the source-wise view sheet.
 * Right now, only the first four columns are mapped from campaign level.
 * Channel-wise columns are created but left empty intentionally.
 */
function buildSourceWiseViewSheet(
  worksheet: ExcelJS.Worksheet,
  campaigns: RmDashboardCampaign[],
): void {
  worksheet.columns = [
    { header: 'Campaign', key: 'campaign', width: 30 },
    {
      header: 'EOIs Collected - Units',
      key: 'collectedEoiCount',
      width: 22,
    },
    {
      header: 'Fully Paid',
      key: 'paidEoiCollectedCounts',
      width: 22,
    },
    {
      header: 'Partially Paid',
      key: 'partiallyPaidEoiCollectedCounts',
      width: 22,
    },
    {
      header: 'EOI Inprogress - Units',
      key: 'inProgressEoiCount',
      width: 16,
    },
    { header: 'Value of EOIs', key: 'totalEoiAmount', width: 22 },
    {
      header: 'EOI Amount Collected',
      key: 'totalEoiAmountCollected',
      width: 24,
    },
    { header: 'Channel Partner', key: 'channelPartner', width: 33 },
    { header: 'Loyalty', key: 'loyalty', width: 33 },
    { header: 'Purva Champion', key: 'purvaChampion', width: 33 },
    { header: 'Direct', key: 'direct', width: 15 },
    { header: 'Digital', key: 'digital', width: 33 },
  ];

  const totalColCount = worksheet.columns.length;
  const headerStartRow = 1;
  const dataStartRow = 2;
  const dataEndRow = dataStartRow + campaigns.length - 1;

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  campaigns.forEach((campaignItem) => {
    worksheet.addRow({
      campaign: campaignItem.campaign,
      collectedEoiCount: campaignItem.collectedEoiCount ?? 0,
      paidEoiCollectedCounts: campaignItem.paidEoiCollectedCounts ?? 0,
      partiallyPaidEoiCollectedCounts:
        campaignItem.partiallyPaidEoiCollectedCounts ?? 0,
      inProgressEoiCount: campaignItem.inProgressEoiCount ?? 0,
      totalEoiAmount: campaignItem.totalEoiAmount ?? 0,
      totalEoiAmountCollected: campaignItem.totalEoiAmountCollected ?? 0,
      channelPartner: campaignItem.channelpartner ?? 0,
      loyalty: campaignItem.loyalty ?? 0,
      purvaChampion: campaignItem.purvaChampion ?? 0,
      direct: campaignItem.totalEoiAmountCollected ?? 0,
      digital: campaignItem.digital,
    });
  });

  worksheet.views = [{ state: 'frozen', ySplit: 2 }];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
  drawBlockBorder(worksheet, headerStartRow, dataEndRow, totalColCount);
}
