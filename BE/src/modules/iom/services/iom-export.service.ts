import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PassThrough } from 'stream';

import { generateExcelBuffer } from 'src/common/helpers/excel.helper';
import { resolveExportColumns } from 'src/constants/iom-export.columns';
import { CustomConfigService } from 'src/config/custom-config.service';
import { formatDateUtil } from 'src/helpers/date.helper';
import { logger } from 'src/logger/logger';
import { AwsService } from 'src/modules/aws/aws.service';
import { ExportIomExcelDto } from '../dto/export-iom-excel.dto';
import { fromExportIomExcelDto } from '../mappers/iom-listing-filters.mapper';
import { IomListItem } from '../types/iom-list-item.interface';
import { AuthenticatedUser } from './iom-validation.service';
import { IomListingService } from './iom-listing.service';

const DATE_EXPORT_FIELDS = new Set<keyof IomListItem>([
  'iomCreatedAt',
  'createdAt',
  'thresholdPaymentReceivedAt',
  'referralPointsEditedAt',
  'invoiceRequestedAt',
  'invoiceDate',
  'invoiceCreatedAt',
  'invoiceUpdatedAt',
  'pointsUpdatedAt',
]);

@Injectable()
export class IomExportService {
  constructor(
    private readonly iomListingService: IomListingService,
    private readonly awsService: AwsService,
    private readonly configService: CustomConfigService,
  ) {}

  async exportToExcel(
    user: AuthenticatedUser,
    dto: ExportIomExcelDto,
  ): Promise<{ data: { fileUrl: string; baseUrl: string } }> {
    try {
      const columns = resolveExportColumns(dto.fields, user.role);
      const filters = fromExportIomExcelDto(dto);
      const { items } = await this.iomListingService.findIoms(user, filters, {
        skipPagination: true,
        skipCounts: true,
      });
      const rows = items.map((item) => this.toExportRow(item, columns));
      const buffer = await generateExcelBuffer(columns, rows, 'IOM Export');

      const timestamp = formatDateUtil(undefined, 'timestamp');
      const fileUrl = `exports/iom-list-${timestamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(fileUrl, stream, true);
      const baseUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');

      logger.info(`IOM export generated: ${items.length} rows, key=${fileUrl}`);

      return {
        data: {
          fileUrl,
          baseUrl,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      logger.error('IOM export failed:', error);
      throw new InternalServerErrorException('Failed to export IOM list');
    }
  }

  private toExportRow(
    item: IomListItem,
    columns: { key: string }[],
  ): Record<string, string | number | boolean> {
    const row: Record<string, string | number | boolean> = {};

    for (const column of columns) {
      const key = column.key as keyof IomListItem;
      const raw = item[key];

      if (raw == null) {
        row[column.key] = '';
        continue;
      }

      if (DATE_EXPORT_FIELDS.has(key) && raw instanceof Date) {
        row[column.key] = formatDateUtil(raw, 'display') ?? '';
        continue;
      }

      if (key === 'referralPointsEdited' && typeof raw === 'boolean') {
        row[column.key] = raw;
        continue;
      }

      if (key === 'referralSplitRatio') {
        row[column.key] =
          typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
        continue;
      }

      if (typeof raw === 'number' || typeof raw === 'boolean') {
        row[column.key] = raw;
        continue;
      }

      row[column.key] = String(raw);
    }

    return row;
  }
}
