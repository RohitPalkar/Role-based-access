export interface LoyaltyAddress {
  addressLine1: string | null;
  addressLine2: string | null;
  pincode: string | null;
  location: string | null;
}

export interface LoyaltyParticipantDetails {
  customerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  unitNumber: string | null;
  pinelabCustomerId: string | null;
  isProfileDataMatching: boolean;
  shouldCreatePinelabProfile: boolean;
  firstName: string | null;
  lastName: string | null;
  sfdcId: string | null;
  gender: string | null;
  email: string | null;
  address: LoyaltyAddress;
  projectName2: string | null;
  unitNo2: string | null;
}

export interface LoyaltyPaymentDetails {
  saleValue: number;
  brokeragePercentage: number;
  brokerageAmount: number;
  loyaltyPointsAdjustment: number;
  pointsForReferee: number;
  pointsForReferrer: number;
  refereePayoutAmount: number;
  referrerPayoutAmount: number;
}

export interface LoyaltyDetailsResponse {
  refereeDetails: LoyaltyParticipantDetails;
  referrerDetails: LoyaltyParticipantDetails;
  paymentDetails: LoyaltyPaymentDetails;
}

export const EMPTY_LOYALTY_ADDRESS: LoyaltyAddress = {
  addressLine1: null,
  addressLine2: null,
  pincode: null,
  location: null,
};
