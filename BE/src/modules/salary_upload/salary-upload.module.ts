import { Module } from '@nestjs/common';
import { SalaryUploadController } from './salary-upload.controller';
import { SalaryUploadService } from './salary-upload.service';
import { AwsService } from '../aws/aws.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadLogs, Users } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Users, FileUploadLogs])],
  controllers: [SalaryUploadController],
  providers: [SalaryUploadService, AwsService],
  exports: [],
})
export class SalaryUploadModule {}
