import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IncentivePolicy } from './entities/incentive_policy.entity';
import { IncentiveSlab } from './entities/incentive_slabs.entity';
import { Projects } from '../../masters/projects/entities/project.entity';
import { CreateIncentivePolicyDto } from './dto/create_incentive_policy.dto';
import { UpdateIncentivePolicyDto } from './dto/update_incentive_policy.dto';
import { logger } from '../../../logger/logger';
import {
  Boosters,
  Brands,
  Group,
  ProjectPhase,
  CityMaster,
  Users,
  Regions,
} from 'src/entities';
import { StatusEnum } from 'src/enums/status.enum';
import { ReraStatusEnum } from 'src/enums/booking-list.enums';
import {
  isMissing,
  validateIncentiveSlab,
  validateSlabContinuity,
} from 'src/utils/slabsValidations';
import * as moment from 'moment';
import { ProjectStage } from 'src/enums/project-stage.enum';
import { addYears, endOfDay, startOfDay, subYears } from 'date-fns';
import { updateIncentivePolicyStatuses } from './helper/deactivate-expired-policy.helper';
import { isIndianGroup } from 'src/utils/isIndianGroup';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { SUCCESS } from 'src/config/constants';

@Injectable()
export class IncentivePolicyService {
  constructor(
    @InjectRepository(IncentivePolicy)
    private readonly incentivePolicyRepository: Repository<IncentivePolicy>,

    @InjectRepository(IncentiveSlab)
    private readonly incentiveSlabRepository: Repository<IncentiveSlab>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,

    @InjectRepository(Brands)
    private readonly brandRepository: Repository<Brands>,

    @InjectRepository(Regions)
    private readonly regionRepository: Repository<Regions>,

    @InjectRepository(CityMaster)
    private readonly cityRepository: Repository<CityMaster>,

    @InjectRepository(Boosters)
    private readonly boosterRepository: Repository<Boosters>,

    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,

    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,
  ) {}

  async create(
    createIncentivePolicyDto: CreateIncentivePolicyDto,
  ): Promise<any> {
    const {
      name,
      projects,
      incentiveSlabs,
      cities,
      brandId,
      regionIds,
      groupId,
      maxPayableIncentive,
    } = createIncentivePolicyDto;

    try {
      // 1. Basic uniqueness and group validation (now returns group)
      const group = await this.ensureUniqueNameAndValidGroup(
        name,
        groupId,
        brandId,
      );

      logger.info('Valid Group found for the policy', group?.id);

      // 2. Projects existence + project <-> brand/city validation
      const foundProjects = await this.fetchAndValidateProjects(
        projects,
        brandId,
        cities,
      );

      // 3. Date validations + derived flags (requireLaunch / requireSustenance)
      const { startDateObj, endDateObj, requireLaunch, requireSustenance } =
        await this.validateDatesAndProjectPhases(
          createIncentivePolicyDto,
          foundProjects,
        );

      // 4. Slab validation (uses requireLaunch/requireSustenance)
      incentiveSlabs.forEach((slab, index) =>
        validateIncentiveSlab(slab, index, {
          requireLaunch,
          requireSustenance,
        }),
      );

      // 5. Slab continuity checks (only if values provided)
      const hasLaunchFields = incentiveSlabs.some(
        (slab) =>
          !isMissing(slab.launchStartRange) && !isMissing(slab.launchEndRange),
      );

      const hasSustenanceFields = incentiveSlabs.some(
        (slab) =>
          !isMissing(slab.sustenanceStartRange) &&
          !isMissing(slab.sustenanceEndRange),
      );

      if (hasLaunchFields) {
        validateSlabContinuity(incentiveSlabs, 'Launch');
      }

      if (hasSustenanceFields) {
        validateSlabContinuity(incentiveSlabs, 'Sustenance');
      }

      // 6. Conflict checks to determine default policy and project overlaps
      const isDefaultPolicy = await this.determineIsDefaultPolicy(
        brandId,
        groupId,
        startDateObj,
        endDateObj,
      );

      await this.ensureNoConflictingProjectPolicies(
        projects,
        groupId,
        startDateObj,
        endDateObj,
        foundProjects,
      );

      // 7. Finally create policy + slabs in a transaction
      const { message, data } = await this.createPolicyWithSlabs({
        dto: createIncentivePolicyDto,
        brandId,
        regionIds,
        groupId,
        projects,
        maxPayableIncentive,
        incentiveSlabs,
        isDefaultPolicy,
      });

      return { statusCode: SUCCESS, message, data };
    } catch (error) {
      logger.error('Failed to create Incentive Policy', error);
      logsAndErrorHandling('IncentivePolicyService - create', error, {
        createIncentivePolicyDto,
      });
    }
  }

