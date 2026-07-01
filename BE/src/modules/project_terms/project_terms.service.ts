import {
  HttpException,
  Injectable /*, NotFoundException*/,
  InternalServerErrorException,
} from '@nestjs/common';
import { ProjectTerm } from './entities/project_term.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { logger } from 'src/logger/logger';

@Injectable()
export class ProjectTermsService {
  constructor(
    @InjectRepository(ProjectTerm)
    private readonly projectTermsRepository: Repository<ProjectTerm>,
  ) {}

  //To return the type of terms and conditions based on the project name and brand name
  async getTermsConditions(
    projectName: string,
    brandName: string,
  ): Promise<any> {
    try {
      let found = await this.projectTermsRepository.findOne({
        where: { projectName, brandName },
      });

      // If no record is found with both `projectName` and `brandName`, try `brandName` alone
      if (!found) {
        found = await this.projectTermsRepository.findOne({
          where: { brandName },
        });
      }

      return {
        message: 'Project terms and condition fetched successfully.',
        data: {
          ...found,
          id: found.projectId,
        },
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
