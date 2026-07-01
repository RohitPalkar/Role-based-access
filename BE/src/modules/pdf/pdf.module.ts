import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [AwsModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
