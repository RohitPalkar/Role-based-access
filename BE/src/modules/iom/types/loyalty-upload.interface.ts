export interface LoyaltyPointsUploadResponse {
  iomId: string;
  loyaltyPointsReleaseType: 'ELIGIBLE' | 'REDEEMABLE';
  loyaltyPointsReleaseStatus: 'ELIGIBLE' | 'REDEEMED';
  message: string;
}
