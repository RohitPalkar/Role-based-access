import { BadRequestException, Injectable } from '@nestjs/common';
import { AwsService } from '../aws/aws.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Not, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Users } from '../../modules/users/entities/user.entity';
import { FileUploadLogs } from './entities/upload_logs.entity';
import { UploadStatus } from '../../enums/user_finance.enums';
import { SalaryFileDto } from './dto/salary-file.dto';
import { logger } from 'src/logger/logger';
import { CustomConfigService } from '../../config/custom-config.service';
import { IST_TIME_ZONE, LISTING_DATE_FORMAT } from 'src/config/constants';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import {
  ExcelColumnDefinition,
  validateExcelFile,
} from 'src/utils/excel.utils';
import { formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class SalaryUploadService {
  constructor(
    private readonly awsService: AwsService,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(FileUploadLogs)
    private readonly uploadLogsRepository: Repository<FileUploadLogs>,

    private readonly configService: CustomConfigService,
  ) {}

  async bulkInsert(salaryFileDto: SalaryFileDto) {
    try {
      const { key, fileName } = salaryFileDto;

      // Step 1: Validate File Type (only .xlsx files allowed)
      if (!key.endsWith('.xlsx')) {
        throw new BadRequestException('Only .xlsx files are allowed.');
      }

      // Step 2: Fetch File from S3
      const fileBuffer = await this.fetchFileFromS3(key);
      const fileColumns: ExcelColumnDefinition[] = [
        {
          key: 'email',
          label: 'email',
          required: true,
          type: 'email',
        },
        {
          key: 'salary',
          label: 'salary',
          required: true,
          type: 'number',
        },
      ];

      //Step 3: Validate File Structure
      const duplicateEmails = new Map<string, string>();
      const validationErrors = await validateExcelFile(
        fileBuffer,
        fileColumns,
        (row, rowIndex) => {
          const errors = [];
          if (row.email) {
            if (duplicateEmails.has(String(row?.email))) {
              const existingSalary = duplicateEmails.get(String(row?.email));
              if (existingSalary !== row.salary) {
                errors.push(
                  `Duplicate record for email ${row.email} with different salary at row ${rowIndex}.`,
                );
              }
            } else {
              duplicateEmails.set(String(row?.email), String(row.salary));
            }
          }
          return errors;
        },
      );
      if (validationErrors.length > 0) {
        throw new BadRequestException(
          validationErrors
            ?.map((error, index) => `Error ${index + 1}: ${error}`)
            .join(', '),
        );
      }

      // Step 3: Parse File using ExcelJS
      const rawData = await this.parseFile(key, fileBuffer);

      // Step 4: Normalize Data
      const salaryData = this.normalizeData(rawData);

      // Step 5: Process Records
      const logs = await this.processRecords(salaryData, fileName);

      // Step 6: Save Logs
      if (logs.length > 0) {
        try {
          await this.uploadLogsRepository.save(logs);
        } catch (e) {
          logger.error(e, 'save logs failed');
        }
      }

      return {
        message: 'Salary upload completed',
        data: {
          totalRecords: salaryData.length,
          logsSaved: logs.length,
        },
      };
    } catch (error) {
      logger.error(`Salary upload failed: ${error.message || 'Unknown error'}`);

      logsAndErrorHandling('SalaryUploadService - bulkInsert', error, {
        salaryFileDto,
      });
    }
  }

  // Utility function to extract cell text
  getCellText(cell: any): string {
    if (!cell) return '';

    // If the cell is an object, check for hyperlink or richText
    if (typeof cell === 'object') {
      if (cell.hyperlink) {
        // If hyperlink exists, extract the email from it
        return cell.hyperlink.replace('mailto:', '').trim();
      }
      if (cell.text) {
        // If rich text, extract the text value
        return typeof cell.text === 'string' ? cell.text.trim() : '';
      }
    }

    // Default conversion for normal cell values
    return cell.toString().trim();
  }

  private async fetchFileFromS3(key: string): Promise<Buffer> {
    const fileBuffer = await this.awsService.fetchFileFromS3(key);
    if (!fileBuffer) {
      throw new Error('Failed to fetch file from S3');
    }
    return fileBuffer;
  }

  private async parseFile(key: string, fileBuffer: Buffer): Promise<any[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in uploaded file');
      }

      const rawData: any[] = [];
      // Assume the first row is the header row
      const headerRow = worksheet.getRow(1);

      // Iterate over all rows starting from the second row
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const record: any = {};
        row.eachCell((cell, colNumber) => {
          const header = this.getCellText(headerRow.getCell(colNumber).value);
          if (!header) return;
          record[header] = this.getCellText(cell.value);
        });
        rawData.push(record);
      });

      if (rawData.length === 0) {
        throw new Error('Uploaded file is empty');
      }

      return rawData;
    } catch (error) {
      throw new BadRequestException('Failed To Parse File', error);
    }
  }

  private normalizeData(rawData: any[]): any[] {
    return rawData.map((record) =>
      Object.fromEntries(
        Object.entries(record).map(([key, value]) => [
          this.getCellText(key.trim().toLowerCase()),
          this.getCellText(value),
        ]),
      ),
    );
  }

  private async processRecords(
    salaryData: any[],
    fileName: string,
  ): Promise<FileUploadLogs[]> {
    try {
      const logs: FileUploadLogs[] = [];

      for (const record of salaryData) {
        const email = this.getCellText(record?.email);
        const salary = record?.salary;
        if (!email) continue;

        const user = await this.userRepository.findOne({ where: { email } });

        const log = new FileUploadLogs();
        log.email = email;
        log.fileName = fileName;

        if (!user) {
          log.status = UploadStatus.USER_NOT_FOUND;
        } else if (!user.status) {
          log.status = UploadStatus.USER_INACTIVE;
          log.empId = user?.userId;
          log.name = user?.name;
          log.user = user;
        } else {
          user.salary = salary && this.configService.encryptData(salary);
          await this.userRepository.save(user);
          log.status = UploadStatus.SUCCESSFUL;
          log.empId = user?.userId;
          log.name = user?.name;
          log.user = user;
        }
        logs.push(log);
      }

      return logs;
    } catch (error) {
      throw new BadRequestException('Failed To Process Salary', error);
    }
  }

  async findAllLogs(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    dateFrom?: string,
    dateTo?: string,
    status?: string,
  ) {
    try {
      const { whereConditions, order } = this.buildLogsQueryContext({
        search,
        sortBy,
        dateFrom,
        dateTo,
        status,
      });

      const [logs, total] = await this.uploadLogsRepository.findAndCount({
        where: whereConditions,
        skip: (page - 1) * limit,
        take: limit,
        order,
      });

      const formattedLogs = logs.map((log) => ({
        ...log,
        createdAt: log.createdAt
          ? formatInTimeZone(log.createdAt, IST_TIME_ZONE, LISTING_DATE_FORMAT)
          : null,
      }));

      return {
        message:
          formattedLogs.length > 0
            ? 'Logs Retrieved Successfully'
            : 'No logs found for the given criteria.',
        data: {
          logs: formattedLogs,
          total,
          currentPage: page,
          totalPages: logs.length > 0 ? Math.ceil(total / limit) : 0,
        },
      };
    } catch (error) {
      logger.error(error, 'failed to get logs');
      logsAndErrorHandling('SalaryUploadService-findAllLogs', error, {
        page,
        limit,
        search,
        sortBy,
        dateFrom,
        dateTo,
        status,
      });
    }
  }

  private buildLogsQueryContext({
    search,
    sortBy,
    dateFrom,
    dateTo,
    status,
  }: {
    search?: string;
    sortBy?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    const order = this.buildOrder(sortBy);
    const whereConditions = this.buildWhereConditions({
      search,
      dateFrom,
      dateTo,
      status,
    });

    return { whereConditions, order };
  }

  private buildOrder(sortBy?: string) {
    let order: any = sortBy ? {} : { createdAt: 'DESC' };

    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      if (
        field &&
        direction &&
        ['asc', 'desc'].includes(direction.toLowerCase())
      ) {
        order = { [field]: direction.toUpperCase() };
      } else {
        throw new BadRequestException(
          'Invalid sortBy format. Use "field:asc" or "field:desc".',
        );
      }
    }

    return order;
  }

  private buildWhereConditions({
    search,
    dateFrom,
    dateTo,
    status,
  }: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    // validate status
    const validStatuses = ['successful', 'unsuccessful'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      throw new BadRequestException(
        `Invalid status filter. Allowed values: ${validStatuses.join(', ')}`,
      );
    }

    let whereConditions: any = {};

    // Search Condition
    if (search) {
      whereConditions = [
        { email: ILike(`%${search}%`) },
        { name: ILike(`%${search}%`) },
      ];
    }

    // Date Range Condition
    if (dateFrom && dateTo) {
      whereConditions.createdAt = Between(new Date(dateFrom), new Date(dateTo));
    }

    // Status filter (must preserve array vs object behavior)
    if (status) {
      if (Array.isArray(whereConditions)) {
        whereConditions.forEach((condition) => {
          condition.status =
            status.toLowerCase() === 'successful'
              ? 'Successful'
              : Not('Successful');
        });
      } else {
        whereConditions.status =
          status.toLowerCase() === 'successful'
            ? 'Successful'
            : Not('Successful');
      }
    }

    return whereConditions;
  }

  async sampleExcel() {
    return {
      message: 'sample File fetched successfully',
      data: {
        s3Path: 'salaries/78259Sample_Salary.xlsx',
      },
    };
  }
}
