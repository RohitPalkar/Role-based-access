import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Put,
  UseGuards,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectsService } from './project.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../../sso/decorators/user.decorator';
import { FindProjectsQueryDto } from './dtos/find-projects.dto';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Creates a new project.
   * @param createProjectDto Project details.
   * @returns Created project data.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.CREATED, 'projects'))
  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    return await this.projectsService.create(createProjectDto);
  }

  /**
   * Retrieves project phases based on brand and city.
   * @param brandId Brand ID (optional).
   * @param cityId City ID (optional).
   * @returns List of project phases.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @Get('/phases')
  async findProjectPhases(
    @Query('brandId') brandId?: number,
    @Query('cityId') cityId?: number,
  ) {
    return this.projectsService.findProjectPhases(brandId, cityId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.BIS)
  @Get()
  async findAllProjects(@Query() queryDto: FindProjectsQueryDto) {
    const { page, limit, search, sortBy, billingEntities, brandId, cityId } =
      queryDto;

    // Normalize billingEntities: split, trim, remove empty tokens.
    const billingEntityIds =
      billingEntities
        ?.split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0) || [];

    // If no non-empty tokens, treat as undefined (so service receives undefined)
    const billingEntityIdsToPass =
      billingEntityIds.length > 0 ? billingEntityIds : undefined;
    const projects = await this.projectsService.findAll(
      page,
      limit,
      search,
      sortBy,
      billingEntityIdsToPass,
      brandId,
      cityId, // Pass only if not empty
    );

    return projects;
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.BIS)
  @Get('/filter/brand-city')
  async findProjectsCity(
    @User() user: any,
    @Query('brandId') brandId?: number,
    @Query('cityIds') cityIds?: string,
  ) {
    let cityIdsArray: number[] = [];

    // Process cityIds only if it's provided
    if (cityIds) {
      cityIdsArray = cityIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0) // drop empty tokens like '' or '  '
        .map((id) => Number(id))
        .filter((n) => !isNaN(n)); // keep only valid numbers
      if (!cityIdsArray.length) {
        throw new BadRequestException(
          'Invalid cityId format. Expecting comma-separated values.',
        );
      }
    }

    return await this.projectsService.findProjectsByBrandCity(
      user?.dbId,
      cityIdsArray,
      brandId,
    );
  }

  /**
   * Retrieves projects based on brand ID.
   * @param brandId Brand ID (required).
   * @returns List of projects under the specified brand.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @Get('/filter/brand')
  async findProjectsByBrand(@Query('brandId') brandId: number) {
    if (!brandId) throw new BadRequestException(`brandId required`);
    return await this.projectsService.findProjectsByBrand(brandId);
  }

  /**
   * Retrieves project details by ID.
   * @param id Project ID.
   * @returns Project details.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @Get('/:id')
  async findProjectById(@Param('id', ParseIntPipe) id: number) {
    return await this.projectsService.findProjectById(id);
  }

  /**
   * Updates an existing project.
   * @param id Project ID.
   * @param updateProjectDto Updated project details.
   * @returns Updated project data.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'projects'))
  @Put(':id')
  async updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return await this.projectsService.updateProject(id, updateProjectDto);
  }

  /**
   * Retrieves all billing entities.
   * @returns List of billing entities.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.BIS)
  @Get('filters/billing-entities')
  async findAllBillingEntities() {
    return await this.projectsService.findAllBillingEntities();
  }

  @Get('project-term/:projectName')
  async getProjectTerm(@Param('projectName') projectName: string) {
    return await this.projectsService.projectTerm(projectName);
  }
}
