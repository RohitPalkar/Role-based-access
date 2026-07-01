import * as ExcelJS from 'exceljs';
import { drawBlockBorder } from './voucherEcelBuilder.helper';
import { formatDateTime } from './date.helper';

interface AgreementForExcel {
  projectName?: string | null;
  unitNo?: string | null;
  applicantName?: string | null;
  numberOfApplicants?: number | null;
  documentType?: string | null;
  documentName?: string | null;
  documentStatus?: string | null;
  sentDate?: string | Date | null;
  signedAt?: string | Date | null;
  internalSignatory?: string | null;
  internalSignatorySignature?: string | null;
  rmName?: string | null;
  opportunityId?: string | null;
}

interface AgreementExcelParams {
  agreements: AgreementForExcel[];
}

export function buildAgreementExcelSheet(
  workbook: ExcelJS.Workbook,
  params: AgreementExcelParams,
): void {
  const { agreements } = params;
  const worksheet = workbook.addWorksheet('Agreements');

  worksheet.columns = [
    { header: 'Project Name', key: 'projectName', width: 25 },
    { header: 'Unit Number', key: 'unitNo', width: 15 },
    { header: 'Opportunity ID', key: 'opportunityId', width: 20 },
    { header: 'Cx Name', key: 'applicantName', width: 28 },
    { header: 'No. of Applicants', key: 'numberOfApplicants', width: 18 },
    { header: 'Document Type', key: 'documentType', width: 25 },
    { header: 'Document Name', key: 'documentName', width: 25 },
    { header: 'Cx Sign Status', key: 'documentStatus', width: 28 },
    { header: 'Doc Sent Date', key: 'sentDate', width: 20 },
    { header: '	Cx Signed Date', key: 'signedAt', width: 20 },
    { header: 'Authorised Signatory', key: 'internalSignatory', width: 25 },
    {
      header: 'CRM Sign Status',
      key: 'internalSignatorySignature',
      width: 25,
    },
    { header: 'Created By', key: 'rmName', width: 20 },
  ];

  const headerRowIndex = 1;

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for (const a of agreements) {
    const rowVals = makeAgreementRowValues(a);
    const row = worksheet.addRow(rowVals);
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

function makeAgreementRowValues(a: AgreementForExcel) {
  return {
    projectName: a.projectName || 'N/A',
    unitNo: a.unitNo || 'N/A',
    applicantName: a.applicantName || 'N/A',
    numberOfApplicants: a.numberOfApplicants || 0,
    documentType: a.documentType || 'N/A',
    documentName: a.documentName || 'N/A',
    documentStatus: a.documentStatus || 'N/A',
    sentDate: a.sentDate ? formatDateTime(a.sentDate) : 'N/A',
    signedAt: a.signedAt ? formatDateTime(a.signedAt) : 'N/A',
    internalSignatory: a.internalSignatory || 'N/A',
    internalSignatorySignature: a.internalSignatorySignature || 'N/A',
    rmName: a.rmName || 'N/A',
    opportunityId: a.opportunityId || 'N/A',
  };
}
