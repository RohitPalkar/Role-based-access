import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Projects } from './entities/project.entity';
import { logger } from '../../../logger/logger';
import {
  BillingEntity,
  CityMaster,
  ProjectPhase,
  Users,
} from '../../../entities/index';
import { Brands } from '../brands/entities/brand.entity';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import {
  isMissing,
  validateProjectFinancialFields,
} from 'src/utils/slabsValidations';
import { formatDate } from 'src/utils';
import { DATE_FORMAT } from 'src/config/constants';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { CustomConfigService } from 'src/config/custom-config.service';
import { ProjectUserMapping } from './entities/project_user_mapping.entity';
import { RolesEnum } from 'src/enums/roles.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,

    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,

    @InjectRepository(Brands)
    private readonly brandRepository: Repository<Brands>,

    @InjectRepository(BillingEntity)
    private readonly billingEntityRepository: Repository<BillingEntity>,

    @InjectRepository(CityMaster)
    private readonly cityRepository: Repository<CityMaster>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,

    private readonly configService: CustomConfigService,
  ) {}

  async findProjectPhases(brandId: number, cityId: number) {
    try {
      if (!brandId || !cityId) {
        throw new Error('Brand ID and City ID are required.');
      }
      const data = await this.projectPhaseRepository.find({
        where: {
          brand: { id: brandId },
          city: { id: cityId },
          project: IsNull(),
        },
        relations: ['billingEntity'],
        order: { createdAt: 'DESC' },
      });
      const formattedPhases = data?.map((el) => ({
        ...el,
        sustenanceDate: el.sustenanceDate
          ? formatDate(el.sustenanceDate.toISOString(), DATE_FORMAT)
          : null,
      }));
      return {
        message:
          data.length > 0
            ? 'Data Fetch Successfully'
            : 'No Project Phases Found',
        data: formattedPhases,
      };
    } catch (error) {
      // Log the error using logger.error
      logger.error(
        `Failed to fetch project phases for brandId ${brandId} and cityId ${cityId}: ${error.message}`,
      );

      // Throw a proper internal server error
      throw new InternalServerErrorException(error.message);
    }
  }

  async create(dto: CreateProjectDto): Promise<any> {
    return this.projectRepository.manager.transaction(async (manager) => {
      try {
        // Step 1: Validation
        const { phases } = await this.validateProjectCreation(manager, dto);

        const reraStatuses = phases.map((p) => p.reraStatus);
        validateProjectFinancialFields(dto, reraStatuses);

        //Step 1.1: Validate Users
        await this.validateUsers(manager, dto);

        // Step 2: Create Project
        const projectData = this.buildProjectData(dto);

        const project = manager.create(Projects, projectData);
        const savedProject = await manager.save(project);

        // Step 3: Use SAME mapping logic
        await this.updateProjectUsers(savedProject.id, dto, manager);

        // Step 4: Assign Phases
        for (const phase of phases) {
          phase.project = savedProject;
        }

        await manager.save(ProjectPhase, phases);

        return {
          message: 'Project Created And Mapped Successfully',
          data: { id: savedProject.id, name: savedProject.name },
        };
      } catch (error) {
        logger.error('Error creating project:', error);

        return logsAndErrorHandling('ProjectService - create', error, { dto });
      }
    });
  }

  private async validateUsers(
    manager: EntityManager,
    dto: CreateProjectDto | UpdateProjectDto,
  ) {
    const userIds = [
      ...(dto.tlIds || []),
      ...(dto.crmIds || []),
      ...(dto.greIds || []),
      ...(dto.bisIds || []),
      ...(dto.financeIds || []),
      dto.rshId,
      dto.phId,
    ].filter(Boolean);

    if (!userIds.length) return;

    const users = await manager.find(Users, {
      where: { id: In(userIds) },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('Invalid user IDs provided');
    }
  }

  private buildProjectData(dto: Partial<CreateProjectDto>) {
    return {
      ...this.buildCoreProjectData(dto),
      ...this.buildFinancialAndSecureData(dto),
    };
  }

  private buildCoreProjectData(dto: Partial<CreateProjectDto>) {
    const data: any = {};

    const directFields = [
      'name',
      'maxQualificationDays',
      'maxQualificationEffectiveFrom',
      'availableGateways',
      'companyId',
      'projectImage',
      'sfdcProjectName',
      'codename',
      'jvPartnerLogo',
      'buddyRMs',
      'agreementPercentage',
    ];

    // Handle direct mappings
    directFields.forEach((key) => {
      if (dto[key] !== undefined) {
        data[key] = dto[key];
      }
    });

    // Handle relations separately
    if (dto.cityId !== undefined) {
      data.city = dto.cityId ? { id: dto.cityId } : null;
    }

    if (dto.brandId !== undefined) {
      data.brand = dto.brandId ? { id: dto.brandId } : null;
    }

    return data;
  }

  private buildFinancialAndSecureData(dto: Partial<CreateProjectDto>) {
    const data: any = {};

    // Encrypted fields
    data.easebuzzBookingmid = dto.easebuzzBookingmid
      ? this.configService.encryptData(dto.easebuzzBookingmid)
      : null;

    data.easebuzzMilestonemid = dto.easebuzzMilestonemid
      ? this.configService.encryptData(dto.easebuzzMilestonemid)
      : null;

    data.easebuzzBookingSalt = dto.easebuzzBookingSalt
      ? this.configService.encryptData(dto.easebuzzBookingSalt)
      : null;

    data.easebuzzBookingKey = dto.easebuzzBookingKey
      ? this.configService.encryptData(dto.easebuzzBookingKey)
      : null;

    data.easebuzzMilestoneSalt = dto.easebuzzMilestoneSalt
      ? this.configService.encryptData(dto.easebuzzMilestoneSalt)
      : null;
    data.easebuzzMilestoneKey = dto.easebuzzMilestoneKey
      ? this.configService.encryptData(dto.easebuzzMilestoneKey)
      : null;

    data.razorpayKey =
      dto.razorpayKey && this.configService.encryptData(dto.razorpayKey);
    data.razorpaySecret =
      dto.razorpaySecret && this.configService.encryptData(dto.razorpaySecret);

    data.razorpayBookingmid =
      dto.razorpayBookingmid &&
      this.configService.encryptData(dto.razorpayBookingmid);
    data.razorpayMilestonemid =
      dto.razorpayMilestonemid &&
      this.configService.encryptData(dto.razorpayMilestonemid);

    // Financial fields
    if (!isMissing(dto.reraRegularization)) {
      data.reraRegularization = parseFloat(dto.reraRegularization);
    }

    if (!isMissing(dto.reraPayable)) {
      data.reraPayable = parseFloat(dto.reraPayable);
    }

    if (!isMissing(dto.rtmRegularization)) {
      data.rtmRegularization = parseFloat(dto.rtmRegularization);
    }

    if (!isMissing(dto.rtmPayable)) {
      data.rtmPayable = parseFloat(dto.rtmPayable);
    }

    return data;
  }

  private async validateProjectCreation(
    manager: EntityManager,
    dto: CreateProjectDto,
  ) {
    const existingProject = await manager.findOne(Projects, {
      where: { name: dto.name },
    });

    if (existingProject) {
      throw new BadRequestException(
        `A project with the name "${dto.name}" already exists.`,
      );
    }

    const city = await manager.findOne(CityMaster, {
      where: { id: dto.cityId },
    });
    if (!city) {
      throw new BadRequestException(
        `City with ID ${dto.cityId} does not exist.`,
      );
    }

    const brand = await manager.findOne(Brands, {
      where: { id: dto.brandId },
    });
    if (!brand) {
      throw new BadRequestException(
        `Brand with ID ${dto.brandId} does not exist.`,
      );
    }

    const phases = await manager.find(ProjectPhase, {
      where: { id: In(dto.phaseIds) },
      relations: ['brand', 'city'],
    });

    if (phases.length !== dto.phaseIds.length) {
      throw new BadRequestException(`Some phase IDs are invalid.`);
    }

    const unassignedPhases = await manager.find(ProjectPhase, {
      where: {
        id: In(dto.phaseIds),
        project: IsNull(),
      },
    });

    if (unassignedPhases.length !== dto.phaseIds.length) {
      throw new BadRequestException(
        `Some phases are already assigned to another project.`,
      );
    }

    const invalidPhases = phases.filter(
      (phase) => phase.brand.id !== dto.brandId || phase.city.id !== dto.cityId,
    );

    if (invalidPhases.length) {
      const ids = invalidPhases.map((p) => p.id).join(', ');
      throw new BadRequestException(
        `Phases with mismatched city/brand: ${ids}`,
      );
    }

    return { phases };
  }

  private buildUserMappings(dto: UpdateProjectDto) {
    const mappings: { userId: number; role: string }[] = [];

    dto.tlIds?.forEach((id) => {
      mappings.push({
        userId: id,
        role: RolesEnum.SALES_TL,
      });
    });

    dto.crmIds?.forEach((id) => {
      mappings.push({
        userId: id,
        role: RolesEnum.CRM,
      });
    });

    dto.greIds?.forEach((id) => {
      mappings.push({
        userId: id,
        role: RolesEnum.GRE,
      });
    });

    if (dto.rshId) {
      mappings.push({
        userId: dto.rshId,
        role: RolesEnum.SALES_RSH,
      });
    }

    if (dto.phId) {
      mappings.push({
        userId: dto.phId,
        role: RolesEnum.PROJECT_HEAD,
      });
    }

    dto.bisIds?.forEach((id) => {
      mappings.push({
        userId: id,
        role: RolesEnum.BIS,
      });
    });

    dto.financeIds?.forEach((id) => {
      mappings.push({
        userId: id,
        role: RolesEnum.FINANCE_ADMIN,
      });
    });
    return mappings;
  }

  async updateProjectUsers(
    projectId: number,
    dto: UpdateProjectDto,
    manager: EntityManager,
  ) {
    const newMappings = this.buildUserMappings(dto);

    const existingMappings = await manager.find(ProjectUserMapping, {
      where: {
        project: { id: projectId },
        removedAt: IsNull(),
      },
      relations: ['user'],
    });

    // Use Map instead of O(n²) find (FIX #4)
    const newMap = new Map(
      newMappings.map((m) => [`${m.userId}-${m.role}`, m]),
    );

    const existingKeySet = new Set(
      existingMappings.map((m) => `${m.user.id}-${m.role}`),
    );

    const newKeySet = new Set(newMap.keys());

    // REMOVE (already correct)
    const toRemove = existingMappings.filter(
      (m) => !newKeySet.has(`${m.user.id}-${m.role}`),
    );

    if (toRemove.length) {
      await manager.update(
        ProjectUserMapping,
        { id: In(toRemove.map((m) => m.id)) },
        { removedAt: new Date() },
      );
    }

    // ADD
    const toAdd = newMappings.filter(
      (m) => !existingKeySet.has(`${m.userId}-${m.role}`),
    );

    if (toAdd.length) {
      const entities = toAdd.map((m) =>
        manager.create(ProjectUserMapping, {
          project: { id: projectId },
          user: { id: m.userId },
          role: m.role,
        }),
      );

      await manager.save(ProjectUserMapping, entities);
    }
  }

  async findAllBillingEntities(): Promise<any> {
    try {
      const billingEntities = await this.billingEntityRepository.find({
        order: { name: 'ASC' }, // Sorted alphabetically by name
      });

      return {
        message: billingEntities.length
          ? 'Billing entities fetched successfully.'
          : 'No billing entities found.',
        data: billingEntities || [],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while fetching all billing entities.',
        error,
      );
    }
  }

  async findProjectById(id: number) {
    try {
      if (!id || isNaN(id)) {
        throw new BadRequestException(
          'Invalid projectId. It must be a number.',
        );
      }

      //Step 1: Fetch project (NO tl/rsh here)
      const project = await this.projectRepository.findOne({
        where: { id },
        relations: ['brand', 'city', 'phases', 'phases.billingEntity'],
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${id} not found.`);
      }

      //Step 2: Fetch active role mappings
      const mappings = await this.projectUserMappingRepo.find({
        where: {
          project: { id },
          removedAt: IsNull(),
        },
        relations: ['user'],
      });

      //Step 3: Map roles
      const { tl, crm, rsh, gre, ph, bis, finance } = this.mapRoles(mappings);

      //Step 4: Fetch buddy RMs if present
      let buddyRMs = [];
      if (project.buddyRMs && project.buddyRMs.length > 0) {
        const buddyUsers = await this.userRepository.find({
          where: { id: In(project.buddyRMs) },
          select: ['id', 'name'],
        });
        buddyRMs = buddyUsers;
      }

      //Step 5: Process phases (this is redundant btw)
      const phasesProcessed = project.phases.map((phase) => ({ ...phase }));

      // Step 6: Final response
      const formattedOutput = {
        ...project,

        tl: tl,
        crm: crm,
        rsh: rsh,
        gre: gre,
        ph: ph,
        bis: bis,
        finance: finance,
        buddyRMs: buddyRMs,

        easebuzzBookingmid: this.decrypt(project.easebuzzBookingmid),
        easebuzzMilestonemid: this.decrypt(project.easebuzzMilestonemid),
        easebuzzBookingSalt: this.decrypt(project.easebuzzBookingSalt),
        easebuzzBookingKey: this.decrypt(project.easebuzzBookingKey),
        easebuzzMilestoneSalt: this.decrypt(project.easebuzzMilestoneSalt),
        easebuzzMilestoneKey: this.decrypt(project.easebuzzMilestoneKey),
        razorpayKey: this.decrypt(project.razorpayKey),
        razorpaySecret: this.decrypt(project.razorpaySecret),
        razorpayBookingmid: this.decrypt(project.razorpayBookingmid),
        razorpayMilestonemid: this.decrypt(project.razorpayMilestonemid),

        reraRegularization:
          project.reraRegularization == 0 ? null : project.reraRegularization,
        reraPayable: project.reraPayable == 0 ? null : project.reraPayable,
        rtmRegularization:
          project.rtmRegularization == 0 ? null : project.rtmRegularization,
        rtmPayable: project.rtmPayable == 0 ? null : project.rtmPayable,

        phases: phasesProcessed,
        availableGateways: project.availableGateways,
        agreementPercentage: project.agreementPercentage,
      };

      return {
        message: 'Project fetched successfully.',
        data: formattedOutput,
      };
    } catch (error) {
      logger.error('Error in findOne: ', error.stack);

      return logsAndErrorHandling('ProjectService - findProjectById', error, {
        id,
      });
    }
  }

  private mapRoles(mappings: ProjectUserMapping[]) {
    const res = {
      tl: [],
      crm: [],
      gre: [],
      bis: [],
      finance: [],
      rsh: null,
      ph: null,
    };

    mappings.forEach((m) => {
      const userObj = {
        id: m?.user?.id,
        name: m?.user?.name,
      };

      if (m.role === RolesEnum.SALES_TL) {
        res.tl.push(userObj);
      }

      if (m.role === RolesEnum.CRM) {
        res.crm.push(userObj);
      }
      if (m.role === RolesEnum.GRE) {
        res.gre.push(userObj);
      }
      if (m.role === RolesEnum.BIS) {
        res.bis.push(userObj);
      }
      if (m.role === RolesEnum.FINANCE_ADMIN) {
        res.finance.push(userObj);
      }

      if (m.role === RolesEnum.SALES_RSH) {
        res.rsh = userObj; // assuming single
      }

      if (m.role === RolesEnum.PROJECT_HEAD) {
        res.ph = userObj; // assuming single
      }
    });

    return res;
  }

  private decrypt(value: string) {
    return value ? this.configService.decryptData(value) : null;
  }

  async updateProject(projectId: number, dto: UpdateProjectDto): Promise<any> {
    if (projectId && isNaN(projectId)) {
      throw new BadRequestException('Invalid projectId. It must be a number.');
    }

    return this.projectRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          return await this.executeProjectUpdate(
            transactionalEntityManager,
            projectId,
            dto,
          );
        } catch (error) {
          logger.error('Error updating project:', error);
          return logsAndErrorHandling('ProjectService - updateProject', error, {
            projectId,
            dto,
          });
        }
      },
    );
  }

  private async executeProjectUpdate(
    manager: EntityManager,
    projectId: number,
    dto: UpdateProjectDto,
  ) {
    // Step 1: Fetch project
    const project = await manager.findOne(Projects, {
      where: { id: projectId },
      relations: ['phases'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // Step 2: Validate critical relations BEFORE applying
    if (dto.cityId !== undefined) {
      const city = await manager.findOne(CityMaster, {
        where: { id: dto.cityId },
      });
      if (!city) {
        throw new BadRequestException(
          `City with ID ${dto.cityId} does not exist.`,
        );
      }
    }

    if (dto.brandId !== undefined) {
      const brand = await manager.findOne(Brands, {
        where: { id: dto.brandId },
      });
      if (!brand) {
        throw new BadRequestException(
          `Brand with ID ${dto.brandId} does not exist.`,
        );
      }
    }

    // Step 3: Apply simple field updates (clean)
    const updateData = this.buildProjectData(dto);
    Object.assign(project, updateData);

    // Step 4: Handle phases separately (business logic)
    if (dto?.phaseIds) {
      await this.syncProjectPhases(manager, project, dto.phaseIds);
    }

    const allPhases = dto?.phaseIds
      ? await manager.find(ProjectPhase, {
          where: { id: In(dto.phaseIds) },
        })
      : project.phases;

    this.applyProjectFinancials(project, dto, allPhases);

    // Step 5: Save project
    await manager.save(project);

    // Step 6: Update role mappings (ONLY if provided)
    if (
      dto?.tlIds !== undefined ||
      dto?.crmIds !== undefined ||
      dto?.greIds !== undefined ||
      dto?.rshId !== undefined ||
      dto?.phId !== undefined ||
      dto?.bisIds !== undefined ||
      dto?.financeIds !== undefined
    ) {
      await this.updateProjectUsers(projectId, dto, manager);
    }

    return {
      message: 'Project updated successfully.',
      data: { id: project.id, name: project.name },
    };
  }

  private async syncProjectPhases(
    transactionalEntityManager: EntityManager,
    project: Projects,
    phaseIds: number[],
  ) {
    const phases = await transactionalEntityManager.find(ProjectPhase, {
      where: { id: In(phaseIds) },
      relations: ['brand', 'city', 'project'],
    });

    if (phases?.length !== phaseIds.length) {
      throw new BadRequestException(
        `Some phase IDs provided are invalid or do not exist.`,
      );
    }

    const invalidPhases = phases.filter(
      (phase) =>
        phase?.brand.id !== project?.brand.id ||
        phase?.city.id !== project?.city.id,
    );

    if (invalidPhases.length > 0) {
      const invalidPhaseIds = invalidPhases.map((p) => p.id).join(', ');
      throw new BadRequestException(
        `The following phases do not match the project's city/brand: ${invalidPhaseIds}`,
      );
    }

    const currentPhaseIds = project?.phases?.map((phase) => phase.id) || [];
    const newPhaseIds = phaseIds;

    const phasesToAdd = phases?.filter(
      (phase) => !currentPhaseIds.includes(phase.id),
    );

    phasesToAdd?.forEach((phase) => {
      if (phase?.project?.id) {
        throw new BadRequestException(
          `Phase with ID ${phase.id} is already assigned to another project.`,
        );
      }
    });

    const phasesToRemove = project?.phases.filter(
      (phase) => !newPhaseIds.includes(phase.id),
    );

    for (const phase of phasesToAdd) {
      phase.project = project;
      await transactionalEntityManager.save(phase);
    }

    for (const phase of phasesToRemove) {
      phase.project = null;
      await transactionalEntityManager.save(phase);
    }

    project.phases = phases;
  }

  private applyProjectFinancials(
    project: Projects,
    dto: UpdateProjectDto,
    phases: ProjectPhase[],
  ) {
    const reraStatuses = phases.map((p) => p.reraStatus);
    validateProjectFinancialFields(dto, reraStatuses);

    project.reraRegularization = !isMissing(dto.reraRegularization)
      ? parseFloat(dto.reraRegularization)
      : null;

    project.reraPayable = !isMissing(dto.reraPayable)
      ? parseFloat(dto.reraPayable)
      : null;

    project.rtmRegularization = !isMissing(dto.rtmRegularization)
      ? parseFloat(dto.rtmRegularization)
      : null;

    project.rtmPayable = !isMissing(dto.rtmPayable)
      ? parseFloat(dto.rtmPayable)
      : null;
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    billingEntityIds?: string[],
    brandId?: number,
    cityId?: number,
  ): Promise<any> {
    try {
      const query = this.projectPhaseRepository
        .createQueryBuilder('phase')
        .leftJoin('phase.project', 'project')
        .leftJoin('phase.brand', 'brand')
        .leftJoin('phase.city', 'city')
        .leftJoin('phase.billingEntity', 'billingEntity')
        .select([
          'MAX(phase.id) as id',
          'project.id as projectId',
          'MAX(brand.name) as brand',
          'MAX(city.name) as city',
          'MAX(project.name) as projectName',
          'MAX(phase.reraStatus) as reraStatus',
          'MAX(project.reraRegularization) as reraRegularization',
          'MAX(project.rtmRegularization) as rtmRegularization',
          'MAX(project.reraPayable) as reraPayable',
          'MAX(project.rtmPayable) as rtmPayable',
        ])
        .where('project.id IS NOT NULL');

      // Filter: billingEntityIds
      if (billingEntityIds && billingEntityIds.length > 0) {
        query.andWhere('billingEntity.id IN (:...billingEntityIds)', {
          billingEntityIds,
        });
      }

      // Filter: brandId
      if (brandId) {
        query.andWhere('brand.id = :brandId', { brandId });
      }

      // Filter: cityId
      if (cityId) {
        query.andWhere('city.id = :cityId', { cityId });
      }

      // Filter: search by project name
      if (search) {
        query.andWhere('project.name LIKE :search', { search: `%${search}%` });
      }

      //  Group by project id
      query.groupBy('project.id');

      //  Sorting (Default)
      let sortField = 'MAX(project.createdAt)';
      let sortDirection: 'ASC' | 'DESC' = 'DESC';

      // Sorting (Dynamic)
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        const dir = direction?.toUpperCase();

        const fieldMap: Record<string, string> = {
          projectname: 'MAX(project.name)',
          city: 'MAX(city.name)',
          brand: 'MAX(brand.name)',
        };

        const mappedField = fieldMap[field?.toLowerCase()];
        if (!mappedField || !['ASC', 'DESC'].includes(dir)) {
          throw new BadRequestException(
            'Invalid sortBy field. Allowed: projectName, city, brand. ASC/DESC only.',
          );
        }
        sortField = mappedField;
        sortDirection = dir as 'ASC' | 'DESC';
      }
      query.orderBy(sortField, sortDirection);
      const rawResults = await query.getRawMany();

      const total = rawResults.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = rawResults.slice((page - 1) * limit, page * limit);

      if (total === 0) {
        return {
          message: 'No projects found for the given criteria.',
          data: {
            projects: [],
            total: 0,
            currentPage: page,
            totalPages: 0,
          },
        };
      }

      const projectDetails = paginated.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        brand: row.brand,
        city: row.city,
        projectName: row.projectName,
        reraStatusFlag: row.reraStatus,
        reraRegularization: row.reraRegularization,
        reraPayable: row.reraPayable,
        rtmRegularization: row.rtmRegularization,
        rtmPayable: row.rtmPayable,
      }));
      return {
        message: 'Projects retrieved successfully.',
        data: {
          projects: projectDetails,
          total,
          currentPage: page,
          totalPages: totalPages,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      logger.error('Error in getProjectsByBillingEntityId', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findProjectsByBrand(brandId: number): Promise<any> {
    try {
      if (!brandId) {
        throw new BadRequestException('Brand ID is required.');
      }
      // Validate Brand Existence
      const brand = await this.brandRepository.findOne({
        where: { id: brandId },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${brandId} not found.`);
      }

      // Fetch Projects for the Given Brand
      const projects = await this.projectRepository.find({
        where: { brand: { id: brandId } },
        select: ['id', 'name'], // Only fetch project id & name
      });

      // Return Response
      return {
        message: 'Projects fetched successfully',
        data: {
          brand: {
            id: brand?.id,
            name: brand?.name,
          },
          projects: projects || [],
        },
      };
    } catch (error) {
      logger.error('Failed to fetch projects by brand', error);
      logsAndErrorHandling('projectService', 'findProjectsByBrand', error);
    }
  }

  async findProjectsByBrandCity(
    userId: number,
    cityIds?: number[],
    brandId?: number,
  ): Promise<any> {
    try {
      let query = this.projectRepository
        .createQueryBuilder('project')
        .select(['project.id', 'project.name']);

      query = await this.applyBrandCityFilters(query, userId, cityIds, brandId);

      const projects = await query.getMany();

      return {
        message:
          projects.length > 0
            ? 'Projects fetched successfully'
            : 'No Projects found',
        data: projects || [],
      };
    } catch (error) {
      logger.error('Failed to fetch projects by brand and city', error);
      logsAndErrorHandling('projectService', 'findProjectsByBrandCity', error);
    }
  }

  private async applyBrandCityFilters(
    query: SelectQueryBuilder<Projects>,
    userId: number,
    cityIds?: number[],
    brandId?: number,
  ) {
    let brand = null;

    if (brandId) {
      brand = await this.brandRepository.findOne({
        where: { id: brandId },
        relations: ['cities'],
      });
      if (!brand) throw new NotFoundException(`Brand found with id ${brandId}`);

      query = query
        .innerJoin('project.brand', 'brand')
        .where('brand.id = :brandId', { brandId });
    }

    if (cityIds?.length) {
      const cities = await this.cityRepository.find({
        where: { id: In(cityIds) },
      });

      const foundCityIds = cities.map((city) => city.id);
      const missingCityIds = cityIds.filter((id) => !foundCityIds.includes(id));
      if (missingCityIds.length) {
        throw new NotFoundException(
          `Cities not found with IDs: ${missingCityIds.join(', ')}`,
        );
      }

      if (brand) {
        const brandCityIds = brand.cities.map((city) => city.id);
        const unmatchedCityIds = cityIds.filter(
          (id) => !brandCityIds.includes(id),
        );

        if (unmatchedCityIds.length) {
          throw new BadRequestException(
            `Cities ${unmatchedCityIds.join(', ')} do not belong to brand ID ${brandId}`,
          );
        }
      }

      query = query
        .innerJoin('project.city', 'city')
        .andWhere('city.id IN (:...cityIds)', { cityIds });
    }

    if (!brandId && !cityIds?.length) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role', 'brand'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    }

    return query;
  }

  async projectTerm(projectName: string) {
    try {
      const normalizedName = projectName.trim().toLowerCase();

      const project = await this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.brand', 'brand')
        .where('LOWER(TRIM(project.name)) = :name', { name: normalizedName })
        .orWhere('LOWER(TRIM(project.sfdc_project_name)) = :name', {
          name: normalizedName,
        })
        .orWhere('JSON_CONTAINS(LOWER(project.codename), JSON_QUOTE(:name))', {
          name: normalizedName,
        })
        .getOne();

      if (!project) {
        throw new BadRequestException(
          `No Project found for this ${projectName} project. Please contact your RM`,
        );
      }

      const response = {
        id: project.id,
        brandId: project.brandId,
        projectName: project.name,
        projectImage: project.projectImage,
        brandName: project.brand?.name || null,
        brandLogo: project.brand?.logo || null,
        city: project.city?.name || null,
        termsConditions: project.termsConditions || null,
        jvPartnerLogo: project?.jvPartnerLogo || null,
        projectId: project.id,
      };

      return {
        message: 'Project terms and condition fetched successfully.',
        data: response,
      };
    } catch (error) {
      logger.error('Failed to get Terms and conditions:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get Terms and conditions: ${error?.message}`,
      );
    }
  }
}
