import { GST_PERCENT } from 'src/config/constants';

export function calculateAgreementTotalAmount(
  totalAgreementValue: number,
  agreementPercentage: number,
): number {
  const agreementValue = Number(totalAgreementValue) || 0;
  const agreementPercentageValue = (Number(agreementPercentage) || 0) / 100;
  const ninePercentOfAV = Math.round(agreementValue * agreementPercentageValue);
  const gstOnNinePercent = Math.round(ninePercentOfAV * GST_PERCENT);
  const totalCalculatedAmount = ninePercentOfAV + gstOnNinePercent;
  return totalCalculatedAmount;
}
