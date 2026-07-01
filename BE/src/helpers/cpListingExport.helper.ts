import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';
import { formatIndianAmount } from './formatIndianAmount';
import { formatDateTime } from './date.helper';

interface ChannelPartnerForExcel {
  cpName?: string | null;
  cpType?: string | null;
  campaignName?: string | null;
  noOfVouchers?: number | null;
  voucherValue?: number | null;
  amountCollected?: number | null;
  lastCollectedDate?: string | Date | null;
  status?: string | null;
  linkId?: string | null;
  email?: string | null;
  contactNumber?: string | null;
  countryCode?: string | null;
  gst?: string | null;
  panNumber?: string | null;
  rera?: string | null;
  name?: string | null;

  // Address fields
  unit?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | number | null;
  country?: string | null;
}

interface ChannelPartnersExcelParams {
  partners: ChannelPartnerForExcel[];
}

/* ---------- helpers ---------- */

function buildFormLink(linkId?: string | null): string {
  return linkId
    ? `https://dev.puravankaraprojects.com/channel-partner-link/${linkId}`
    : 'N/A';
}

function formatPin(pin: string | number | null | undefined): string {
  if (pin === null || pin === undefined || pin === '') return '';
  return String(pin).trim();
}

function uniquePartsFromCandidates(
  candidates: Array<string | null | undefined>,
): string[] {
  const parts: string[] = [];
  for (const raw of candidates) {
    if (!raw) continue;
    const candidate = raw.toString().trim();
    if (!candidate) continue;
    const lowered = candidate.toLowerCase();
    const already = parts.some((p) => {
      const pl = p.toLowerCase();
      return pl.includes(lowered) || lowered.includes(pl);
    });
    if (!already) parts.push(candidate);
  }
  return parts;
}

function buildCombinedAddress(p: ChannelPartnerForExcel): string {
  const pin = formatPin(p.pinCode);
  const candidates = [p.unit, p.address, p.city, p.state, pin, p.country];
  const parts = uniquePartsFromCandidates(candidates);
  return parts.length ? parts.join(', ') : 'N/A';
}

function buildContact(p: ChannelPartnerForExcel): string {
  const number = String(p.contactNumber ?? '').trim();
  if (!number) return 'N/A';
  const cc = String(p.countryCode ?? '').trim();
  return `${cc}${number}`;
}

function makeRowValues(p: ChannelPartnerForExcel) {
  const combinedAddress = buildCombinedAddress(p);
  const contact = buildContact(p);

  const safeString = (v?: string, fallback = 'N/A') =>
    v && String(v).trim() !== '' ? v : fallback;

  const safeNumber = (v?: number, fallback = 0) =>
    typeof v === 'number' ? v : fallback;

  return {
    cpName: safeString(p.cpName, ''),
    cpType: safeString(p.cpType),
    campaignName: safeString(p.campaignName, ''),
    noOfVouchers: safeNumber(p.noOfVouchers),
    voucherValue: safeNumber(p.voucherValue),
    amountCollected: safeNumber(p.amountCollected),
    lastCollectedDate: p.lastCollectedDate
      ? formatDateTime(p.lastCollectedDate)
      : 'N/A',
    status: safeString(p.status, ''),
    linkId: buildFormLink(p.linkId) || '',

    email: safeString(p.email),
    contactNumber: contact,

    gst: safeString(p.gst),
    panNumber: safeString(p.panNumber),
    rera: safeString(p.rera),
    name: safeString(p.name),
    address: combinedAddress,
  };
}

function numericCell(row: ExcelJS.Row, key: string) {
  const cell = row.getCell(key as any);
  if (cell && cell.value !== null) {
    const num = Number(cell.value);
    if (!Number.isNaN(num)) cell.value = num;
  }
}

function formatToIndianAmount(row: ExcelJS.Row) {
  const vv = Number(row.getCell('voucherValue' as any).value || 0);
  const ac = Number(row.getCell('amountCollected' as any).value || 0);

  row.getCell('voucherValue' as any).value =
    vv === 0 ? '0' : formatIndianAmount(vv);
  row.getCell('amountCollected' as any).value =
    ac === 0 ? '0' : formatIndianAmount(ac);
}

function centerAlignRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

/* ---------- main helper function ---------- */
export function buildChannelPartnersExcelSheet(
  workbook: ExcelJS.Workbook,
  params: ChannelPartnersExcelParams,
): void {
  const { partners } = params;
  const worksheet = workbook.addWorksheet('Channel Partners');

  worksheet.columns = [
    { header: 'CP Name', key: 'cpName', width: 32 },
    { header: 'CP Type', key: 'cpType', width: 25 },
    { header: 'Campaign name', key: 'campaignName', width: 32 },
    { header: 'Voucher/EOI Collected', key: 'noOfVouchers', width: 22 },
    { header: 'Voucher Value', key: 'voucherValue', width: 17 },
    { header: 'Collected', key: 'amountCollected', width: 14 },
    { header: 'EOI Last collected', key: 'lastCollectedDate', width: 23 },
    { header: 'Status', key: 'status', width: 25 },
    { header: 'Form Link', key: 'linkId', width: 25 },
    { header: 'Email', key: 'email', width: 22 },
    { header: 'Contact No.', key: 'contactNumber', width: 16 },
    { header: 'Company GST No.', key: 'gst', width: 20 },
    { header: 'Company PAN Card No.', key: 'panNumber', width: 23 },
    { header: 'Company RERA No.', key: 'rera', width: 23 },
    { header: 'Company Name', key: 'name', width: 15 },
    { header: 'Company Address ', key: 'address', width: 25 },
  ];

  const headerRowIndex = 1;

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for (const p of partners) {
    const rowVals = makeRowValues(p);
    const row = worksheet.addRow(rowVals);

    numericCell(row, 'voucherValue');
    numericCell(row, 'amountCollected');
    numericCell(row, 'noOfVouchers');

    formatToIndianAmount(row);

    centerAlignRow(row);
  }

  const dataEndRow = worksheet.rowCount;
  const totalColCount = worksheet.columns.length;

  // freezing header so it'll always visible
  worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
  drawBlockBorder(worksheet, headerRowIndex, dataEndRow, totalColCount);
}
