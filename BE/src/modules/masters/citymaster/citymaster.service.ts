import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CityMaster } from './entities/cityMaster.entity';
import { logger } from 'src/logger/logger';

@Injectable()
export class CityMasterService {
  constructor(
    @InjectRepository(CityMaster)
    private readonly cityMasterRepository: Repository<CityMaster>,
  ) {}

  async findAll(brandIds?: number[]): Promise<any> {
    try {
      const whereCondition =
        brandIds && brandIds.length > 0 ? { brands: { id: In(brandIds) } } : {};
      const cities = await this.cityMasterRepository.find({
        where: whereCondition,
      });

      return {
        message: cities.length
          ? 'Cities fetched successfully.'
          : 'No Cities found.',
        data: { cities },
      };
    } catch (error) {
      logger.error(`Failed to fetch cities, ${error}`);
      throw new InternalServerErrorException('Failed to fetch cities.');
    }
  }
}
