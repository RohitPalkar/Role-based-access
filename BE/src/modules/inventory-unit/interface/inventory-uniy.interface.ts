import { EoiCampaign, ProjectInventoryUnit, VoucherForm } from 'src/entities';

export interface ExecuteUnitBlockingParams {
  manager: any;
  campaign: EoiCampaign;
  voucher: VoucherForm;
  inventoryUnit: ProjectInventoryUnit;
  thresholdAmount: number;
  unitBlockDuration: number;
  timerExtension: number;
  user?: any;
}
