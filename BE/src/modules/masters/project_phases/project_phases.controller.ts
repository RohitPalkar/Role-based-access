import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ProjectPhasesService } from './project_phases.service';
import { UpdateProjectPhaseDto } from './dtos/update-project-phase.dto';
import { FindProjectPhasesQueryDto } from './dtos/find-project-phases.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { CreatePhaseDto } from './dtos/create-phase.dto';
import { UpdatePhaseDto } from './dtos/update-phase.dto';

@Controller('project-phases')
export class ProjectPhasesController {
  constructor(private readonly projectPhasesService: ProjectPhasesService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('/list')
  async findProjectPhasesList(@Query() queryDto: FindProjectPhasesQueryDto) {
    const { page, limit, brandId, cityIds, search } = queryDto;
    return await this.projectPhasesService.findProjectPhasesList(
      page,
      limit,
      brandId,
      cityIds,
      search,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get('/:id')
  async findProjectPhaseById(@Param('id') id: number) {
    return await this.projectPhasesService.findProjectPhaseById(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Patch('/:id')
  async updateProjectPhase(
    @Param('id') id: number,
    @Body() updateProjectPhaseDto: UpdateProjectPhaseDto,
  ) {
    return await this.projectPhasesService.updateProjectPhase(
      id,
      updateProjectPhaseDto,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post()
  async create(@Body() createProjectDto: CreatePhaseDto) {
    return await this.projectPhasesService.createProject(createProjectDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Patch('update-phase/:id')
  async update(
    @Param('id') id: number,
    @Body() updateProjectDto: UpdatePhaseDto,
  ) {
    return this.projectPhasesService.updatePhase(id, updateProjectDto);
  }
}
