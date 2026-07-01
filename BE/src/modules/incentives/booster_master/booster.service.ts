import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateBoosterDto,
  PrizeType,
  ProjectValidationMessages,
} from './dto/create-booster.dto';
import { Projects } from '../../masters/projects/entities/project.entity';
import {
  BoosterIncentiveSlabs,
  Boosters,
  Group,
  Users,
} from '../../../entities/index';
import { Brackets, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { logger } from '../../../logger/logger';
import { UpdateBoosterDTO } from './dto/update-booster.dto';
import { FilterBoosterDTO } from './dto/filter-booster.dto';
import { NotificationService } from '../../notifications/notification.service';
import { StatusEnum } from 'src/enums/status.enum';
import { addYears, endOfDay, startOfDay, subYears } from 'date-fns';
import { RolesEnum } from 'src/enums/roles.enum';
import { updateBoosterStatuses } from './helper/deactivate-expired-boosters.helper';
import { formatDate } from 'src/utils';
import { DISPLAY_YEAR_MONTH_DATE } from 'src/config/constants';

type SortDir = 'ASC' | 'DESC';

interface SortSpec {
  field: string;
  dir: SortDir;
}
interface Pagination {
  take: number;
  skip: number;
}
@Injectable()
export class BoosterService {
  constructor(
    @InjectRepository(Boosters)
    private readonly boosterRepository: Repository<Boosters>,

    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    private readonly notificationService: NotificationService,
  ) {}

  async createBooster(createBoosterDto: CreateBoosterDto): Promise<any> {
    return await this.boosterRepository.manager.transaction(async (m) => {
      try {
        const {
          name,
          startDate,
          endDate,
          projects,
          boosterSlabs,
          groupId,
          brandId,
          cityIds,
        } = createBoosterDto;

        const group = await this.findGroupOrThrow(m, groupId);

        const { boosterStartDate, boosterEndDate } =
          this.validateAndComputeDatesForCreate(startDate, endDate);

        this.ensureProjectsProvided(projects);
        await this.checkBoosterNameUnique(m, name);

        const foundProjects = await this.findAndValidateProjectsShared(
          m,
          projects,
          brandId,
          cityIds,
          {
            messages: {
              notFound: (missing) =>
                `One or more projects not found: ${missing}`,
              cityMismatch: (invalid) =>
                `Projects belong to invalid cities: ${invalid.join(', ')}`,
            },
            normalizeCityIds: false, // create kept raw values
          },
        );

        // Create + save booster
        const booster = m.create(Boosters, {
          name,
          startDate: boosterStartDate,
          endDate: boosterEndDate,
          group,
          projects: foundProjects,
        });
        const savedBooster = await m.save(booster);

        // Slabs (sort + validations + log message)
        await this.saveSlabsIfAnyCreate(m, boosterSlabs, savedBooster);

        // Outside transaction behavior preserved (setImmediate, try/catch)
        this.scheduleBoosterNotifications(groupId, boosterSlabs);

        return { message: 'Booster added and mapped successfully.' };
      } catch (error) {
        logger.error('Error during booster creation transaction:', error);
        throw error;
      }
    });
  }

  async filterStatus() {
    const statusData = [
      {
        name: StatusEnum.INACTIVE,
      },
      {
        name: StatusEnum.ACTIVE,
      },
    ];
    return {
      message: 'data fetched successfully.',
      data: statusData,
    };
  }

  async findBoosters(filterBoosterDto: FilterBoosterDTO): Promise<any> {
    try {
      const {
        brandId,
        groupId,
        cityId,
        projectId,
        status,
        startDate,
        endDate,
        search,
        page,
        limit,
        sortBy,
      } = filterBoosterDto;

      await updateBoosterStatuses(this.boosterRepository);

      const pagination = this.getPagination(page, limit);
      const sort = this.parseSort(sortBy);

      const qb = this.baseQuery(pagination, sort);

      this.applyBasicFilters(qb, {
        brandId,
        groupId,
        cityId,
        projectId,
        status,
      });
      this.applyDateFilters(qb, startDate, endDate);
      this.applySearch(qb, search);

      const [boosters, total] = await qb.getManyAndCount();

      if (boosters.length === 0) {
        return this.emptyResult(page, limit, total);
      }

      const formattedBoosters = this.formatBoosters(boosters);

      return {
        message: 'Boosters fetched successfully',
        data: {
          boosters: formattedBoosters,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`error in finding boosters${error}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch boosters.');
    }
  }

  async findBoosterById(id: number): Promise<any> {
    try {
      // Validate ID
      if (!id || isNaN(id) || id <= 0) {
        logger.warn(`Invalid booster ID: ${id}`);
        throw new BadRequestException(
          'Invalid ID. ID must be a positive number.',
        );
      }

      // Fetch Booster with Related Data
      const booster = await this.boosterRepository.findOne({
        where: { id },
        relations: [
          'boosterSlabs',
          'projects',
          'projects.brand',
          'projects.city',
          'group',
        ],
      });

      if (!booster) {
        throw new NotFoundException(`Booster with ID ${id} not found.`);
      }

      // Extracting Brand and City from Projects
      const brands = new Map();
      const cities = new Map();

      booster.projects.forEach((project) => {
        if (project.brand) {
          brands.set(project.brand.id, project.brand.name);
        }
        if (project.city) {
          cities.set(project.city.id, project.city.name);
        }
      });

      // Format Response
      const formattedResponse = {
        id: booster?.id,
        name: booster?.name,
        group: { id: booster?.group?.id, name: booster?.group?.name },
        startDate: formatDate(
          booster?.startDate?.toISOString(),
          DISPLAY_YEAR_MONTH_DATE,
        ),
        endDate: formatDate(
          booster?.endDate?.toISOString(),
          DISPLAY_YEAR_MONTH_DATE,
        ),
        status: booster?.status,
        brand: brands ? Array.from(brands, ([id, name]) => ({ id, name })) : [],
        city: cities ? Array.from(cities, ([id, name]) => ({ id, name })) : [],
        projects:
          booster?.projects?.map((project) => ({
            id: project.id,
            name: project.name,
          })) ?? [],
        boosterSlabs:
          booster?.boosterSlabs?.map((slab) => ({
            id: slab.id,
            startRange: slab.startRange,
            endRange: slab.endRange,
            rewardType: slab.rewardType,
            rewardValue: slab.rewardValue,
          })) ?? [],
      };

      return {
        message: 'Booster fetched successfully.',
        data: formattedResponse,
      };
    } catch (error) {
      logger.error(`Error fetching Booster with ID ${id}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while fetching the Booster.',
      );
    }
  }

  async updateBooster(
    id: number,
    updateBoosterDto: UpdateBoosterDTO,
  ): Promise<any> {
    return await this.boosterRepository.manager.transaction(async (m) => {
      try {
        const existingBooster = await this.findBoosterOrThrow(m, id);

        const {
          name,
          startDate,
          endDate,
          projects,
          boosterSlabs,
          brandId,
          cityIds,
          groupId,
        } = updateBoosterDto;

        const group = await this.findGroupOrThrow(m, groupId);

        // Date bounds & validations
        const today = startOfDay(new Date());
        const threeYearsAgo = subYears(today, 3);
        const threeYearsLater = addYears(today, 3);

        this.validateStartDateIfProvided(
          startDate,
          existingBooster.startDate,
          threeYearsAgo,
        );

        const { newStartDate, newEndDate } = this.computeNewDates(
          startDate,
          endDate,
        );

        this.validateEndDateWindowIfProvided(
          !!startDate,
          !!endDate,
          newStartDate,
          newEndDate,
          threeYearsLater,
        );

        // Projects + brand/city validations
        const foundProjects = await this.findAndValidateProjectsShared(
          m,
          projects,
          brandId,
          cityIds,
          {
            messages: {
              notFound: (missing) =>
                `The following project IDs were not found: ${missing.join(', ')}`,
              cityMismatch: (_invalid, provided) =>
                `Please select projects belonging to the specified cities: ${provided.join(', ')}`,
            },
            normalizeCityIds: true,
          },
        );
        // Apply updates
        this.applyBoosterUpdates(
          existingBooster,
          group,
          name,
          newStartDate,
          newEndDate,
          foundProjects,
          today,
        );

        await m.save(existingBooster);

        // Slabs
        await this.saveSlabsIfAny(m, id, boosterSlabs, existingBooster);

        return { message: 'Booster updated successfully.' };
      } catch (error) {
        logger.error(`Error updating Booster with ID ${id}:`, error);
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new InternalServerErrorException(
          'An unexpected error occurred while updating the Booster.',
        );
      }
    });
  }

  async deleteBooster(id: number): Promise<any> {
    try {
      // Validate ID
      if (!id || isNaN(id) || id <= 0) {
        throw new BadRequestException(
          'Invalid ID. ID must be a positive number.',
        );
      }

      // Find the booster
      const booster = await this.boosterRepository.findOne({
        where: { id },
        relations: ['projects', 'boosterSlabs'],
      });

      if (!booster) {
        throw new NotFoundException(`Booster with ID ${id} not found.`);
      }

      // Unmap all related projects
      if (booster.projects.length > 0) {
        booster.projects = [];
        await this.boosterRepository.save(booster);
      }

      // Soft delete the booster
      await this.boosterRepository.softRemove(booster);

      return {
        message: `Booster with ID ${id} has been deleted successfully.`,
      };
    } catch (error) {
      logger.error(`Error deleting Booster with ID ${id}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while deleting the Booster.',
      );
    }
  }

  async findUnmappedProjects(boosterId: number): Promise<any> {
    try {
      // Validate Booster ID
      if (!boosterId || isNaN(boosterId) || boosterId <= 0) {
        throw new BadRequestException(
          'Invalid Booster ID. ID must be a positive number.',
        );
      }

      // Verify the booster exists
      const booster = await this.boosterRepository.findOne({
        where: { id: boosterId },
        relations: ['projects', 'boosterSlabs'],
      });

      if (!booster) {
        throw new NotFoundException(`Booster with ID ${boosterId} not found.`);
      }

      // Fetch unmapped projects
      const unmappedProjects = await this.projectRepository
        .createQueryBuilder('project')
        .leftJoin('project.boosters', 'b')
        .where('b.id IS NULL')
        .orderBy('project.createdAt', 'DESC')
        .getMany();

      // Fetch mapped projects
      const mappedProjects = await this.projectRepository
        .createQueryBuilder('project')
        .innerJoin('project.boosters', 'b')
        .where('b.id = :boosterId', { boosterId })
        .orderBy('project.createdAt', 'DESC')
        .getMany();

      return {
        message: 'Mapped and unmapped projects fetched successfully.',
        data: {
          unmappedProjects,
          mappedProjects,
        },
      };
    } catch (error) {
      logger.error(
        `Error fetching projects for Booster ID ${boosterId}:`,
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while fetching mapped and unmapped projects.',
      );
    }
  }

  async findAllRewards() {
    try {
      return {
        message: 'Rewards fetched successfully.',
        data: PrizeType,
      };
    } catch (error) {
      logger.error('Error in findAllRewards: ', error);
      throw new InternalServerErrorException('Failed to fetch rewards.');
    }
  }

  async getRMsByBrandCityAndProjectIdUsingFind(groupId: number) {
    try {
      // Fetch only user IDs (No need for full user object)
      const users = await this.userRepository.find({
        select: ['id'],
        relations: ['role', 'brand'],
        where: {
          status: StatusEnum.ACTIVE,
          role: {
            name: RolesEnum.RM,
          },
          group: {
            id: groupId,
          },
        },
      });
      return users.map((user) => ({ userId: user.id }));
    } catch (error) {
      logger.error(`Error fetching RMs for group ID ${groupId}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve RM data. Please try again later.',
      );
    }
  }

  // findAll boosters function helpers
  private getPagination(page: number, limit: number): Pagination {
    return { take: limit, skip: (page - 1) * limit };
  }

  private parseSort(sortBy?: string): SortSpec {
    let field = 'booster.createdAt';
    let dir: SortDir = 'DESC';

    if (!sortBy) return { field, dir };

    const [rawField, rawDir] = sortBy.split(':');
    const validFields = ['group', 'city', 'status', 'project'];

    if (!validFields.includes(rawField)) {
      throw new BadRequestException(
        `Invalid sort field "${rawField}". Allowed fields: ${validFields.join(', ')}.`,
      );
    }

    dir = rawDir?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    switch (rawField) {
      case 'group':
        field = 'group.name';
        break;
      case 'city':
        field = 'city.name';
        break;
      case 'status':
        field = 'booster.status';
        break;
      case 'project':
        field = 'project.name';
        break;
    }

    return { field, dir };
  }

  private baseQuery(pagination: Pagination, sort: SortSpec) {
    return this.boosterRepository
      .createQueryBuilder('booster')
      .leftJoinAndSelect('booster.projects', 'project')
      .leftJoinAndSelect('project.brand', 'brand')
      .leftJoinAndSelect('project.city', 'city')
      .leftJoinAndSelect('booster.group', 'group')
      .take(pagination.take)
      .skip(pagination.skip)
      .orderBy(sort.field, sort.dir)
      .addOrderBy('booster.createdAt', 'DESC');
  }

  private applyBasicFilters(
    qb: ReturnType<BoosterService['baseQuery']>,
    opts: {
      brandId?: number[];
      groupId?: number;
      cityId?: number;
      projectId?: number[];
      status?: string;
    },
  ) {
    const { brandId, groupId, cityId, projectId, status } = opts;

    if (groupId) qb.andWhere('group.id = :groupId', { groupId });
    if (brandId?.length) qb.andWhere('brand.id IN (:...brandId)', { brandId });
    if (cityId) qb.andWhere('city.id = :cityId', { cityId });
    if (projectId) qb.andWhere('project.id IN (:...projectId)', { projectId });
    if (status) qb.andWhere('booster.status = :status', { status });
  }

  private applyDateFilters(
    qb: ReturnType<BoosterService['baseQuery']>,
    startDate?: string | Date,
    endDate?: string | Date,
  ) {
    const boosterStartDate = startDate
      ? startOfDay(new Date(startDate))
      : undefined;
    const boosterEndDate = endDate ? endOfDay(new Date(endDate)) : undefined;

    if (boosterStartDate && boosterEndDate) {
      qb.andWhere(
        '(booster.startDate <= :boosterEndDate AND booster.endDate >= :boosterStartDate)',
        { boosterStartDate, boosterEndDate },
      );
      return;
    }

    if (boosterStartDate) {
      qb.andWhere('booster.startDate >= :boosterStartDate', {
        boosterStartDate,
      });
      return;
    }

    if (boosterEndDate) {
      qb.andWhere('booster.endDate <= :boosterEndDate', { boosterEndDate });
    }
  }

  private applySearch(
    qb: ReturnType<BoosterService['baseQuery']>,
    search?: string,
  ) {
    const term = search?.trim();
    if (!term) return;

    qb.andWhere(
      new Brackets((qb2) => {
        qb2
          .where('booster.name LIKE :search', { search: `%${term}%` })
          .orWhere('project.name LIKE :search', { search: `%${term}%` });
      }),
    );
  }

  private emptyResult(page: number, limit: number, total: number) {
    return {
      message: 'No boosters found for the given filters.',
      data: {
        boosters: [],
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private formatBoosters(
    boosters: Array<{ startDate?: Date; endDate?: Date; [k: string]: any }>,
  ) {
    return boosters.map(({ startDate, endDate, ...booster }) => ({
      id: booster?.id,
      name: booster?.name,
      group: { id: booster?.group?.id, name: booster?.group?.name },
      duration:
        startDate && endDate
          ? `${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}`
          : 'No Duration',
      status: booster?.status,
      projects: booster?.projects ?? [],
    }));
  }

  // update booster helpers
  private async findBoosterOrThrow(m: any, id: number) {
    const booster = await m.findOne(Boosters, {
      where: { id },
      relations: ['projects', 'boosterSlabs'],
    });
    if (!booster)
      throw new NotFoundException(`Booster with ID ${id} not found.`);

    return booster;
  }

  private async findGroupOrThrow(m: any, groupId: number) {
    const group = await m.findOne(Group, { where: { id: groupId } });
    if (!group)
      throw new NotFoundException(`Group with ID ${groupId} not found.`);

    return group;
  }

  private validateStartDateIfProvided(
    startDate: string | Date | undefined,
    existingStart: Date,
    threeYearsAgo: Date,
  ) {
    if (!startDate) return;

    const newStart = startOfDay(new Date(startDate));
    const prevStart = startOfDay(new Date(existingStart));

    if (newStart < threeYearsAgo)
      throw new BadRequestException(
        'Start Date cannot be more than 3 years in the past.',
      );

    if (prevStart > newStart)
      throw new BadRequestException(
        'Start Date cannot be less than previous Start Date.',
      );
  }

  private computeNewDates(startDate?: string | Date, endDate?: string | Date) {
    const newStartDate = startDate
      ? startOfDay(new Date(startDate))
      : undefined;
    const newEndDate = endDate ? endOfDay(new Date(endDate)) : undefined;
    return { newStartDate, newEndDate };
  }

  private validateEndDateWindowIfProvided(
    hasStart: boolean,
    hasEnd: boolean,
    newStartDate: Date | undefined,
    newEndDate: Date | undefined,
    threeYearsLater: Date,
  ) {
    if (!(hasStart && hasEnd)) return;

    if (newEndDate < newStartDate)
      throw new BadRequestException('End Date cannot be before Start Date.');

    if (newEndDate > threeYearsLater)
      throw new BadRequestException(
        'End Date cannot be more than 3 years in the future.',
      );
  }

  private applyBoosterUpdates(
    existingBooster: any,
    group: any,
    name: string | undefined,
    newStartDate: Date | undefined,
    newEndDate: Date | undefined,
    foundProjects: any[],
    today: Date,
  ) {
    existingBooster.group = group;
    existingBooster.name = name ?? existingBooster.name;
    existingBooster.startDate = newStartDate ?? existingBooster.startDate;
    existingBooster.endDate = newEndDate ?? existingBooster.endDate;
    existingBooster.projects = foundProjects;

    if (newEndDate) {
      existingBooster.status =
        newEndDate > today ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;
    }
  }

  private async saveSlabsIfAny(
    m: any,
    boosterId: number,
    boosterSlabs: any[] | undefined,
    existingBooster: any,
  ) {
    if (!boosterSlabs || !Array.isArray(boosterSlabs)) return;

    await m.delete(BoosterIncentiveSlabs, { booster: { id: boosterId } });

    const sorted = [...boosterSlabs].sort(
      (a, b) => a.startRange - b.startRange,
    );

    this.validateSlabFields(sorted);
    this.validateSlabAdjacency(sorted);

    const newSlabs = sorted.map((slabDto) =>
      m.create(BoosterIncentiveSlabs, {
        ...slabDto,
        booster: existingBooster,
      }),
    );

    await m.save(BoosterIncentiveSlabs, newSlabs);
  }

  private validateSlabFields(sorted: any[]) {
    sorted.forEach((slab, index) => {
      if (!slab.startRange || !slab.endRange || !slab.rewardType) {
        throw new BadRequestException(
          `Slab ${index + 1}: Missing required fields.`,
        );
      }
      if (slab.startRange >= slab.endRange) {
        throw new BadRequestException(
          `Slab ${index + 1}: End Range must be greater than Start Range.`,
        );
      }
    });
  }

  private validateSlabAdjacency(sorted: any[]) {
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      if (current.startRange === prev.endRange) {
        throw new BadRequestException(
          `Slab ${i + 1}: startRange (${current.startRange}) cannot be the same as endRange of previous slab (${prev.endRange}).`,
        );
      }
    }
  }

  //create booster helpers
  private validateAndComputeDatesForCreate(
    startDate: string | Date,
    endDate: string | Date,
  ) {
    const today = startOfDay(new Date());
    const boosterStartDate = startOfDay(new Date(startDate));
    const boosterEndDate = endOfDay(new Date(endDate));
    const threeYearsBack = subYears(today, 3);
    const threeYearsForward = addYears(today, 3);

    if (boosterStartDate < threeYearsBack) {
      throw new BadRequestException(
        'Start Date cannot be more than 3 years in the past.',
      );
    }
    if (boosterEndDate < boosterStartDate) {
      throw new BadRequestException('End Date cannot be before Start Date.');
    }
    if (boosterEndDate > threeYearsForward) {
      throw new BadRequestException(
        'End Date cannot be more than 3 years in the future.',
      );
    }
    return { today, boosterStartDate, boosterEndDate };
  }

  private async saveSlabsIfAnyCreate(
    m: any,
    boosterSlabs: any[] | undefined,
    savedBooster: any,
  ) {
    if (!boosterSlabs?.length) return;

    const sorted = [...boosterSlabs].sort(
      (a, b) => a.startRange - b.startRange,
    );
    this.validateSlabFields(sorted);
    this.validateSlabAdjacency(sorted);

    const slabEntities = sorted.map((slab) =>
      m.create(BoosterIncentiveSlabs, {
        startRange: slab.startRange,
        endRange: slab.endRange,
        rewardType: slab.rewardType,
        rewardValue: slab.rewardValue,
        booster: savedBooster,
      }),
    );

    await m.save(BoosterIncentiveSlabs, slabEntities);
    logger.info('Booster slabs saved successfully.');
  }

  private ensureProjectsProvided(projectIds: number[]) {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      throw new BadRequestException(
        'At least one project ID must be provided.',
      );
    }
  }

  private async checkBoosterNameUnique(m: any, name: string) {
    const existingBooster = await m.findOne(Boosters, { where: { name } });
    if (existingBooster) {
      throw new BadRequestException(
        `A booster with the name "${name}" already exists.`,
      );
    }
  }

  private async findAndValidateProjectsShared(
    m: any,
    projectIds: number[],
    brandIds: number[],
    cityIds: (number | string)[],
    opts: { messages: ProjectValidationMessages; normalizeCityIds?: boolean },
  ) {
    const found = await m.find(Projects, {
      where: { id: In(projectIds) },
      relations: ['brand', 'city'],
    });

    if (found.length !== projectIds.length) {
      const foundIds = found.map((p) => p.id);
      const missing = projectIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(opts.messages.notFound(missing));
    }

    const invalidBrandProject = found.find(
      (p) => !brandIds.includes(p.brand.id),
    );
    if (invalidBrandProject) {
      throw new BadRequestException(
        `The project's Brand Id (${invalidBrandProject.brand.id}) does not exist in the provided Brand Ids array.`,
      );
    }

    const toId = (x: any) => (opts.normalizeCityIds ? Number(x) : x);

    const projectCityIds = new Set(
      found
        .map((p) => toId(p.city.id))
        .filter((v) => (opts.normalizeCityIds ? !isNaN(v as number) : true)),
    );

    const providedCityIdSet = new Set(
      (cityIds as any[])
        .map(toId)
        .filter((v) => (opts.normalizeCityIds ? !isNaN(v as number) : true)),
    );

    const invalidCities = [...projectCityIds].filter(
      (id) => !providedCityIdSet.has(id),
    );
    if (invalidCities.length > 0) {
      throw new BadRequestException(
        opts.messages.cityMismatch(invalidCities as number[], cityIds),
      );
    }

    return found;
  }

  private scheduleBoosterNotifications(
    groupId: number,
    boosterSlabs: any[] | undefined,
  ) {
    setImmediate(async () => {
      try {
        const rmIds =
          await this.getRMsByBrandCityAndProjectIdUsingFind(groupId);
        const rmUserIds = rmIds.map((rm: any) => rm.userId);
        const notifications = boosterSlabs.map((slab) => ({
          type: 'Booster',
          title: 'Booster Scheme Alert',
          message: `New booster scheme live! Get ${slab?.rewardType} as part of the latest booster offer.`,
          userIds: rmUserIds.length > 0 ? [...rmUserIds] : [],
        }));
        if (notifications.length > 0) {
          await this.notificationService.create({ notifications });
        }
      } catch (e) {
        logger.error('Error sending booster notifications', e);
      }
    });
  }
}
