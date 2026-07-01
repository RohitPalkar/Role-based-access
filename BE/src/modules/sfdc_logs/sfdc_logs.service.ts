import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SfdcLogs } from './entities/sfdc_logs.entity';
import { Repository } from 'typeorm';
import { logger } from 'src/logger/logger';
import { SaveSFDCLogsPayload } from './interfaces/save-logs.interface';
import { LogFindAllQueryDto } from './dto/logs_filter.dto';

@Injectable()
export class SfdcLogsService {
  constructor(
    @InjectRepository(SfdcLogs)
    private readonly sfdcLogsRepository: Repository<SfdcLogs>,
  ) {}

  //To save SFDC Logs
  async saveSFDCLogs(sfdcLogs: SaveSFDCLogsPayload): Promise<void> {
    try {
      this.sfdcLogsRepository.create(sfdcLogs);
      await this.sfdcLogsRepository.save(sfdcLogs);
    } catch (error) {
      logger.error('Failed to save logs:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to save logs: ${error?.message}`,
      );
    }
  }

  async getSfdcLogs(queryDto: LogFindAllQueryDto): Promise<any> {
    try {
      const { page, limit, search, logEvent, logStatus, sortBy } = queryDto;
      let sortField = 'createdAt';
      let sortDirection: 'ASC' | 'DESC' = 'DESC';

      if (sortBy) {
        const [field, direction] = sortBy.split(':');

        const sortFieldMap = {
          status: 'status',
          logEvent: 'logEvent',
          createdAt: 'createdAt',
          opportunityId: 'opportunityId',
        };

        if (sortFieldMap[field]) {
          sortField = sortFieldMap[field];
          sortDirection = direction?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        }
      }
      const options: any = {
        select: {
          id: true,
          opportunityId: true,
          logEvent: true,
          status: true,
          createdAt: true,
        },
        order: {
          [sortField]: sortDirection,
        },
        skip: (page - 1) * limit,
        take: limit,
        where: {},
      };

      if (search) {
        options.where.opportunityId = search;
      }

      if (logEvent) {
        options.where.logEvent = logEvent;
      }

      if (logStatus) {
        options.where.status = logStatus;
      }

      const [logs, total] = await this.sfdcLogsRepository.findAndCount(options);
      return {
        message: 'SFDC logs fetched successfully.',
        data: {
          logs,
          total,
          limit,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get logs:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get logs: ${error?.message}`,
      );
    }
  }

  async getSfdcLogById(logId: number): Promise<any> {
    try {
      const response = await this.sfdcLogsRepository.findOne({
        where: { id: logId },
        select: {
          id: true,
          opportunityId: true,
          status: true,
          payload: true,
          response: true,
          createdAt: true,
        },
      });
      return {
        message: 'SFDC log fetched successfully.',
        data: response,
      };
    } catch (error) {
      logger.error('Failed to get logs:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get logs: ${error?.message}`,
      );
    }
  }
}
