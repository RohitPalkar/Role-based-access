import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Brands } from './entities/brand.entity';
import { logger } from '../../../logger/logger';
import { Users } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { UpdateBrandDto } from './dto/update_brand.dto';
import { isMissing } from 'src/utils/slabsValidations';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { CustomConfigService } from 'src/config/custom-config.service';
import { safeNumber } from 'src/helpers/number-transform';
import { safeString } from 'src/helpers';
@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brands)
    private readonly brandsRepository: Repository<Brands>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly configService: CustomConfigService,
  ) {}

  //needd to add BIS
  async findAll(
    user: any,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
  ) {
    try {
      const whereCondition: any = search ? { name: Like(`%${search}%`) } : {};

      // **If user is not an admin, check project and brand mapping**
      if (
        user.role !== RolesEnum.SUPER_ADMIN &&
        user.role !== RolesEnum.ADMIN &&
        user.role !== RolesEnum.MIS &&
        user.role !== RolesEnum.BIS
      ) {
        // **Step 1: Check if user has a mapped project**
        const userRecord = await this.userRepository.findOne({
          where: { userName: user?.username },
          relations: ['project', 'project.brand', 'brand'], // Fetch project, project brand, and user brand
        });
        if (userRecord?.project?.brand) {
          // **If the user has a mapped project, return that project's brand**
          return {
            message: `User's brand based on mapped project.`,
            data: {
              brands: [
                {
                  id: userRecord?.project?.brand?.id,
                  name: userRecord?.project?.brand?.name,
                  logo: userRecord?.project?.brand?.logo,
                },
              ],
              total: 1,
            },
          };
        }

        // **Step 2: If no mapped project, check brand associated with user**
        if (!userRecord?.brand) {
          return {
            message: `No brand associated with this user ${userRecord?.id}.`,
            data: { brands: [], total: 0 },
          };
        }
        whereCondition.id = userRecord.brand.id;
      }

      // **Sorting logic**
      let order: any = {};
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        if (
          field &&
          direction &&
          (direction === 'asc' || direction === 'desc')
        ) {
          order = { [field]: direction.toUpperCase() };
        } else {
          throw new BadRequestException(
            'Invalid sortBy format. Use "field:asc" or "field:desc".',
          );
        }
      }

      // **Fetch brands normally if user is admin or based on assigned brand**
      const [brands, total] = await this.brandsRepository.findAndCount({
        where: whereCondition,
        relations: ['cities'],
        skip: (page - 1) * limit,
        take: limit,
        order,
      });

      const brandNames = brands?.map((brand) => ({
        id: brand.id,
        name: brand.name,
        logo: brand.logo ?? null,
        salarymultiplier: brand.salaryMultiplier,
        reraRegularization:
          brand.reraRegularization == 0 ? null : brand.reraRegularization,
        reraPayable: brand.reraPayable == 0 ? null : brand.reraPayable,
        rtmRegularization:
          brand.rtmRegularization == 0 ? null : brand.rtmRegularization,
        rtmPayable: brand.rtmPayable == 0 ? null : brand.rtmPayable,
        maxQualificationDays: brand.maxQualificationDays ?? null,
        razorpayKey: brand?.razorpayKey
          ? this.configService.decryptData(brand.razorpayKey)
          : null,

        razorpaySecret: brand?.razorpaySecret
          ? this.configService.decryptData(brand.razorpaySecret)
          : null,

        easebuzzBookingSalt: brand?.easebuzzBookingSalt
          ? this.configService.decryptData(brand.easebuzzBookingSalt)
          : null,

        easebuzzBookingKey: brand?.easebuzzBookingKey
          ? this.configService.decryptData(brand.easebuzzBookingKey)
          : null,

        easebuzzBookingmid: brand?.easebuzzBookingmid
          ? this.configService.decryptData(brand.easebuzzBookingmid)
          : null,

        easebuzzMilestoneSalt: brand?.easebuzzMilestoneSalt
          ? this.configService.decryptData(brand.easebuzzMilestoneSalt)
          : null,

        easebuzzMilestoneKey: brand?.easebuzzMilestoneKey
          ? this.configService.decryptData(brand.easebuzzMilestoneKey)
          : null,

        easebuzzMilestonemid: brand?.easebuzzMilestonemid
          ? this.configService.decryptData(brand.easebuzzMilestonemid)
          : null,
      }));

      return {
        message: brands.length
          ? 'Brands fetched successfully.'
          : 'No brands found.',
        data: { brands: brandNames, total },
      };
    } catch (error) {
      logger.error('Failed to fetch brand names', error);
      logsAndErrorHandling('brandService', 'findAll', error);
    }
  }

  async findAllBrands(): Promise<any> {
    try {
      const [brands, total] = await this.brandsRepository.findAndCount();
      return {
        message: brands.length
          ? 'Brands fetched successfully.'
          : 'No brands found.',
        data: { brands, total },
      };
    } catch (error) {
      logger.error(`error in finding all brands ${error}`);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch all brands.');
    }
  }

  async getBrandById(id: number): Promise<any> {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new BadRequestException(
          'Invalid ID provided. ID must be a positive number.',
        );
      }

      const brand = await this.brandsRepository.findOne({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found.`);
      }

      const formattedData = this.formatBrandResponse(brand);

      return {
        message: 'Brand fetched successfully.',
        data: formattedData,
      };
    } catch (error) {
      logger.error(`Failed to fetch Brand with ID: ${id}`, error);
      throw error instanceof BadRequestException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Failed to fetch Brand.');
    }
  }

  private formatBrandResponse(brand: Brands) {
    return {
      id: brand.id,
      name: brand.name,
      logo: safeString(brand.logo, null),
      salaryMultiplier: safeNumber(brand.salaryMultiplier, null),
      reraRegularization:
        brand.reraRegularization == 0 ? null : brand.reraRegularization,
      reraPayable: brand.reraPayable == 0 ? null : brand.reraPayable,
      rtmRegularization:
        brand.rtmRegularization == 0 ? null : brand.rtmRegularization,
      rtmPayable: brand.rtmPayable == 0 ? null : brand.rtmPayable,
      maxQualificationDays: safeNumber(brand.maxQualificationDays, null),
      razorpayKey: brand?.razorpayKey
        ? this.configService.decryptData(brand.razorpayKey)
        : null,

      razorpaySecret: brand?.razorpaySecret
        ? this.configService.decryptData(brand.razorpaySecret)
        : null,

      easebuzzBookingSalt: brand?.easebuzzBookingSalt
        ? this.configService.decryptData(brand.easebuzzBookingSalt)
        : null,

      easebuzzBookingKey: brand?.easebuzzBookingKey
        ? this.configService.decryptData(brand.easebuzzBookingKey)
        : null,

      easebuzzBookingmid: brand?.easebuzzBookingmid
        ? this.configService.decryptData(brand.easebuzzBookingmid)
        : null,

      easebuzzMilestoneSalt: brand?.easebuzzMilestoneSalt
        ? this.configService.decryptData(brand.easebuzzMilestoneSalt)
        : null,

      easebuzzMilestoneKey: brand?.easebuzzMilestoneKey
        ? this.configService.decryptData(brand.easebuzzMilestoneKey)
        : null,

      easebuzzMilestonemid: brand?.easebuzzMilestonemid
        ? this.configService.decryptData(brand.easebuzzMilestonemid)
        : null,
    };
  }

  async updateBrand(id: number, updateDto: UpdateBrandDto): Promise<any> {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new BadRequestException('Invalid brand ID.');
      }

      if (updateDto.salaryMultiplier >= 99) {
        throw new BadRequestException(
          'Salary multiplier must be less than 99.',
        );
      }
      const brand = await this.brandsRepository.findOne({ where: { id } });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found.`);
      }

      brand.salaryMultiplier = safeNumber(updateDto.salaryMultiplier, null);
      brand.reraRegularization = !isMissing(updateDto.reraRegularization)
        ? parseFloat(updateDto.reraRegularization)
        : null;

      brand.reraPayable = !isMissing(updateDto.reraPayable)
        ? parseFloat(updateDto.reraPayable)
        : null;

      brand.rtmRegularization = !isMissing(updateDto.rtmRegularization)
        ? parseFloat(updateDto.rtmRegularization)
        : null;

      brand.rtmPayable = !isMissing(updateDto.rtmPayable)
        ? parseFloat(updateDto.rtmPayable)
        : null;

      if (updateDto?.maxQualificationDays !== undefined)
        brand.maxQualificationDays = updateDto.maxQualificationDays;

      const paymentFields = [
        'razorpayKey',
        'razorpaySecret',
        'easebuzzBookingSalt',
        'easebuzzBookingKey',
        'easebuzzBookingmid',
        'easebuzzMilestoneSalt',
        'easebuzzMilestoneKey',
        'easebuzzMilestonemid',
      ];

      paymentFields.forEach((field) => {
        if (updateDto[field] !== undefined) {
          brand[field] = updateDto[field]
            ? this.configService.encryptData(updateDto[field])
            : null;
        }
      });

      if (updateDto.logo !== undefined) {
        brand.logo = updateDto.logo;
      }

      await this.brandsRepository.save(brand);

      return {
        message: 'Brand updated successfully.',
      };
    } catch (error) {
      logger.error(`Failed to update Brand with ID: ${id}`, error);
      throw error instanceof BadRequestException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Failed to update Brand.');
    }
  }
}
