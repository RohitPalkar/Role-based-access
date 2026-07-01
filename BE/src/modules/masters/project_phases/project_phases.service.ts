import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, Not } from 'typeorm';
import { logger } from '../../../logger/logger';
import { Brands, CityMaster, ProjectPhase } from '../../../entities/index';
import { UpdateProjectPhaseDto } from './dtos/update-project-phase.dto';
import { formatDateUtil } from 'src/helpers/date.helper';
import { endOfDay, startOfDay } from 'date-fns';
import { CreatePhaseDto } from './dtos/create-phase.dto';
import { UpdatePhaseDto } from './dtos/update-phase.dto';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class ProjectPhasesService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,
    @InjectRepository(Brands)
    private readonly brandRepository: Repository<Brands>,
    @InjectRepository(CityMaster)
    private readonly cityRepository: Repository<CityMaster>,
    private readonly configService: CustomConfigService,
  ) {}

  async findProjectPhasesList(
    page: number,
    limit: number,
    brandId?: number,
    cityIds?: number[],
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      const whereConditions: any = {};

      // Filter by brandId
      if (brandId) {
        whereConditions.brand = { id: brandId };
      }

      // Filter by cityIds
      if (cityIds) {
        whereConditions.city = { id: In(cityIds) };
      }

      // Filter by search
      if (search) {
        whereConditions.name = ILike(`%${search}%`);
      }

      const [phases, total] = await this.projectPhaseRepository.findAndCount({
        where: whereConditions,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
        relations: ['brand', 'city', 'project'],
      });

      const formattedPhases = phases?.map(
        ({
          skipLaunch,
          launchStartDate,
          launchEndDate,
          project,
          brand,
          city,
          sustenanceDate,
          possessionDate,
          razorpayBookingmid,
          razorpayMilestonemid,
          ...rest
        }) => {
          const format = (date?: Date) =>
            date ? formatDateUtil(date, 'display') : null;

          return {
            ...rest,
            project: project?.name || null,
            brand: brand?.name || null,
            city: city?.name || null,
            isLaunch: !skipLaunch,
            isSustenance: true,
            launchDateRange:
              launchStartDate && launchEndDate
                ? `${format(launchStartDate)} to ${format(launchEndDate)}`
                : null,
            launchStartDate: format(launchStartDate),
            launchEndDate: format(launchEndDate),
            sustenanceDate: format(sustenanceDate),
            possessionDate: format(possessionDate),
            razorpayBookingmid: this.decrypt(razorpayBookingmid),
            razorpayMilestonemid: this.decrypt(razorpayMilestonemid),
          };
        },
      );

      return {
        message:
          phases.length > 0
            ? 'Data Fetch Successfully'
            : 'No Project Phases Found',
        data: {
          phases: formattedPhases,
          total,
          limit,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch project phases for brandId ${brandId} and cityIds ${cityIds}: ${error.message}`,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  private decrypt(value: string) {
    return value ? this.configService.decryptData(value) : null;
  }

  async findProjectPhaseById(id: number) {
    try {
      if (id && isNaN(id)) {
        throw new BadRequestException(
          'Invalid projectId. It must be a number.',
        );
      }

      const projectPhase = await this.projectPhaseRepository.findOne({
        where: { id },
        relations: ['brand', 'city'],
      });

      if (!projectPhase) {
        throw new NotFoundException(`Project Phase with ID ${id} not found.`);
      }

      const formattedPhase = {
        ...projectPhase,
        launchStartDate: projectPhase.launchStartDate
          ? formatDateUtil(projectPhase.launchStartDate, 'display')
          : null,
        launchEndDate: projectPhase.launchEndDate
          ? formatDateUtil(projectPhase.launchEndDate, 'display')
          : null,
        sustenanceDate: projectPhase.sustenanceDate
          ? formatDateUtil(projectPhase.sustenanceDate, 'display')
          : null,
        razorpayBookingmid: this.decrypt(projectPhase.razorpayBookingmid),
        razorpayMilestonemid: this.decrypt(projectPhase.razorpayMilestonemid),
      };

      return {
        message: 'Phase fetched successfully.',
        data: formattedPhase,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch project.');
    }
  }

  async updateProjectPhase(id: number, dto: UpdateProjectPhaseDto) {
    try {
      let { launchStartDate, launchEndDate, sustenanceDate } = dto;
      const { skipLaunch } = dto;
      if (id && isNaN(id)) {
        throw new BadRequestException('Invalid ID. It must be a number.');
      }
      const phase = await this.projectPhaseRepository.findOne({
        where: { id },
      });

      if (!phase) {
        throw new NotFoundException(`Project Phase with ID ${id} not found.`);
      }

      sustenanceDate = sustenanceDate
        ? startOfDay(sustenanceDate)
        : phase.sustenanceDate;
      launchStartDate =
        launchStartDate && !skipLaunch ? startOfDay(launchStartDate) : null;
      launchEndDate =
        launchEndDate && !skipLaunch ? endOfDay(launchEndDate) : null;

      const updatedPhase = this.projectPhaseRepository.merge(phase, {
        skipLaunch,
        sustenanceDate,
        launchStartDate,
        launchEndDate,
      });
      await this.projectPhaseRepository.save(updatedPhase);

      return {
        message: 'Phase updated successfully',
        data: { id },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update project.');
    }
  }

  /**
   * Creates a new project phase after validating brand, city, and ensuring
   * the phase name is unique across the system.
   */
  async createProject(createProjectDto: CreatePhaseDto) {
    try {
      const { brandId, cityId } = createProjectDto;

      // check brand
      const brand = await this.brandRepository.findOne({
        where: { id: brandId },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with id ${brandId} not found`);
      }

      // check city
      const city = await this.cityRepository.findOne({
        where: { id: cityId },
      });

      if (!city) {
        throw new NotFoundException(`City with id ${cityId} not found`);
      }

      const existingPhase = await this.projectPhaseRepository.findOne({
        where: { name: createProjectDto.name },
      });

      if (existingPhase) {
        throw new ConflictException(
          `Project phase '${createProjectDto.name}' already exists.`,
        );
      }

      const project = this.projectPhaseRepository.create({
        brand: { id: brandId },
        city: { id: cityId },
        name: createProjectDto.name,
        region: createProjectDto.regionId,
        sapPhaseName: createProjectDto.sapPhaseName,
        easebuzzBookingmid: createProjectDto.easebuzzBookingmid,
        easebuzzMilestonemid: createProjectDto.easebuzzMilestonemid,
        blockNames: createProjectDto.blockNames,
        sfdcPhaseName: createProjectDto.sfdcPhaseName,
        possessionDate: createProjectDto.possessionDate
          ? startOfDay(createProjectDto.possessionDate)
          : null,
        razorpayBookingmid:
          createProjectDto.razorpayBookingmid &&
          this.configService.encryptData(createProjectDto.razorpayBookingmid),

        razorpayMilestonemid:
          createProjectDto.razorpayMilestonemid &&
          this.configService.encryptData(createProjectDto.razorpayMilestonemid),
      });

      await this.projectPhaseRepository.save(project);
      return {
        success: true,
        message: 'Project phase created successfully.',
        data: project,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      logger.error('Error creating phase:', error);
      throw new InternalServerErrorException(
        `Failed to create project.${error?.message}`,
      );
    }
  }

  /**
   * Updates an existing project phase by id after validating provided fields
   * and ensuring the updated phase name does not conflict with existing records.
   */
  async updatePhase(id: number, updateProjectDto: UpdatePhaseDto) {
    try {
      const phase = await this.projectPhaseRepository.findOne({
        where: { id },
      });

      if (!phase) {
        throw new NotFoundException(`Project phase with id ${id} not found`);
      }

      // check brand if provided
      if (updateProjectDto.brandId) {
        const brand = await this.brandRepository.findOne({
          where: { id: updateProjectDto.brandId },
        });

        if (!brand) {
          throw new NotFoundException(
            `Brand with id ${updateProjectDto.brandId} not found`,
          );
        }

        phase.brand = brand;
      }

      // check city if provided
      if (updateProjectDto.cityId) {
        const city = await this.cityRepository.findOne({
          where: { id: updateProjectDto.cityId },
        });

        if (!city) {
          throw new NotFoundException(
            `City with id ${updateProjectDto.cityId} not found`,
          );
        }

        phase.city = city;
      }
      if (updateProjectDto.name && updateProjectDto.name !== phase.name) {
        const existingPhase = await this.projectPhaseRepository.findOne({
          where: {
            name: updateProjectDto.name,
            id: Not(id),
          },
        });

        if (existingPhase) {
          throw new ConflictException(
            `Project phase '${updateProjectDto.name}' already exists.`,
          );
        }

        phase.name = updateProjectDto.name;
      }

      const fieldsToUpdate = [
        'regionId',
        'sapPhaseName',
        'easebuzzBookingmid',
        'easebuzzMilestonemid',
        'sfdcPhaseName',
        'blockNames',
        'possessionDate',
        'razorpayBookingmid',
        'razorpayMilestonemid',
      ];
      fieldsToUpdate.forEach((field) => {
        if (updateProjectDto[field] !== undefined) {
          if (field === 'regionId') {
            phase.region = updateProjectDto.regionId;
          } else if (field === 'possessionDate') {
            phase.possessionDate = updateProjectDto.possessionDate
              ? startOfDay(updateProjectDto.possessionDate)
              : null;
          } else if (
            field === 'razorpayBookingmid' ||
            field === 'razorpayMilestonemid'
          ) {
            phase[field] = updateProjectDto[field]
              ? this.configService.encryptData(updateProjectDto[field])
              : null;
          } else {
            phase[field] = updateProjectDto[field];
          }
        }
      });
      await this.projectPhaseRepository.save(phase);

      return {
        message: 'Project phase updated successfully.',
      };
    } catch (error) {
      logger.error(`Failed to update project phase with id ${id}`);
      throw new InternalServerErrorException(
        `Failed to update project phase. ${error?.message}`,
      );
    }
  }
}
