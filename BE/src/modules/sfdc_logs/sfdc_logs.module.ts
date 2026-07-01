import { Module } from '@nestjs/common';
import { SfdcLogsService } from './sfdc_logs.service';
import { SfdcLogsController } from './sfdc_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SfdcLogs } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([SfdcLogs])],
  providers: [SfdcLogsService],
  controllers: [SfdcLogsController],
  exports: [SfdcLogsService, TypeOrmModule],
})
export class SfdcLogsModule {}