  private async ensureUniqueNameAndValidGroup(
    name: string,
    groupId: number,
    brandId: number[],
  ) {
    const existingPolicy = await this.incentivePolicyRepository.findOne({
      where: { name },
    });

    if (existingPolicy) {
      throw new ConflictException(
        `An Incentive Policy with the name "${name}" already exists.`,
      );
    }

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found.`);
    }

    // merged validation: Indian group constraint (no duplicate lookup)
    if (isIndianGroup(group?.name) && brandId.length > 1) {
      throw new BadRequestException(
        'Only one brand ID is allowed for the Indian group.',
      );
    }

    return group;
  }

  private async fetchAndValidateProjects(
    projects: number[] | undefined,
    brandId: number[],
    cities: number[],
  ) {
    // Check if the provided project IDs exist
    const foundProjects = await this.projectRepository.find({
      where: { id: In(projects ?? []) },
      select: ['id', 'name'],
      relations: ['brand', 'city'],
    });

    if (foundProjects.length !== projects?.length) {
      const missingProjects = projects.filter(
        (id) => !foundProjects.some((proj) => proj.id === id),
      );
      throw new BadRequestException(
        `The following project IDs do not exist: ${missingProjects.join(', ')}`,
      );
    }

    // validation on city and brandId
    const invalidProjects = foundProjects.filter(
      (project) =>
        !brandId.includes(project.brand?.id) ||
        !cities.includes(project.city?.id),
    );

    if (invalidProjects.length > 0) {
      const invalidProjectDetails = invalidProjects.map(
        (proj) =>
          `Project ID: ${proj.id} (Brand: ${proj.brand?.id}, City: ${proj.city?.id})`,
      );

      throw new BadRequestException(
        `The following projects do not match the given Brand IDs [${brandId.join(
          ', ',
        )}] and City IDs [${cities.join(', ')}]: ${invalidProjectDetails.join(
          '; ',
        )}`,
      );
    }

    return foundProjects;
  }

  private async validateDatesAndProjectPhases(
    dto: CreateIncentivePolicyDto,
    foundProjects: any[],
  ) {
    const today = startOfDay(new Date());
    const startDateObj = startOfDay(new Date(dto.startDate));
    const endDateObj = endOfDay(new Date(dto.endDate));

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new BadRequestException(
        'Invalid date format for startDate or endDate.',
      );
    }

    // Ensure Start Date is up to 3 year in the past
    const threeYearsAgo = subYears(today, 3);
    if (startDateObj < threeYearsAgo) {
      throw new BadRequestException(
        'Start Date cannot be more than 3 years in the past.',
      );
    }

    if (endDateObj <= startDateObj) {
      throw new BadRequestException('End Date must be after Start Date.');
    }

    // Ensure End Date is up to 3 years in the future
    const threeYearsAhead = addYears(today, 3);
    if (endDateObj > threeYearsAhead) {
      throw new BadRequestException(
        'End Date cannot be more than 3 years in the future.',
      );
    }

    // project phases and derived flags
    const projectPhases = await this.projectPhaseRepository.find({
      where: { project: In(foundProjects.map((p) => p.id)) },
    });

    const { reraStatuses, projectTypes } = projectPhases.reduce(
      (acc, p) => {
        acc.reraStatuses.push(p.reraStatus);
        acc.projectTypes.push(p.projectType);
        return acc;
      },
      { reraStatuses: [], projectTypes: [] } as {
        reraStatuses: string[];
        projectTypes: string[];
      },
    );

    const uniqueReraStatuses = new Set(reraStatuses);
    const uniqueProjectTypes = new Set(projectTypes);

    // Determine launch/sustenance requirements based on mixed values
    const requireLaunch =
      uniqueReraStatuses.has(ReraStatusEnum.NO) &&
      uniqueProjectTypes.has(ProjectStage.NEW_LAUNCH);

    const requireSustenance =
      uniqueProjectTypes.has(ProjectStage.SUSTENANCE) &&
      (uniqueReraStatuses.has(ReraStatusEnum.OC) ||
        uniqueReraStatuses.has(ReraStatusEnum.NO));

    return { startDateObj, endDateObj, requireLaunch, requireSustenance };
  }

  private async determineIsDefaultPolicy(
    brandId: number[],
    groupId: number,
    startDateObj: Date,
    endDateObj: Date,
  ) {
    let isDefaultPolicy = false;
    const conflictingBrandPolicies = await this.incentivePolicyRepository
      .createQueryBuilder('policy')
      .where(`JSON_CONTAINS(policy.brand_ids, :bId) = 1`, {
        bId: JSON.stringify(brandId),
      })
      .andWhere('policy.start_date <= :newEndDate', {
        newEndDate: endDateObj,
      })
      .andWhere('policy.end_date >= :newStartDate', {
        newStartDate: startDateObj,
      })
      .andWhere('policy.group_id = :groupId', { groupId })
      .andWhere('policy.deleted_at IS NULL')
      .getMany();

    if (!conflictingBrandPolicies?.length) {
      isDefaultPolicy = true;
    }
    return isDefaultPolicy;
  }

  private async ensureNoConflictingProjectPolicies(
    projects: number[],
    groupId: number,
    startDateObj: Date,
    endDateObj: Date,
    foundProjects: any[],
  ) {
    const conflictingPolicies = await this.incentivePolicyRepository
      .createQueryBuilder('policy')
      .where('JSON_OVERLAPS(policy.projects_array, CAST(:projects AS JSON))', {
        projects: JSON.stringify(projects),
      })
      .andWhere('policy.start_date <= :newEndDate', {
        newEndDate: endDateObj,
      })
      .andWhere('policy.end_date >= :newStartDate', {
        newStartDate: startDateObj,
      })
      .andWhere('policy.group_id = :groupId', { groupId })
      .andWhere('policy.deleted_at IS NULL')
      .getMany();

    const conflictingProjectIds: number[] = [];
    for (const policy of conflictingPolicies) {
      const matched = policy.projectsArray.filter((id: number) =>
        projects.includes(id),
      );
      conflictingProjectIds.push(...matched);
    }

    // Remove duplicates
    const uniqueConflictingProjects = new Set(conflictingProjectIds);
    const conflictedProjects = foundProjects
      .filter((p) => uniqueConflictingProjects.has(p.id))
      .map((p) => p.name)
      .join(', ');

    // Reject if any project has an active policy
    if (conflictingPolicies.length > 0) {
      throw new BadRequestException(
        `The following projects already have an active incentive policy: ${conflictedProjects}. Remove them or update their existing policy.`,
      );
    }
  }

  private async createPolicyWithSlabs(options: {
    dto: CreateIncentivePolicyDto;
    brandId: number[];
    regionIds: number[];
    groupId: number;
    projects: number[];
    maxPayableIncentive: number;
    incentiveSlabs: any[];
    isDefaultPolicy: boolean;
  }) {
    const {
      dto,
      brandId,
      regionIds,
      groupId,
      projects,
      maxPayableIncentive,
      incentiveSlabs,
      isDefaultPolicy,
    } = options;
    return await this.incentivePolicyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Step 1: Create the Incentive Policy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const policyEndDate = new Date(dto.endDate);

        const status =
          policyEndDate.getTime() >= today.getTime()
            ? StatusEnum.ACTIVE
            : StatusEnum.INACTIVE;

        const brands = await transactionalEntityManager.find(Brands, {
          where: {
            id: In(brandId), // assuming brandId is number[]
          },
        });

        const regions = await transactionalEntityManager.find(Regions, {
          where: {
            id: In(regionIds), // assuming regionsIds is number[]
          },
        });

        const newPolicy = this.incentivePolicyRepository.create({
          group: await transactionalEntityManager.findOneOrFail(Group, {
            where: { id: groupId },
          }),
          brandIds: brands.map((brand) => brand.id),
          regionIds: regions.map((region) => region.id),
          name: dto.name,
          status: status,
          projectsArray: projects,
          isDefault: isDefaultPolicy,
          startDate: dto.startDate,
          endDate: dto.endDate,
          maxPayableIncentive,
        });

        const savedPolicy = await transactionalEntityManager.save(
          IncentivePolicy,
          newPolicy,
        );

        // Step 3: Insert all the incentive slabs
        const slabsToInsert = incentiveSlabs.map((slab) => ({
          ...slab,
          incentivePolicy: savedPolicy,
        }));

        const savedSlabs = await transactionalEntityManager.save(
          IncentiveSlab,
          slabsToInsert,
        );

        return {
          message: 'Incentive Policy created successfully.',
          data: {
            id: savedPolicy?.id,
            policy: savedPolicy,
            slabs: savedSlabs,
          },
        };
      },
    );
  }

  // Fetches all incentive structures with related slabs and projects
  async getAllPolicies(options: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    status?: string;
    brandId?: number[];
    regionIds?: number[];
    startDate?: string;
    endDate?: string;
    groupId?: number;
  }): Promise<any> {
    try {
      const {
        page,
        limit,
        search,
        sortBy,
        status,
        brandId,
        regionIds,
        startDate,
        endDate,
        groupId,
      } = options;
      let message = 'Incentive Policies fetched successfully.';

      // Keep original behavior: update expired policies before fetching
      await updateIncentivePolicyStatuses(this.incentivePolicyRepository);

      const skip = (page - 1) * limit;
      // 1) Validate/parse date range (may throw)
      const { parsedStartDate, parsedEndDate } = this.validateAndParseDateRange(
        {
          startDate,
          endDate,
        },
      );

      // 2) Build base query with paging, sorting, search, status and group filters
      const query = this.buildBaseQuery({
        limit,
        skip,
        search,
        sortBy,
        status,
        groupId,
      });

      // 3) Apply Regions filters
      await this.applyRegionFilters(query, regionIds);

      // 4) Apply brand & date filters (brand existence validation + date filters)
      await this.applyBrandAndDateFilters(
        query,
        brandId,
        parsedStartDate,
        parsedEndDate,
      );

      // Execute query
      const [policies, total] = await query.getManyAndCount();

      if (policies.length === 0) {
        message = 'No Incentive Policies Available';
      }

      // Collect brand IDs and fetch brands
      const allBrandIds = new Set<number>();
      policies.forEach((p) =>
        (p.brandIds ?? []).forEach((id) => allBrandIds.add(id)),
      );

      const brands = allBrandIds.size
        ? await this.brandRepository.findBy({
            id: In([...allBrandIds]),
          })
        : [];

      // Format and return (preserves original mapping)
      const formattedPolicies = this.formatPolicies(policies, brands);

      return {
        message,
        data: {
          policies: formattedPolicies,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch Incentive Policies', error);
      logsAndErrorHandling('IncentivePolicyService - getAllPolicies', error, {
        options,
      });
    }
  }

  /* -----------------------
   Helper: validate & parse startDate/endDate only (throws on invalid)
   Returns parsedStartDate and parsedEndDate (or undefined)
   ----------------------- */
  private validateAndParseDateRange(opts: {
    startDate?: string;
    endDate?: string;
  }): { parsedStartDate?: string; parsedEndDate?: string } {
    const { startDate, endDate } = opts;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException(
          'Invalid date format for startDate or endDate. Use YYYY-MM-DD format.',
        );
      }

      if (start > end) {
        throw new BadRequestException(
          'Invalid date range. startDate must be earlier than endDate.',
        );
      }
    }

    const parsedStartDate = startDate ?? undefined;
    const parsedEndDate = endDate ?? undefined;

    return { parsedStartDate, parsedEndDate };
  }

  /* -----------------------
   Helper: build base query with paging, sorting, search, status and group filters
   ----------------------- */
  private buildBaseQuery(opts: {
    limit: number;
    skip: number;
    search?: string;
    sortBy?: string;
    status?: string;
    groupId?: number;
  }) {
    const { limit, skip, search, sortBy, status, groupId } = opts;

    const query = this.incentivePolicyRepository
      .createQueryBuilder('incentivePolicy')
      .leftJoinAndSelect('incentivePolicy.group', 'group')
      .take(limit)
      .skip(skip);

    // Default sort or parsed sort behaviour (preserve original behaviour)
    if (!sortBy) {
      query.orderBy('incentivePolicy.createdAt', 'DESC');
    } else {
      const [field, direction] = sortBy.split(':');
      const validFields = [
        'createdAt',
        'updatedAt',
        'status',
        'group',
        'duration',
      ];

      if (!validFields.includes(field)) {
        throw new BadRequestException(
          `Invalid sort field "${field}". Allowed fields: ${validFields.join(', ')}.`,
        );
      }

      if (field === 'status') {
        query.addOrderBy(
          'incentivePolicy.status',
          direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
        );
      } else if (field === 'group') {
        query.addOrderBy(
          'group.name',
          direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
        );
      } else if (field === 'duration') {
        query
          .addSelect(
            `DATEDIFF(COALESCE(incentivePolicy.endDate, NOW()), COALESCE(incentivePolicy.startDate, NOW()))`,
            'duration',
          )
          .addOrderBy(
            'duration',
            direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
          );
      } else {
        query.addOrderBy(
          `incentivePolicy.${field}`,
          direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
        );
      }
    }

    // Search by name
    if (search) {
      query.andWhere('incentivePolicy.name LIKE :search', {
        search: `%${search?.trim()}%`,
      });
    }

    // Status filter
    if (status) {
      const validStatuses = [StatusEnum.ACTIVE, StatusEnum.INACTIVE];
      if (!validStatuses.includes(status as StatusEnum)) {
        throw new BadRequestException(
          `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}.`,
        );
      }
      query.andWhere('incentivePolicy.status = :status', {
        status: status?.toLowerCase(),
      });
    }

    // Group filter preserved as original (project.group = :groupId)
    if (groupId) {
      query.andWhere('project.group = :groupId', { groupId });
    }

    return query;
  }

  /**
   * Helper: apply region filters to query (with existence validation)
   * @param query any
   * @param regionIds Number[] | undefined
   */
  private async applyRegionFilters(query: any, regionIds?: number[]) {
    // Region filter validating ids exist
    if (regionIds && Array.isArray(regionIds) && regionIds.length > 0) {
      const regions = await this.regionRepository.find({
        where: { id: In(regionIds) },
      });

      if (!regions.length) {
        throw new NotFoundException(
          'No Records found for the mentioned regions',
        );
      }

      query.andWhere(
        `(${regionIds
          .map(
            (_, idx) =>
              `JSON_CONTAINS(incentivePolicy.region_ids, :regionId${idx}, "$")`,
          )
          .join(' OR ')})`,
        Object.fromEntries(
          regionIds.map((id, idx) => [`regionId${idx}`, `${id}`]),
        ),
      );
    }
  }

  /* -----------------------
   Helper: brand validation & applying brand/date filters to query
   Preserves original SQL behavior
   ----------------------- */
  private async applyBrandAndDateFilters(
    query: any,
    brandId?: number[],
    parsedStartDate?: string,
    parsedEndDate?: string,
  ) {
    const hasBrandFilter = Array.isArray(brandId) && brandId.length > 0;

    if (hasBrandFilter) {
      const brands = await this.brandRepository.find({
        where: { id: In(brandId) },
      });

      if (!brands.length) {
        throw new NotFoundException(
          'No Records found for the mentioned brands',
        );
      }

      const brandConditions = brandId
        .map(
          (_, idx) =>
            `JSON_CONTAINS(incentivePolicy.brand_ids, :brandId${idx}, "$")`,
        )
        .join(' OR ');

      const brandParams = Object.fromEntries(
        brandId.map((id, idx) => [`brandId${idx}`, `${id}`]),
      );

      query.andWhere(`(${brandConditions})`, brandParams);
    }

    const hasStartDate = !!parsedStartDate;
    const hasEndDate = !!parsedEndDate;

    if (!hasStartDate && !hasEndDate) {
      return;
    }

    const start = hasStartDate ? new Date(parsedStartDate) : null;
    const end = hasEndDate ? new Date(parsedEndDate) : null;

    if (start && isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date format for startDate.');
    }

    if (end && isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format for endDate.');
    }

    if (hasStartDate && hasEndDate) {
      query.andWhere(
        '(incentivePolicy.startDate <= :endDate AND incentivePolicy.endDate >= :startDate)',
        { startDate: parsedStartDate, endDate: parsedEndDate },
      );
      return;
    }

    if (hasStartDate) {
      query.andWhere('incentivePolicy.startDate >= :startDate', {
        startDate: parsedStartDate,
      });
      return;
    }

    query.andWhere('incentivePolicy.endDate <= :endDate', {
      endDate: parsedEndDate,
    });
  }

  /* -----------------------
   Helper: format policies into response objects (preserves original mapping)
   ----------------------- */
  private formatPolicies(policies: any[], brands: any[]) {
    const brandMap = new Map<number, (typeof brands)[0]>();
    brands.forEach((b) => brandMap.set(b.id, b));

    return policies.map((policy) => {
      const matchingBrands = brands.filter((b) =>
        policy.brandIds.includes(b.id),
      );
      return {
        id: policy?.id ?? null,
        name: policy?.name ?? 'No Name',
        duration:
          policy?.startDate && policy?.endDate
            ? `${new Date(policy.startDate).toLocaleDateString('en-GB')} - ${new Date(policy.endDate).toLocaleDateString('en-GB')}`
            : 'No Duration',
        projectId: null,
        projectName: null,
        groupId: policy?.group?.id ?? null,
        groupName: policy?.group?.name ?? 'No Group Assigned',
        brandIds: policy.brandIds,
        brandName:
          matchingBrands.length > 0
            ? matchingBrands.map((b) => ({ name: b.name }))
            : 'No Brand Assigned',
        status:
          policy?.status === StatusEnum.ACTIVE
            ? StatusEnum.ACTIVE
            : StatusEnum.INACTIVE,
      };
    });
  }

  // Fetch one incentive structure by ID
  async findOne(id: number): Promise<any> {
    try {
      // Validate ID
      if (!id || isNaN(id) || id <= 0) {
        throw new BadRequestException(
          'Invalid ID provided. ID must be a positive number.',
        );
      }

      // Fetch policy with relations
      const structure = await this.incentivePolicyRepository.findOne({
        where: { id },
        relations: ['incentiveSlabs', 'group'],
      });

      if (!structure) {
        throw new NotFoundException(`No incentive policy found with ID ${id}.`);
      }

      // Fetch related brands and projects
      const policyBrands = await this.brandRepository.find({
        where: { id: In(structure?.brandIds ?? []) },
        select: ['id', 'name'],
      });

      const policyRegions = await this.regionRepository.find({
        where: { id: In(structure?.regionIds ?? []) },
        select: ['id', 'name'],
      });

      const policyProjects = await this.projectRepository.find({
        where: { id: In(structure?.projectsArray ?? []) },
        relations: ['brand', 'city'],
      });

      // Format the payload using the helper (no logic changes)
      const formattedData = this.formatIncentivePolicyDetail(
        structure,
        policyRegions,
        policyBrands,
        policyProjects,
      );

      return {
        message: 'Incentive Policy fetched successfully.',
        data: formattedData,
      };
    } catch (error) {
      logger.error(`Failed to fetch Incentive Policy with ID: ${id}`, error);
      logsAndErrorHandling('IncentivePolicyService - findOne', error, {
        id,
      });
    }
  }

  /* -------------------------
   Helper: formatIncentivePolicyDetail
   Preserves all original mapping logic and null/zero handling
   ------------------------- */
  private formatIncentivePolicyDetail(
    structure: any,
    policyRegions: Array<{ id: number; name: string }>,
    policyBrands: Array<{ id: number; name: string }>,
    policyProjects: any[],
  ) {
    const group = structure?.group ?? null;

    const cities = [
      ...new Map(
        policyProjects
          ?.filter((p) => p?.city)
          .map((p) => [
            p.city.id,
            { id: p.city.id ?? null, name: p.city.name ?? null },
          ]),
      ).values(),
    ];

    const incentiveSlabs =
      structure?.incentiveSlabs?.map((slab) => ({
        id: slab?.id ?? null,
        launchMinBookings: slab?.launchMinBookings ?? null,
        sustenanceMinBookings: slab?.sustenanceMinBookings ?? null,
        launchStartRange: slab?.launchStartRange || null,
        launchEndRange: slab?.launchEndRange || null,
        sustenanceStartRange: slab?.sustenanceStartRange || null,
        sustenanceEndRange: slab?.sustenanceEndRange || null,
        launchIncentivePercentage: slab?.launchIncentivePercentage || null,
        sustenanceIncentivePercentage:
          slab?.sustenanceIncentivePercentage || null,
      })) ?? [];

    const regions =
      policyRegions?.map((r) => ({
        id: r?.id ?? null,
        name: r?.name ?? 'No Regions',
      })) ?? [];

    const brands =
      policyBrands?.map((b) => ({
        id: b?.id ?? null,
        name: b?.name ?? 'No Brands',
      })) ?? [];

    const projects =
      policyProjects?.map((p) => ({
        id: p?.id ?? null,
        name: p?.name ?? 'No Project',
      })) ?? [];

    return {
      id: structure?.id ?? null,
      name: structure?.name ?? 'No Name',
      startDate: structure?.startDate ?? null,
      endDate: structure?.endDate ?? null,
      maxPayableIncentive: structure?.maxPayableIncentive || null,
      status: structure?.status ?? 'UNKNOWN',
      group: group
        ? {
            id: group?.id ?? null,
            name: group?.name ?? 'No Group',
          }
        : null,
      regions,
      brands,
      cities,
      projects,
      incentiveSlabs,
    };
  }

  // Update an existing incentive structure
  async update(
    id: number,
    updateIncentivePolicyDto: UpdateIncentivePolicyDto,
  ): Promise<any> {
    try {
      logger.info(`Attempting to update Incentive Policy with ID: ${id}`);

      // 1) Load and validate common resources (existing policy, group, projects, dates, derived flags)
      const {
        existingPolicy,
        foundProjects,
        startDateObj,
        endDateObj,
        requireLaunch,
        requireSustenance,
      } = await this.loadAndValidateForUpdate(id, updateIncentivePolicyDto);

      // 2) Slab validation (reuse requireLaunch/requireSustenance)
      const { incentiveSlabs } = updateIncentivePolicyDto as any;
      incentiveSlabs.forEach((slab, index) =>
        validateIncentiveSlab(slab, index, {
          requireLaunch,
          requireSustenance,
        }),
      );

      // Slab continuity checks (only if provided)
      const hasLaunchFields = incentiveSlabs.some(
        (slab) =>
          !isMissing(slab.launchStartRange) && !isMissing(slab.launchEndRange),
      );

      const hasSustenanceFields = incentiveSlabs.some(
        (slab) =>
          !isMissing(slab.sustenanceStartRange) &&
          !isMissing(slab.sustenanceEndRange),
      );

      if (hasLaunchFields) {
        validateSlabContinuity(incentiveSlabs, 'Launch');
      }
      if (hasSustenanceFields) {
        validateSlabContinuity(incentiveSlabs, 'Sustenance');
      }

      // 3) Ensure no conflicting policies for the UPDATE (exclude current policy id)
      await this.ensureNoConflictingProjectPoliciesForUpdate(
        updateIncentivePolicyDto.projects,
        updateIncentivePolicyDto.groupId,
        startDateObj,
        endDateObj,
        id,
        foundProjects,
      );

      // 4) Execute transaction to perform the actual update (moved unchanged)
      const { message } = await this.performUpdateTransaction(
        id,
        existingPolicy,
        updateIncentivePolicyDto,
      );

      return { message, data: { id } };
    } catch (error) {
      logger.error(`Error updating Incentive Policy with ID ${id}:`, error);
      logsAndErrorHandling('IncentivePolicyService - update', error, {
        updateIncentivePolicyDto,
      });
    }
  }

  /* ------------------------
   Helper: loadAndValidateForUpdate
   - validates id, fetches existing policy and group
   - checks Indian group brand constraint (no extra lookup)
   - reuses fetchAndValidateProjects & validateDatesAndProjectPhases
   - returns all objects / flags needed by the coordinator
   ------------------------ */
  private async loadAndValidateForUpdate(
    id: number,
    dto: UpdateIncentivePolicyDto,
  ): Promise<{
    existingPolicy: any;
    group: any;
    foundProjects: any[];
    startDateObj: Date;
    endDateObj: Date;
    requireLaunch: boolean;
    requireSustenance: boolean;
  }> {
    // Validate ID
    if (!id || isNaN(id) || id <= 0) {
      throw new BadRequestException(
        'Invalid ID. ID must be a positive number.',
      );
    }

    const { projects, cities, brandId, groupId } = dto as any;

    // Fetch existing policy (with slabs)
    const existingPolicy = await this.incentivePolicyRepository.findOne({
      where: { id },
      relations: ['incentiveSlabs'],
    });

    if (!existingPolicy) {
      logger.warn(`Incentive Policy with ID "${id}" not found.`);
      throw new NotFoundException(
        `Incentive Policy with ID "${id}" not found.`,
      );
    }

    // Fetch and validate group
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found.`);
    }
    if (isIndianGroup(group?.name) && brandId.length > 1) {
      throw new BadRequestException(
        'Only one brand ID is allowed for the Indian group.',
      );
    }

    // Reuse fetchAndValidateProjects from create refactor (same behavior)
    const foundProjects = await this.fetchAndValidateProjects(
      projects,
      brandId,
      cities,
    );

    // Reuse validateDatesAndProjectPhases from create refactor (same behavior)
    const { startDateObj, endDateObj, requireLaunch, requireSustenance } =
      await this.validateDatesAndProjectPhases(dto as any, foundProjects);

    return {
      existingPolicy,
      group,
      foundProjects,
      startDateObj,
      endDateObj,
      requireLaunch,
      requireSustenance,
    };
  }

  /* ------------------------
   Helper: ensureNoConflictingProjectPoliciesForUpdate
   - same logic as ensureNoConflictingProjectPolicies but accepts excludePolicyId
   - preserves SQL & error messages. Uses foundProjects for mapping names.
   ------------------------ */
  private async ensureNoConflictingProjectPoliciesForUpdate(
    projects: number[],
    groupId: number,
    startDateObj: Date,
    endDateObj: Date,
    excludePolicyId: number,
    foundProjects: any[],
  ) {
    const conflictingPolicies = await this.incentivePolicyRepository
      .createQueryBuilder('policy')
      .where('JSON_OVERLAPS(policy.projects_array, CAST(:projects AS JSON))', {
        projects: JSON.stringify(projects),
      })
      .andWhere('policy.id != :id', { id: excludePolicyId })
      .andWhere('policy.start_date <= :newEndDate', {
        newEndDate: endDateObj,
      })
      .andWhere('policy.end_date >= :newStartDate', {
        newStartDate: startDateObj,
      })
      .andWhere('policy.group_id = :groupId', { groupId })
      .andWhere('policy.deleted_at IS NULL')
      .getMany();

    const conflictingProjectIds: number[] = [];
    for (const policy of conflictingPolicies) {
      const matched = policy.projectsArray.filter((pid: number) =>
        projects.includes(pid),
      );
      conflictingProjectIds.push(...matched);
    }

    // Remove duplicates
    const uniqueConflictingProjects = new Set(conflictingProjectIds);
    const conflictedProjects = foundProjects
      .filter((p) => uniqueConflictingProjects.has(p.id))
      .map((p) => p.name)
      .join(', ');

    // Reject if any project has an active policy
    if (conflictingPolicies.length > 0) {
      throw new BadRequestException(
        `The following projects already have an active incentive policy: ${conflictedProjects}. Remove them or update their existing policy.`,
      );
    }
  }

  /* ------------------------
   Helper: performUpdateTransaction
   - Transaction block moved here. Logic preserved exactly.
   - Returns same message object as original.
   ------------------------ */
  private async performUpdateTransaction(
    id: number,
    existingPolicy: any,
    dto: UpdateIncentivePolicyDto,
  ) {
    const {
      name,
      projects,
      incentiveSlabs,
      startDate,
      endDate,
      maxPayableIncentive,
      brandId,
      regionIds,
    } = dto as any;

    return await this.incentivePolicyRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Update basic fields (same checks as before)
        if (name && name !== existingPolicy.name) {
          existingPolicy.name = name;
        }

        if (maxPayableIncentive !== undefined) {
          existingPolicy.maxPayableIncentive = maxPayableIncentive;
        }

        // Validate and Update Dates
        if (startDate) {
          const parsedStartDate = new Date(startDate);
          if (isNaN(parsedStartDate.getTime())) {
            throw new BadRequestException(
              'Invalid startDate. Please provide a valid date.',
            );
          }
          existingPolicy.startDate = parsedStartDate;
        }

        if (endDate) {
          const parsedEndDate = new Date(endDate);
          if (isNaN(parsedEndDate.getTime())) {
            throw new BadRequestException(
              'Invalid endDate. Please provide a valid date.',
            );
          }
          existingPolicy.endDate = parsedEndDate;
        }

        // Ensure endDate is after startDate
        if (
          existingPolicy.startDate &&
          existingPolicy.endDate &&
          existingPolicy.endDate < existingPolicy.startDate
        ) {
          throw new BadRequestException(
            'The endDate must be greater than the startDate.',
          );
        }

        // Update mapping fields
        existingPolicy.projectsArray = projects;
        existingPolicy.brandIds = brandId;
        existingPolicy.regionIds = regionIds;

        // Update status based on end date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        existingPolicy.status =
          existingPolicy.endDate >= today
            ? StatusEnum.ACTIVE
            : StatusEnum.INACTIVE;

        // Slab updates
        const existingSlabs = await transactionalEntityManager.find(
          IncentiveSlab,
          {
            where: { incentivePolicy: { id } },
          },
        );

        const existingSlabMap = new Map(
          existingSlabs.map((slab) => [slab.id, slab]),
        );
        const newSlabMap = new Map(
          incentiveSlabs
            .filter((slab) => slab.id)
            .map((slab) => [slab.id, slab]),
        );

        // Identify slabs to remove
        const slabsToRemove = existingSlabs
          .filter((slab) => !newSlabMap.has(slab.id))
          .map((slab) => slab.id);

        if (slabsToRemove.length > 0) {
          logger.info(
            `Removing ${slabsToRemove.length} slabs from Incentive Policy ID: ${id}`,
          );
          await transactionalEntityManager.delete(IncentiveSlab, {
            id: In(slabsToRemove),
          });
        }

        // Identify slabs to update or add
        const updatedSlabs = incentiveSlabs.map((newSlab) => {
          if (newSlab.id && existingSlabMap.has(newSlab.id)) {
            const existingSlab = existingSlabMap.get(newSlab.id);

            // Ensure the slab belongs to the policy before updating
            if (existingSlab.incentivePolicy.id !== id) {
              throw new BadRequestException(
                `Slab ID ${newSlab.id} does not belong to the given Incentive Policy.`,
              );
            }

            return {
              ...existingSlab,
              ...newSlab,
            };
          } else {
            // New slab addition
            return {
              ...newSlab,
              incentivePolicy: existingPolicy,
            };
          }
        });

        await transactionalEntityManager.save(IncentiveSlab, updatedSlabs);

        existingPolicy.incentiveSlabs = await transactionalEntityManager.find(
          IncentiveSlab,
          { where: { incentivePolicy: { id } } },
        );

        await transactionalEntityManager.save(existingPolicy);

        return { message: 'Incentive Policy updated successfully' };
      },
    );
  }

  async findProjectsByBrandAndCity(
    brandIdsArray: string,
    cityIdsArray: string,
  ): Promise<any> {
    try {
      if (!cityIdsArray?.trim()) {
        throw new BadRequestException(
          'Invalid cityId format. Expecting comma-separated values.',
        );
      }

      if (!brandIdsArray?.trim()) {
        throw new BadRequestException(
          'Invalid BrandIds format.Please pass correct brandId',
        );
      }
      const cityIds = cityIdsArray
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));

      if (!cityIdsArray.length) {
        throw new BadRequestException(
          'Invalid cityId format. Expecting comma-separated values.',
        );
      }
      const brandIds = brandIdsArray
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));

      if (!brandIdsArray.length) {
        throw new BadRequestException(
          'Invalid BrandIds format. Expecting comma-separated values.',
        );
      }

      // 1️ Validate Brand  and City Existence
      const [brand, cities] = await Promise.all([
        this.brandRepository.findOne({ where: { id: In(brandIds) } }),
        this.cityRepository.find({ where: { id: In(cityIds) } }),
      ]);
      if (!brand) {
        throw new NotFoundException(
          `Brand with IDs [${brandIds.join(', ')}] not found.`,
        );
      }

      if (cities.length !== cityIds.length) {
        const missingCities = cityIds.filter(
          (id) => !cities.some((city) => city.id === id),
        );
        throw new NotFoundException(
          `City IDs not found: ${missingCities.join(', ')}`,
        );
      }

      const projects = await this.projectRepository
        .createQueryBuilder('project')
        .innerJoin('project.brand', 'brand')
        .innerJoin('project.city', 'city')
        .andWhere('brand.id IN (:...brandIds)', { brandIds })
        .andWhere('city.id IN (:...cityIds)', { cityIds })
        .select(['project.id', 'project.name'])
        .getMany();

      if (!projects?.length) {
        return {
          message: `No unmapped projects found for Brand ID [${brandIds.join(', ')}] in City IDs [${cityIds.join(', ')}].`,
        };
      }
      // Step 3: Determine Project Type flag for each project
      const projectsWithProjectTypeFlag = await Promise.all(
        projects.map(async (project) => {
          const phases = await this.projectPhaseRepository.find({
            where: { project: { id: project.id } },
          });

          if (!phases.length) {
            return {
              ...project,
              projectTypeFlag: 'None',
            };
          }

          const uniqueTypes = new Set(phases.map((p) => p.projectType));
          let projectTypeFlag:
            | ProjectStage.NEW_LAUNCH
            | ProjectStage.SUSTENANCE
            | 'Mixed' = 'Mixed';

          if (uniqueTypes.size === 1) {
            projectTypeFlag = [...uniqueTypes][0] as
              | ProjectStage.NEW_LAUNCH
              | ProjectStage.SUSTENANCE;
          }

          return {
            ...project,
            projectTypeFlag,
          };
        }),
      );

      return {
        message: 'Projects fetched successfully',
        data: projectsWithProjectTypeFlag,
      };
    } catch (error) {
      logger.error('Failed to fetch projects by brand and city', error);
      logsAndErrorHandling(
        'IncentivePolicyService - findProjectsByBrandAndCity',
        error,
        {
          brandIdsArray,
          cityIdsArray,
        },
      );
    }
  }

  /**
   * Fetches applicable incentive policy slabs and boosters for the logged-in RM (Relationship Manager)
   * - Retrieves user details with group assignment and associated project
   * - Builds incentive structures map containing active policies with matching slabs
   * - Fetches boosters assigned to the user's group and project
   * @param loggedInUser - The logged-in user object containing dbId
   * @returns Message and data containing brand info, applicable incentive policies with slabs, and boosters
   */
  async getIncentiveSlabsAndBoosters(loggedInUser: any): Promise<any> {
    try {
      const userId = loggedInUser?.dbId ?? null;
      // Input validation
      if (!userId || isNaN(userId) || userId <= 0) {
        throw new BadRequestException('Invalid userId provided.');
      }

      // Load user (with group), brand and projects
      const user = await this.userRepository
        .createQueryBuilder('u')
        .leftJoin(
          'user_group_assignments',
          'uga',
          ` uga.user_id = u.id
            AND uga.is_deleted = 0
            AND uga.is_active = 1
            AND uga.start_date <= CURRENT_TIMESTAMP
            AND (uga.end_date IS NULL OR uga.end_date >= CURRENT_TIMESTAMP)
          `,
        )
        .leftJoinAndSelect('u.project', 'project')
        .leftJoinAndMapOne('u.group', 'groups', 'g', 'g.id = uga.group_id')
        .where('u.id = :userId', { userId })
        .andWhere('u.deleted_at IS NULL')
        .getOne();

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      if (!user?.project?.id) {
        throw new NotFoundException(
          `No project associated with the you. Please check with your administrator.`,
        );
      }
      const projects = await this.projectRepository.find({
        where: { id: user?.project?.id, brand: { id: user?.project?.brandId } },
        relations: ['boosters', 'brand'],
      });

      if (!projects?.length) {
        throw new NotFoundException(
          'No projects found for the user with brand details.',
        );
      }

      // Extract brand details from the project
      const brand = projects[0]?.brand;
      if (!brand) {
        throw new NotFoundException(
          'Brand details not found for the user project.',
        );
      }

      // Build incentive structures map (policies + attached slabs + assigned projects)
      const incentiveStructuresMap = await this.buildIncentiveStructuresMap(
        user,
        projects,
        [user?.project?.id],
      );

      // Fetch boosters for the projects (returns raw boosters array)
      const boosters = await this.fetchAndFormatBoosters(
        user?.group?.id,
        projects.map((p) => p.id),
      );

      return {
        message: 'Incentive slabs & boosters fetched successfully.',
        data: {
          brand: { id: brand.id, name: brand.name },
          incentivePolicy:
            [...incentiveStructuresMap.values()].length > 0
              ? [...incentiveStructuresMap.values()]
              : [],
          boosters: boosters.length > 0 ? boosters : [],
        },
      };
    } catch (error) {
      logger.error('Failed to fetch incentive slabs & boosters', error);
      return logsAndErrorHandling(
        'IncentivePolicyService - getIncentiveSlabsAndBoosters',
        error,
        {
          userId: loggedInUser?.dbId,
        },
      );
    }
  }

  /* -------------------------
   Helper: buildIncentiveStructuresMap
   - Finds active policies for provided projects & user.group
   - Populates a map keyed by policy id { id, name, projects: [], incentiveSlabs: [] }
   - Loads slabs for found policies and attaches them to map entries
   ------------------------- */
  private async buildIncentiveStructuresMap(
    user: any,
    projects: any[],
    projectIds: number[],
  ): Promise<Map<number, any>> {
    const incentiveStructuresMap = new Map<number, any>();
    const currentDate = moment().startOf('day').toDate();

    const projectPolicies = await this.incentivePolicyRepository
      .createQueryBuilder('policy')
      .where('JSON_OVERLAPS(policy.projects_array, CAST(:projects AS JSON))', {
        projects: JSON.stringify(projectIds),
      })
      .andWhere('policy.group_id = :groupId', {
        groupId: user?.group?.id,
      })
      .andWhere('policy.start_date <= :currentDate', { currentDate })
      .andWhere('policy.end_date   >= :currentDate', { currentDate })
      .andWhere('policy.deleted_at IS NULL')
      .andWhere('policy.status     = :isActive', {
        isActive: StatusEnum.ACTIVE,
      })
      .getMany();

    // Fetch regions for all found policies
    const allRegionIds = new Set<number>();
    projectPolicies.forEach((policy) =>
      (policy.regionIds ?? []).forEach((id) => allRegionIds.add(id)),
    );

    const regionsMap = new Map<number, { id: number; name: string }>();
    if (allRegionIds.size > 0) {
      const regions = await this.regionRepository.find({
        where: { id: In([...allRegionIds]) },
        select: ['id', 'name'],
      });
      regions.forEach((region) => regionsMap.set(region.id, region));
    }

    // Map policies -> projects
    for (const project of projects) {
      const matchingPolicies = projectPolicies.filter((policy) =>
        policy.projectsArray.includes(project.id),
      );

      if (!matchingPolicies?.length) continue;
      for (const incentivePolicy of matchingPolicies) {
        const incentivePolicyId = incentivePolicy?.id;
        if (!incentiveStructuresMap.has(incentivePolicyId)) {
          const regionNames = (incentivePolicy.regionIds ?? [])
            .map((id) => regionsMap.get(id)?.name)
            .filter((name) => name)
            .join(', ');

          incentiveStructuresMap.set(incentivePolicyId, {
            id: incentivePolicy?.id,
            name: incentivePolicy.name,
            projects: [],
            incentiveSlabs: [],
            regions: regionNames || null,
          });
        }

        incentiveStructuresMap.get(incentivePolicyId).projects.push({
          id: project.id,
          name: project.name,
        });
      }
    }

    // Attach slabs for found policy ids
    const incentivePolicyIds = [...incentiveStructuresMap.keys()];
    if (incentivePolicyIds.length > 0) {
      const incentiveSlabs = await this.incentiveSlabRepository.find({
        where: { incentivePolicy: In(incentivePolicyIds) },
        relations: ['incentivePolicy'],
      });

      for (const slab of incentiveSlabs) {
        if (!slab?.incentivePolicy?.id) continue;

        const incentivePolicy = incentiveStructuresMap.get(
          slab.incentivePolicy?.id,
        );
        if (incentivePolicy) {
          incentivePolicy.incentiveSlabs.push({
            id: slab.id,
            launchProject: {
              startRange: slab.launchStartRange,
              endRange: slab.launchEndRange,
              incentivePercentage: slab.launchIncentivePercentage,
              minimumBookings: slab.launchMinBookings,
            },
            sustenanceProject: {
              startRange: slab.sustenanceStartRange,
              endRange: slab.sustenanceEndRange,
              incentivePercentage: slab.sustenanceIncentivePercentage,
              minimumBookings: slab.sustenanceMinBookings,
            },
          });
        }
      }
    }

    return incentiveStructuresMap;
  }

  /* -------------------------
   Helper: fetchAndFormatBoosters
   - Loads boosters (with slabs & projects) for given group and project ids
   - Returns raw boosters array (same shape as your original query result)
   ------------------------- */
  private async fetchAndFormatBoosters(
    groupId: number,
    projectIdsForBoosters: number[],
  ): Promise<any[]> {
    if (!projectIdsForBoosters || projectIdsForBoosters.length === 0) {
      return [];
    }

    const boosters = await this.boosterRepository
      .createQueryBuilder('booster')
      .leftJoinAndSelect('booster.boosterSlabs', 'boosterSlab')
      .leftJoinAndSelect('booster.projects', 'project')
      .where('booster.group_id = :groupId', { groupId })
      .andWhere('project.id IN (:...projectIds)', {
        projectIds: projectIdsForBoosters,
      })
      .andWhere('booster.status = :status', { status: StatusEnum.ACTIVE })
      .getMany();

    // If you need the boosterMap (original code built it but didn't return it),
    // you can build it here — but to preserve original behaviour we return boosters array
    return boosters;
  }
}
