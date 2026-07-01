import { ONE_CRORE, ONE_LAKH, ONE_THOUSAND } from '../config/constants';

//format Amount
export const formatAmount = (amount: any, unit: string = '') => {
  const num = parseFloat(amount) || 0;
  if (unit === 'percent') return { value: num.toFixed(2), unit: '%' };
  if (num >= ONE_CRORE)
    return { value: (num / ONE_CRORE).toFixed(2), unit: 'Cr' };
  if (num >= ONE_LAKH) return { value: (num / ONE_LAKH).toFixed(2), unit: 'L' };
  if (num >= ONE_THOUSAND)
    return { value: (num / ONE_THOUSAND).toFixed(2), unit: 'K' };
  return { value: num.toFixed(2), unit };
};
