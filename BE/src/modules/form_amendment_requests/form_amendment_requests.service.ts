import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FormAmendmentRequest } from './entities/form_amendment_requests.entity';
import { Repository } from 'typeorm';
import { logger } from 'src/logger/logger';
import { CreateFormAmendmentRequestDto } from './dto/create-logs.dto';

@Injectable()
export class FormAmendmentRequestService {
  constructor(
    @InjectRepository(FormAmendmentRequest)
    private readonly formAmendmentRequestRepository: Repository<FormAmendmentRequest>,
  ) {}

  async getAmendmentRequest(oppId: string): Promise<any> {
    try {
      const [logs, count] =
        await this.formAmendmentRequestRepository.findAndCount({
          where: { opportunityId: oppId },
        });

      return {
        message: 'Form Amendment requests fetched successfully.',
        data: {
          count,
          logs,
        },
      };
    } catch (error) {
      logger.error('Failed to get request:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get request: ${error?.message}`,
      );
    }
  }

  async getAmendmentRequestById(requestId: number): Promise<any> {
    try {
      const data = await this.formAmendmentRequestRepository.findOne({
        where: { id: requestId },
      });

      if (!data)
        throw new NotFoundException(
          `Form Amendment request not found with ID: ${requestId}`,
        );

      return {
        message: 'Form Amendment request fetched successfully.',
        data: data,
      };
    } catch (error) {
      logger.error('Failed to get logs:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get logs: ${error?.message}`,
      );
    }
  }

  async createRequestLogs(
    createFormAmendmentRequestDto: CreateFormAmendmentRequestDto,
  ): Promise<any> {
    try {
      const newLog = this.formAmendmentRequestRepository.create(
        createFormAmendmentRequestDto,
      );

      const createdLog = await this.formAmendmentRequestRepository.save(newLog);
      logger.info(
        `Form Amendment request created successfully: ${createdLog.id}`,
      );

      return {
        message: 'Form Amendment request created successfully.',
        data: createdLog,
      };
    } catch (error) {
      logger.error('Failed to create log:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to create log: ${error?.message}`,
      );
    }
  }
}
