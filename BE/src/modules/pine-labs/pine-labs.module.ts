import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PineLabsAuthService } from './pine-labs-auth.service';
import { PineLabsExecutorService } from './pine-labs-executor.service';
import { PineLabsConfigService } from './config/pine-labs-config.service';
import { PinelabCustomer } from './entities/pinelab-customer.entity';
import { PinelabCustomerService } from './services/pinelab-customer.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([PinelabCustomer])],
  providers: [
    PineLabsConfigService,
    PineLabsAuthService,
    PineLabsExecutorService,
    PinelabCustomerService,
  ],
  exports: [PineLabsExecutorService, PinelabCustomerService],
})
export class PineLabsModule {}
