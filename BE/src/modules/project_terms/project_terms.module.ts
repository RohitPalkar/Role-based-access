import { Module } from '@nestjs/common';
import { ProjectTermsService } from './project_terms.service';
import { ProjectTermsController } from './project_terms.controller';
import { ProjectTerm } from './entities/project_term.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectTerm])],
  providers: [ProjectTermsService],
  controllers: [ProjectTermsController],
  exports: [ProjectTermsService, TypeOrmModule],
})
export class ProjectTermsModule {}
