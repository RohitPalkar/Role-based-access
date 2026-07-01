import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyMaster } from './entities/company_master.entity';
import { logger } from 'src/logger/logger';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { SUCCESS } from 'src/config/constants';

@Injectable()
export class CompanyMasterService {
  constructor(
    @InjectRepository(CompanyMaster)
    private readonly repo: Repository<CompanyMaster>,
  ) {}

  async getAllCompanies(search?: string) {
    try {
      logger.info(`Fetching active companies with search="${search ?? ''}"`);

      const qb = this.repo
        .createQueryBuilder('c')
        .select(['c.id', 'c.name'])
        .where('c.isActive = :isActive', { isActive: true });

      if (search?.trim().length > 0) {
        qb.andWhere('c.name LIKE :s', { s: `%${search.trim()}%` });
      }

      qb.orderBy('c.name', 'ASC');

      const companies = await qb.getMany();

      logger.info(`Companies fetched successfully: total=${companies.length}`);

      return {
        statusCode: SUCCESS,
        message: 'Companies fetched',
        data: companies,
      };
    } catch (error) {
      logger.error('Error fetching companies:', error);
      logsAndErrorHandling('get-all-companies', error, { search });
    }
  }
}
