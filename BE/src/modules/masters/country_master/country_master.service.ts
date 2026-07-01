import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CountryMaster } from './entities/country_master.entity';
import { ListCountryMasterDto } from './dto/list-countries.dto';
import { logger } from 'src/logger/logger';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SUCCESS } from 'src/config/constants';

@Injectable()
export class CountryMasterService {
  private readonly CACHE_TTL_SECONDS = 60 * 5;
  constructor(
    @InjectRepository(CountryMaster)
    private readonly repo: Repository<CountryMaster>,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  private appendPaginationKeyParts(
    keyParts: string[],
    page?: number,
    limit?: number,
  ) {
    if (page) keyParts.push(`p${page}`);
    if (limit) keyParts.push(`l${limit}`);
  }

  async getAllCountries(dto: ListCountryMasterDto) {
    try {
      const { search, page, limit } = dto;
      logger.info(
        `Fetching countries with search="${search ?? ''}", page=${page ?? 'N/A'}, limit=${limit ?? 'N/A'}`,
      );

      const base = search
        ? search.trim().replace(/\s+/g, '_').toLowerCase()
        : 'all';
      const keyParts = [base];
      this.appendPaginationKeyParts(keyParts, page, limit);
      const cacheKey = `countries:${keyParts.join('_')}`;

      try {
        const cached = await this.cacheService.get<string | object>(cacheKey);
        if (cached) {
          logger.info(`Cache hit for key=${cacheKey}`);
          const cachedData =
            typeof cached === 'string' ? JSON.parse(cached) : cached;
          return {
            statusCode: SUCCESS,
            message: 'Countries fetched',
            data: cachedData,
          };
        }
        logger.info(`Cache miss for key=${cacheKey}`);
      } catch (cacheErr) {
        logger.warn(`Cache read error for key=${cacheKey}:`, cacheErr);
      }

      const qb = this.repo.createQueryBuilder('c');
      if (search && search.trim().length > 0) {
        const term = search.trim();
        logger.info(`Applying search filter: ${term}`);
        qb.where('(c.isoCode LIKE :s OR c.countryName LIKE :s)', {
          s: `%${term}%`,
        });
      }

      let payload: any;
      if (page && limit) {
        const offset = (page - 1) * limit;
        logger.info(`Applying pagination: limit=${limit}, offset=${offset}`);
        qb.take(limit).skip(offset);

        const [data, total] = await qb.getManyAndCount();
        payload = { countries: data, total, page, limit };
      } else {
        logger.info('Fetching all countries without pagination');
        const data = await qb.getMany();
        payload = { countries: data, total: data.length };
      }

      logger.info(`Countries fetched successfully: total=${payload.total}`);

      try {
        await this.cacheService.set(cacheKey, JSON.stringify(payload));
        logger.info(`Cached countries under key=${cacheKey} (no TTL)`);
      } catch (cacheSetErr) {
        logger.warn(`Failed to set cache for key=${cacheKey}:`, cacheSetErr);
      }

      return {
        statusCode: SUCCESS,
        message: 'Countries fetched',
        data: payload,
      };
    } catch (error) {
      logger.error('Error fetching countries:', error);
      logsAndErrorHandling('get-all-countries', error, dto);
    }
  }
}
