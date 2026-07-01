import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { logger } from '@sentry/node';
import { IncentiveBookingOverride, Users } from 'src/entities';
import { Repository } from 'typeorm';
import { BookingFileDto } from './dto/booking_file.dto';
import { AwsService } from '../../aws/aws.service';
import {
  ExcelColumnDefinition,
  normalizeData,
  parseExcelFile,
  validateExcelFile,
} from 'src/utils/excel.utils';

@Injectable()
export class IncentiveBookingOverridesService {
  constructor(
    @InjectRepository(IncentiveBookingOverride)
    private readonly bookingOverrideRepository: Repository<IncentiveBookingOverride>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly awsService: AwsService,
  ) {}

  async sampleExcel() {
    return {
      message: 'Sample File fetched successfully',
      data: {
        s3Path: 'booking_override/booking_override_sample.xlsx',
      },
    };
  }

  async bulkInsert(user: any, bookingFileDto: BookingFileDto): Promise<any> {
    try {
      const { key, fileName } = bookingFileDto;

      // Step 1: Validate File Type (only .xlsx files allowed)
      if (!key.endsWith('.xlsx')) {
        throw new BadRequestException(
          `Only .xlsx files are allowed. ${fileName} have different extension`,
        );
      }

      // Step 2: Fetch File from S3
      const fileBuffer = await this.awsService.fetchFileFromS3(key);
      if (!fileBuffer) {
        throw new BadRequestException(`File not found : ${fileName}`);
      }
      const fileColumns: ExcelColumnDefinition[] = [
        {
          key: 'bookingId',
          label: 'Booking Id',
          required: true,
          type: 'number',
        },
        {
          key: 'sapBookingDate',
          label: 'Booking Date From SAP',
          required: true,
          type: 'date',
          format: 'dd-MM-yyyy',
        },
        {
          key: 'actualBookingDate',
          label: 'Actual Booking Date',
          required: true,
          type: 'date',
          format: 'dd-MM-yyyy',
        },
        { key: 'reason', label: 'Reason (Optional)' },
      ];
      const validationErrors = await validateExcelFile(
        fileBuffer,
        fileColumns,
        (row, rowIndex) => {
          const errors = [];
          if (
            row.actual_booking_date &&
            new Date(row.actual_booking_date) > new Date()
          ) {
            errors.push(
              `Booking date cannot be in the future (row ${rowIndex}).`,
            );
          }
          return errors;
        },
      );

      const userDetails = await this.userRepository.findOne({
        where: { id: user.dbId },
        select: ['id', 'name', 'email'],
      });

      if (validationErrors.length > 0) {
        throw new BadRequestException(
          validationErrors
            ?.map((error, index) => `Error ${index + 1}: ${error}`)
            .join(', '),
        );
      }

      // Step 3: Parse File using ExcelJS
      const rawData = await parseExcelFile(fileBuffer);

      // Step 4: Normalize Data
      const normalizedRows = normalizeData(rawData, fileColumns);

      const toInsert: Partial<IncentiveBookingOverride>[] = [];

      //step 5: Validate and Prepare Data for Insertion
      for (const row of normalizedRows) {
        const existing = await this.bookingOverrideRepository.findOne({
          where: {
            bookingId: row.bookingId,
            sapBookingDate: row.sapBookingDate,
            actualBookingDate: row.actualBookingDate,
          },
        });

        if (!existing) {
          toInsert.push({
            bookingId: row.bookingId,
            sapBookingDate: row.sapBookingDate,
            actualBookingDate: row.actualBookingDate,
            reason: row.reason,
            fileName: key,
            createdBy: userDetails,
          });
        }
      }

      if (toInsert.length === 0) {
        return {
          message: 'No new records to insert. All records are duplicates.',
          data: {
            totalRecords: normalizedRows.length,
            inserted: 0,
            skipped: normalizedRows.length,
          },
        };
      }

      // Step 6: Insert Validated Data into Database
      await this.bookingOverrideRepository.insert(toInsert);
      const inserted = toInsert.length;
      const skipped = normalizedRows.length - inserted;
      return {
        message: `Upload successful. [Updated: ${inserted}, Skipped: ${skipped}] - Refresh the data to view the changes {Reports > Bookings}`,
        data: {
          totalRecords: normalizedRows.length,
          inserted,
          skipped,
        },
      };
    } catch (error) {
      logger.error(
        `Booking date upload failed: ${error.message || 'Unknown error'}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Booking upload failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async getLatestOverridesMap(
    startDate?: string,
    endDate?: string,
  ): Promise<Map<string, IncentiveBookingOverride>> {
    const query = this.bookingOverrideRepository
      .createQueryBuilder('incentive_booking_overrides')
      .orderBy('incentive_booking_overrides.created_at', 'DESC'); // sort latest first

    if (startDate && endDate) {
      query.andWhere(
        'incentive_booking_overrides.sap_booking_date BETWEEN :start AND :end',
        {
          start: startDate,
          end: endDate,
        },
      );
    }

    const allRecords = await query.getMany();

    // Create map with latest record only per bookingId
    const latestMap = new Map<string, IncentiveBookingOverride>();

    for (const record of allRecords) {
      const key = `${record.bookingId}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, record); // insert only the first (latest)
      }
    }

    return latestMap;
  }
}
