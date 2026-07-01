import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { Referral } from './entities/referral.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Referral]), HttpModule],
  providers: [ReferralsService],
  controllers: [ReferralsController],
  exports: [ReferralsService, TypeOrmModule],
})
export class ReferralsModule {}
