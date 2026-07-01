import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { EmailTemplatesService } from './email_templates.service';
import { CreateEmailTemplateDto } from './dto/create_template.dto';
import { UpdateEmailTemplateDto } from './dto/update_template.dto';

/**
 * Controller for managing email templates and composition.
 * Exposes CRUD endpoints for templates and a test endpoint to compose emails.
 * Also listens to the COMPOSE_EMAIL event and delegates to the service.
 */
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplateService: EmailTemplatesService) {}

  @Post()
  /**
   * Create a new email template.
   * @param dto Create template payload including event, subject, body, and layout
   */
  async createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.createTemplate(dto);
  }

  @Patch()
  /**
   * Update an existing email template by id.
   * @param dto Update payload with id and fields to update
   */
  async updateTemplate(@Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.updateTemplate(dto);
  }

  @Get()
  /**
   * Get all email templates ordered by creation date.
   */
  async getAllTemplates() {
    return await this.emailTemplateService.getAllTemplates();
  }

  @Get(':event')
  /**
   * Get a specific email template by its event key.
   * @param event Template event identifier
   */
  async getTemplate(@Param('event') event: string) {
    return this.emailTemplateService.getTemplateByEvent(event);
  }

  @Get('compose-email/:event')
  /**
   * Test endpoint to compose an email for a given event with sample variables.
   * Note: This endpoint composes content only and does not send emails.
   * @param event Template event identifier
   */
  async composeEmail(@Param('event') event: string) {
    return this.emailTemplateService.composeEmail(event, {
      NAME: 'John Doe',
      PROJECT: 'Purva',
    });
  }

  @OnEvent(EventMessagesEnum.COMPOSE_EMAIL)
  /**
   * Event listener for COMPOSE_EMAIL. Delegates to service to render and optionally send.
   * @param event ComposeEmailEvent payload containing event key, variables, brand and recipients
   */
  async handleComposeEmail(event: ComposeEmailEvent) {
    return this.emailTemplateService.composeEmail(
      event.event,
      event.variables,
      event.brand,
      event.recipients,
    );
  }
}
