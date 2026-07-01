import { Module } from '@nestjs/common';
import { IncentiveBookingOverridesService } from './incentive_booking_overrides.service';
import { IncentiveBookingOverridesController } from './incentive_booking_overrides.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncentiveBookingOverride, Users } from 'src/entities';
import { AwsService } from '../../aws/aws.service';

@Module({
  imports: [TypeOrmModule.forFeature([IncentiveBookingOverride, Users])],
  providers: [IncentiveBookingOverridesService, AwsService],
  controllers: [IncentiveBookingOverridesController],
  exports: [IncentiveBookingOverridesService],
})
export class IncentiveBookingOverridesModule {}
