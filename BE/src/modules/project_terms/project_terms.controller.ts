import { Controller, Get, Param } from '@nestjs/common';
import { ProjectTermsService } from './project_terms.service';
import { ProjectTerm } from './entities/project_term.entity';

@Controller('project-terms')
export class ProjectTermsController {
  constructor(private readonly projectTermsService: ProjectTermsService) {}

  @Get('/:projectName/:brandName')
  getTermsConditions(
    @Param('projectName') projectName: string,
    @Param('brandName') brandName: string,
  ): Promise<ProjectTerm> {
    return this.projectTermsService.getTermsConditions(projectName, brandName);
  }
}
