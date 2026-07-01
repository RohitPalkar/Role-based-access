export type IBookingItem = {
  cancellationDate: string;
  sapBookingDate: string;
  ineligibilityReason: string;
  id: number;
  unitStatus: string;
  customerName: string;
  projectName: string;
  propertyNo: string;
  bookingDate: string; // Assuming date is received as a formatted string
  agreementReceivedDate: string;
  receivedDate: string;
  receivedPercentage: number;
  grossTotalValue: number;
  incentivePercentage: number;
  incentiveAmount: number;
  paymentStatus: string;
  stage: string;
  qualificationDate: string;
  paidDate: string;
  rmName: string;
  saleType: string;
};
