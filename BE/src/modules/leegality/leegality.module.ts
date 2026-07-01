import { Module } from '@nestjs/common';
import { LeegalityService } from './leegality.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../aws/aws.service';

@Module({
  imports: [HttpModule],
  providers: [LeegalityService, ConfigService, AwsService],
  controllers: [],
})
export class LeegalityModule {}
