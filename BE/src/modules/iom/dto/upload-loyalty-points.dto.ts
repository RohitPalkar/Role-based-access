import { IsEnum } from 'class-validator';

export enum LoyaltyPointsUploadActionEnum {
  ELIGIBLE = 'ELIGIBLE',
  REDEEMABLE = 'REDEEMABLE',
}

export class UploadLoyaltyPointsDto {
  @IsEnum(LoyaltyPointsUploadActionEnum)
  loyaltyPointsReleaseType: LoyaltyPointsUploadActionEnum;
}
