import { INVENTORY_STATUS } from 'src/utils/constant';

export const inventoryStatusOptions: Array<{ label: string; value: string }> = [
  { label: INVENTORY_STATUS.AVAILABLE, value: INVENTORY_STATUS.AVAILABLE },
  { label: INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT, value: INVENTORY_STATUS.BLOCKED_BY_MANAGEMENT },
  { label: INVENTORY_STATUS.BLOCKED_BY_RM, value: INVENTORY_STATUS.BLOCKED_BY_RM },
];
