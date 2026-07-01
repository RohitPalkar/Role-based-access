import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EmailTemplate } from './entities/email_template.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { CreateEmailTemplateDto } from './dto/create_template.dto';
import { UpdateEmailTemplateDto } from './dto/update_template.dto';
import { BRAND_PURAVANKARA, SUCCESS } from 'src/config/constants';
import { brandMap, resolveBrandType } from 'src/utils/resolveBrand';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { EmailNotifyEvent } from 'src/events/aws.events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomConfigService } from 'src/config/custom-config.service';
import { logger } from '../../logger/logger';

type RenderedEmail = { skipped?: false; subject: string; body: string };
type SkippedEmail = {
  skipped: true;
  reason: 'template_disabled';
  event: string;
  templateId?: number;
  templateName?: string;
  message: string;
};

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: CustomConfigService,
  ) {}

  /**
   * Compose email content for a given template event and variables.
   * Optionally emits SEND_EMAIL with the composed HTML if recipients are provided.
   *
   * @param event Template event identifier
   * @param variables Key-value variables used to replace placeholders in subject/body
   * @param brand Optional brand name to resolve logos/links
   * @param recipients Optional recipients object; if provided, triggers SEND_EMAIL
   * @returns Composed subject and HTML body, or error if template not found
   */
  async composeEmail(
    event: string,
    variables: Record<string, string>,
    brand?: string,
    recipients?: {
      to?: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
    },
  ): Promise<any> {
    try {
      const emailContent = await this.renderEmail(event, variables, brand);
      if (emailContent.skipped === true) {
        return {
          statusCode: SUCCESS,
          message: emailContent.message,
          data: emailContent,
        };
      }
      // trigger SEND_EMAIL if recipients provided
      if (recipients?.to) {
        const responses = await this.eventEmitter.emitAsync(
          EventMessagesEnum.SEND_EMAIL,
          new EmailNotifyEvent(
            recipients.to,
            emailContent.subject,
            emailContent.body,
            emailContent.body,
            recipients.cc,
            recipients.bcc,
          ),
        );
        if (responses.some((res) => res instanceof Error)) {
          throw new InternalServerErrorException(
            responses[0]?.message || 'Failed to send composed email',
          );
        }
      }
      return {
        statusCode: SUCCESS,
        message: 'Email composed successfully',
        data: emailContent,
      };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Create a new email template if the event is unique.
   * @param dto CreateEmailTemplateDto payload
   */
  async createTemplate(dto: CreateEmailTemplateDto): Promise<any> {
    const existing = await this.templateRepo.findOne({
      where: { event: dto.event },
    });
    if (existing) {
      throw new ConflictException(
        `Email template for event "${dto.event}" already exists`,
      );
    }

    const newTemplate = this.templateRepo.create(dto);
    const template = await this.templateRepo.save(newTemplate);
    return {
      statusCode: SUCCESS,
      message: 'Template created successfully',
      data: template,
    };
  }

  /**
   * Update an existing email template by id.
   * @param dto UpdateEmailTemplateDto payload containing id and updates
   */
  async updateTemplate(dto: UpdateEmailTemplateDto): Promise<any> {
    const { id } = dto;
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Email template not found`);
    }
    Object.assign(template, dto);
    const templateUpdated = await this.templateRepo.save(template);
    return {
      statusCode: SUCCESS,
      message: 'Template update successfully',
      data: templateUpdated,
    };
  }

  /**
   * Retrieve an email template by its event key.
   * @param event Event identifier
   */
  async getTemplateByEvent(event: string): Promise<any> {
    const template = await this.templateRepo.findOne({ where: { event } });
    if (!template) {
      throw new NotFoundException(
        `Email template for event "${event}" not found`,
      );
    }
    return {
      statusCode: SUCCESS,
      message: 'Template details fetched successfully',
      data: template,
    };
  }

  /**
   * Retrieve all email templates ordered by creation date (DESC).
   */
  async getAllTemplates(): Promise<any> {
    const templates = await this.templateRepo.find({
      order: { createdAt: 'DESC' },
    });

    return {
      statusCode: SUCCESS,
      message: 'Template details fetched successfully',
      data: templates,
    };
  }

  /**
   * Render an email by fetching the template, replacing placeholders,
   * and applying the selected layout with brand-specific variables.
   *
   * @param event Template event identifier
   * @param variables Placeholder variables
   * @param brand Optional brand to resolve brand assets
   */
  async renderEmail(
    event: string,
    variables: Record<string, string>,
    brand?: string,
  ): Promise<RenderedEmail | SkippedEmail> {
    const brandConfig =
      brandMap[resolveBrandType(brand)] || brandMap[BRAND_PURAVANKARA];
    const { brandName, logoUrl, website, socialLinks, addressHtml } =
      brandConfig;
    const { data: template } = await this.getTemplateByEvent(event);

    if (!template) {
      throw new Error(`Email template for event ${event} not found`);
    }

    if (template.isActive === false) {
      const templateName = template.subject;
      logger.warn(
        `Email template is disabled. Skipping email send. event=${event} templateId=${template.id} templateName=${templateName}`,
      );
      return {
        skipped: true,
        reason: 'template_disabled',
        event,
        templateId: template.id,
        templateName,
        message: 'Email template is disabled. Email sending was skipped.',
      };
    }

    const baseImgUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');
    const subject = this.renderPlaceholders(template.subject, variables);
    const bodyWithVars = this.renderPlaceholders(template.body, variables);
    const layoutBody = this.applyLayout(template.layout, bodyWithVars);
    const finalBody = this.renderPlaceholders(layoutBody, {
      BRAND_NAME: brandName || BRAND_PURAVANKARA,
      BRAND_LOGO: baseImgUrl + logoUrl || '',
      BRAND_WEBSITE: website || '#',
      SOCIAL_FACEBOOK: socialLinks?.facebook || '#',
      SOCIAL_LINKEDIN: socialLinks?.linkedin || '#',
      SOCIAL_INSTAGRAM: socialLinks?.instagram || '#',
      COMPANY_ADDRESS: addressHtml || '',
    });
    return { subject, body: finalBody };
  }

  /**
   * Replace placeholders of the form {KEY} in the provided content
   * using the supplied variables map.
   * @param content Raw template content
   * @param variables Variables map
   */
  private renderPlaceholders(
    content: string,
    variables: Record<string, string>,
  ): string {
    return content.replace(/\{(\w+)\}/g, (_, key) => {
      return variables[key] ?? `{${key}}`;
    });
  }

  /**
   * Apply a layout HTML file around the email body. Falls back to default.html
   * when the requested layout file is not found.
   * @param layoutName Layout file name (without extension)
   * @param body Composed inner HTML body
   */
  private applyLayout(layoutName: string, body: string): string {
    const layoutsDir = path.join(process.cwd(), 'src/templates/email_layouts');
    let layoutFile = path.join(layoutsDir, `${layoutName}.html`);

    if (!fs.existsSync(layoutFile)) {
      layoutFile = path.join(layoutsDir, 'default.html');
    }

    const layout = fs.readFileSync(layoutFile, 'utf-8');
    return layout.replace('{{BODY}}', body);
  }
}
