import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Regions } from './entities/region.entities';
import { Repository } from 'typeorm';
import { CreateUpdateRegionDto } from './dto/create-update-region.dto';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { logger } from '@sentry/core';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(Regions)
    private readonly regionRepository: Repository<Regions>,
  ) {}

  /**
   * Create a new Region
   *
   */
  async create(createDto: CreateUpdateRegionDto) {
    try {
      const existing = await this.regionRepository.findOne({
        where: { name: createDto.name },
      });

      if (existing) {
        throw new BadRequestException('Region with this name already exists.');
      }

      const region = this.regionRepository.create({
        name: createDto.name,
      });

      const saved = await this.regionRepository.save(region);
      return {
        message: 'Region created successfully.',
        data: { id: saved?.id },
      };
    } catch (error) {
      logger.error('Error creating region:', error);
      logsAndErrorHandling('RegionService - create', error, { createDto });
    }
  }

  /**
   * Find all Regions with pagination, search, and sorting
   *
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
  }) {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 20;
      const skip = (page - 1) * limit;

      const qb = this.regionRepository.createQueryBuilder('region');

      // filter out soft deleted records by default
      qb.where('region.is_deleted = :isDeleted', { isDeleted: false });

      if (options?.search) {
        qb.andWhere('region.name LIKE :search', {
          search: `%${options.search.trim()}%`,
        });
      }

      if (!options?.sortBy) {
        qb.orderBy('region.created_at', 'DESC');
      } else {
        const [field, dir] = options.sortBy.split(':');
        const direction = dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        // defensively allow only known fields
        if (['name', 'created_at', 'updated_at'].includes(field)) {
          qb.orderBy(`region.${field}`, direction);
        } else {
          qb.orderBy('region.created_at', 'DESC');
        }
      }

      qb.take(limit).skip(skip);

      const [items, total] = await qb.getManyAndCount();

      return {
        message: 'Regions fetched successfully.',
        data: {
          regions: items,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching regions:', error);
      logsAndErrorHandling('RegionService - findAll', error, { options });
    }
  }

  /**
   * Find a Region by ID
   *
   */
  async findOne(id: number) {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new BadRequestException(
          'Invalid ID. ID must be a positive number.',
        );
      }
      const region = await this.regionRepository.findOne({
        where: { id, isDeleted: false },
      });
      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found.`);
      }
      return {
        message: 'Region fetched successfully.',
        data: { id: region?.id, name: region?.name },
      };
    } catch (error) {
      logger.error('Error fetching region by ID:', error);
      logsAndErrorHandling('RegionService - findOne', error, { id });
    }
  }

  /**
   * Update a Region by ID
   *
   */
  async update(id: number, dto: CreateUpdateRegionDto) {
    try {
      const region = await this.regionRepository.findOne({ where: { id } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found.`);
      }

      if (dto.name && dto.name !== region.name) {
        // optional: ensure unique name
        const exists = await this.regionRepository.findOne({
          where: { name: dto.name },
        });
        if (exists && exists.id !== id) {
          throw new BadRequestException(
            'Region with this name already exists.',
          );
        }
      }

      Object.assign(region, dto);
      const saved = await this.regionRepository.save(region);
      return {
        message: 'Region updated successfully.',
        data: { id: saved?.id },
      };
    } catch (error) {
      logger.error('Error updating region:', error);
      logsAndErrorHandling('RegionService - update', error, { id, dto });
    }
  }

  /**
   * Soft delete a Region by ID
   *
   */
  async softDelete(id: number) {
    try {
      const region = await this.regionRepository.findOne({ where: { id } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found.`);
      }
      if (region.isDeleted) {
        return { message: 'Region already deleted.' };
      }
      region.isDeleted = true;
      region.deletedAt = new Date();
      await this.regionRepository.save(region);
      return { message: 'Region deleted successfully.', data: { id } };
    } catch (error) {
      logger.error('Error soft deleting region:', error);
      logsAndErrorHandling('RegionService - softDelete', error, { id });
    }
  }

  /**
   * Return lightweight list for dropdowns: [{ id, name }]
   * Filters out soft-deleted records (isDeleted = true).
   */
  async getDropdown(): Promise<{
    message: string;
    data: { id: number; name: string }[];
  }> {
    try {
      const regions = await this.regionRepository.find({
        where: { isDeleted: false },
        select: ['id', 'name'],
        order: { name: 'ASC' },
      });

      return {
        message: 'Regions dropdown fetched successfully.',
        data: regions.map((r) => ({ id: r.id, name: r.name })),
      };
    } catch (error) {
      logger.error('Error fetching regions for dropdown:', error);
      logsAndErrorHandling('IncentivePolicyService - findOne', error, {});
    }
  }
}
