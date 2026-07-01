import { Module, forwardRef } from '@nestjs/common';
import { InventoryUnitService } from './inventory-unit.service';
import { InventoryUnitController } from './inventory-unit.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectInventoryUnit } from '../inventory-unit/entities/project_inventory_units.entity';
import { AwsService } from '../aws/aws.service';
import {
  EoiCampaign,
  VoucherForm,
  VoucherPayment,
  VoucherUnitMapping,
} from 'src/entities';
import { VoucherUnitBlocking } from './entities/voucher_unit_blocking.entity';
import { VoucherFormsModule } from '../eoi_manager/voucher_forms/voucher_form.module';
import { InventoryUnitCron } from '../crons/inventory-unit.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectInventoryUnit,
      EoiCampaign,
      VoucherForm,
      VoucherUnitMapping,
      VoucherUnitBlocking,
      VoucherPayment,
    ]),
    forwardRef(() => VoucherFormsModule),
  ],
  providers: [InventoryUnitService, AwsService, InventoryUnitCron],
  controllers: [InventoryUnitController],
  exports: [InventoryUnitService],
})
export class InventoryUnitModule {}
