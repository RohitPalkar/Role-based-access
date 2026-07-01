import type { InvoiceTableRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import type { InvoiceDetails } from '../dialog-boxes/invoice-dialog';

export const INVOICE_LISTING_MOCK_DETAILS: InvoiceDetails = {
  billingName: 'Puravankara Limited',
  address: 'No. 130/2, Ulsoor Road, Bengaluru, Karnataka - 560042',
  gstin: '29AABCP1234F1Z5',
  panNo: 'AABCP1234F',
  iomCount: 5,
  sumOfIomAmount: 50000,
  invoiceRefNumber: 'INV-REQ-2026-001',
  invoiceNumber: 'INV-2026-001',
  invoiceDate: '12 May 2026',
};

export const getCloseInvoiceDetailsFromRow = (
  row: InvoiceTableRowItem | undefined
): InvoiceDetails | null => {
  if (!row) {
    return null;
  }

  return {
    ...INVOICE_LISTING_MOCK_DETAILS,
    invoiceNumber: row.invoiceNumber,
    invoiceRefNumber: row.invoiceNumber,
    invoiceDate: row.invoiceRequestedAt ?? INVOICE_LISTING_MOCK_DETAILS.invoiceDate,
    iomCount: row.iomCount,
    sumOfIomAmount: row.sumOfIomAmount,
    billingName: row.entity ?? INVOICE_LISTING_MOCK_DETAILS.billingName,
  };
};

export const INVOICE_LISTING_MOCK_DATA: InvoiceTableRowItem[] = [
  {
    id: 1,
    invoiceNumber: 'INV-2026-001',
    invoiceRequestedAt: '2026-05-12',
    iomCount: 5,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 2,
    invoiceNumber: 'INV-2026-002',
    invoiceRequestedAt: '2026-05-12',
    iomCount: 2,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 3,
    invoiceNumber: 'INV-2026-003',
    invoiceRequestedAt: '2026-05-12',
    iomCount: 4,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 4,
    invoiceNumber: 'INV-2026-004',
    invoiceRequestedAt: '2026-05-13',
    iomCount: 1,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 5,
    invoiceNumber: 'INV-2026-005',
    invoiceRequestedAt: '2026-05-13',
    iomCount: 4,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 6,
    invoiceNumber: 'INV-2026-006',
    invoiceRequestedAt: '2026-05-13',
    iomCount: 5,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 7,
    invoiceNumber: 'INV-2026-007',
    invoiceRequestedAt: '2026-05-14',
    iomCount: 3,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 8,
    invoiceNumber: 'INV-2026-008',
    invoiceRequestedAt: '2026-05-14',
    iomCount: 2,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 9,
    invoiceNumber: 'INV-2026-009',
    invoiceRequestedAt: '2026-05-15',
    iomCount: 6,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 10,
    invoiceNumber: 'INV-2026-010',
    invoiceRequestedAt: '2026-05-15',
    iomCount: 3,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
  {
    id: 11,
    invoiceNumber: 'INV-2026-011',
    invoiceRequestedAt: '2026-05-16',
    iomCount: 4,
    sumOfIomAmount: 50000,
    amountWithGst: null,
    entity: 'Puravankara Limited',
    invoiceStatus: 'Closed',
  },
];

export const filterInvoiceListing = (
  rows: InvoiceTableRowItem[],
  search: string
): InvoiceTableRowItem[] => {
  const query = search.toLowerCase().trim();
  if (!query) {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.invoiceNumber?.toLowerCase().includes(query) ||
      row.entity?.toLowerCase().includes(query) ||
      row.invoiceStatus?.toLowerCase().includes(query)
  );
};
