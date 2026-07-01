import { INDIAN_GROUPS } from 'src/config/constants';

export const isIndianGroup = (groupName: string): boolean => {
  return INDIAN_GROUPS.has(groupName);
};
