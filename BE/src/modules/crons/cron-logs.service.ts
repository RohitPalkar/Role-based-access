import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronLog } from './entity/cron-log.entity';
import { logger } from 'src/logger/logger';

@Injectable()
export class CronLogsService {
  constructor(
    @InjectRepository(CronLog)
    private readonly cronLogRepository: Repository<CronLog>,
  ) {}

  async saveLog(logData: Partial<CronLog>) {
    try {
      const log = this.cronLogRepository.create(logData);
      return await this.cronLogRepository.save(log);
    } catch (error) {
      logger.log(error);
    }
  }
}
