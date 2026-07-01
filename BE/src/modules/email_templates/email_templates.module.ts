import { Module } from '@nestjs/common';
import { EmailTemplatesService } from './email_templates.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email_template.entity';
import { EmailTemplatesController } from './email_templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate])],
  providers: [EmailTemplatesService],
  controllers: [EmailTemplatesController],
})
export class EmailTemplatesModule {}
