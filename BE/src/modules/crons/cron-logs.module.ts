import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronLogsService } from './cron-logs.service';
import { CronLog } from './entity/cron-log.entity';
@Module({
  imports: [TypeOrmModule.forFeature([CronLog])],
  providers: [CronLogsService],
  exports: [CronLogsService],
})
export class CronLogsModule {}
