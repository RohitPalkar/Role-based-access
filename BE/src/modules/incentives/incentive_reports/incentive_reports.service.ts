import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../../../entities/index';
import { getMonthName } from '../../../utils/getMonthByNumber';
import { IncentiveReportsGenerator } from './incentive_reports.utils';
import { logger } from 'src/logger/logger';
import { PassThrough } from 'stream';
import { AwsService } from '../../aws/aws.service';
import { reportFormat } from 'src/enums/report-format.enum';
@Injectable()
export class IncentiveReportsService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,

    private readonly reportGenerator: IncentiveReportsGenerator,

    private readonly awsService: AwsService,
  ) {}

  async generateCustomReport(
    userId: number,
    startDate: Date,
    endDate: Date,
    format: string = reportFormat.PDF,
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
    });
    try {
      const monthName = getMonthName(startDate.getMonth());
      const year = startDate.getFullYear();
      const fileName =
        format === reportFormat.PDF
          ? `${user?.name.replace(/\s+/g, '')}${year}${monthName}.pdf`
          : `${user?.name.replace(/\s+/g, '')}${year}${monthName}.xlsx`;
      const buffer =
        format === reportFormat.PDF
          ? await this.reportGenerator.generatePDFBuffer(
              user.userName,
              startDate,
              endDate,
            )
          : await this.reportGenerator.generateExcelBuffer(
              user.userName,
              startDate,
              endDate,
            );

      if (!buffer || buffer.length === 0) {
        throw new BadRequestException(
          `No Incentive Bookings found for ${user?.name} for given time period`,
        );
      }

      const passThroughStream = new PassThrough();
      passThroughStream.end(buffer);
      const filepath = `reports/incentive/${fileName}`;
      const isExcel = format !== reportFormat.PDF;
      await this.awsService.uploadToS3(
        `reports/incentive/${fileName}`,
        passThroughStream,
        isExcel,
      );

      return {
        message: 'Report generated successfully',
        data: { filepath },
      };
    } catch (error) {
      logger.error(`error in generating PDF ${error}`);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}
