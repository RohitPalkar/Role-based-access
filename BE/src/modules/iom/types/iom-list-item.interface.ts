export interface IomListItem {
  id: number;
  bookingId: number;
  projectId: number | null;
  projectName: string | null;
  unitNo: string | null;
  customerName: string | null;
  saleValue: number;
  saleValueCollectedPercentage: number | null;
  saleValueAmountCollected: number | null;
  brokeragePercentage: number;
  totalBrokerageAmount: number;
  referrerPoints: number;
  refereePoints: number;
  referralPointsEdited: boolean;
  referralClassification: string;
  statusCode: string;
  statusLabel: string;
  iomCreatedAt: Date | null;
  createdAt: Date;
  iomPdfAvailable: boolean;
  pdfBasePath: string;
  pdflink: string | null;
  referralPointsAdjustment: number | null;
  referralSplitType: string | null;
  referralSplitRatio: any | null;
  crmCreatedByName: string | null;
  crmVerifiedBy: number | null;
  crmVerifiedByName: string | null;
  crmApprovedByName: string | null;
  financeVerifiedByName: string | null;
  financeApprovedByName: string | null;
  pointsAllottedByName: string | null;
  loyaltyPointClassification: string | null;
  thresholdPaymentReceivedAt: Date | null;
  referralPointsEditedAt: Date | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  invoiceRequestedAt: Date | null;
  invoiceDate: Date | null;
  invoiceCreatedBy: string | null;
  invoiceUpdatedBy: string | null;
  invoiceCreatedAt: Date | null;
  invoiceUpdatedAt: Date | null;
  iomNo: string | null;
  invoiceReqNumber: string | null;
  pointsUpdatedAt: Date | null;
  salesOrderId: string | null;
  ageing: number;
}

export interface IomLoyaltyCounts {
  iomRequestInvoice: number;
  pendingSubmission: number;
  submittedInvoice: number;
}

export interface IomListingResult {
  items: IomListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: IomLoyaltyCounts;
}
