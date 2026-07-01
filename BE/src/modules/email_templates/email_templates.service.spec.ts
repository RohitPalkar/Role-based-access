import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailTemplatesService } from './email_templates.service';
import { EmailTemplate } from './entities/email_template.entity';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SUCCESS } from 'src/config/constants';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { logger } from '../../logger/logger';

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;
  let templateRepo: { findOne: jest.Mock };
  let eventEmitter: { emitAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let warnSpy: jest.SpyInstance;

  const baseTemplate = {
    id: 42,
    event: 'event_key',
    subject: 'Welcome {NAME}',
    body: '<p>Hello {NAME} from {PROJECT}</p>',
    layout: 'default',
    isActive: true,
  };

  beforeEach(async () => {
    templateRepo = { findOne: jest.fn() };
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    configService = { get: jest.fn().mockReturnValue('https://example/') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplatesService,
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: templateRepo,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: CustomConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get<EmailTemplatesService>(EmailTemplatesService);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation((() => {
      /* noop */
    }) as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    warnSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('composeEmail — AC4 active template', () => {
    it('renders, sends, and returns a successful response when isActive=true', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...baseTemplate });

      const result = await service.composeEmail(
        'event_key',
        { NAME: 'John', PROJECT: 'Purva' },
        'Puravankara',
        { to: 'john@example.com' },
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Email composed successfully');
      expect(typeof result.data.subject).toBe('string');
      expect(typeof result.data.body).toBe('string');
      expect(result.data.subject).toContain('John');
      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emitAsync.mock.calls[0][0]).toBe(
        EventMessagesEnum.SEND_EMAIL,
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('renders without dispatching when no recipients are provided', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...baseTemplate });

      const result = await service.composeEmail(
        'event_key',
        { NAME: 'Jane', PROJECT: 'Purva' },
        'Puravankara',
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Email composed successfully');
      expect(typeof result.data.subject).toBe('string');
      expect(typeof result.data.body).toBe('string');
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('composeEmail — AC1 & AC3 disabled template', () => {
    it('skips rendering, skips dispatch, and returns a skipped envelope', async () => {
      const disabled = { ...baseTemplate, isActive: false };
      templateRepo.findOne.mockResolvedValueOnce(disabled);

      const result = await service.composeEmail(
        'event_key',
        { NAME: 'John', PROJECT: 'Purva' },
        'Puravankara',
        { to: 'john@example.com' },
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toContain('Email template is disabled');
      expect(result.data).toEqual(
        expect.objectContaining({
          skipped: true,
          reason: 'template_disabled',
          event: 'event_key',
          templateId: disabled.id,
          templateName: disabled.subject,
        }),
      );
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('composeEmail — AC2 warning log on disabled', () => {
    it('emits a warn log containing event, template id, and subject', async () => {
      const disabled = { ...baseTemplate, isActive: false };
      templateRepo.findOne.mockResolvedValueOnce(disabled);

      await service.composeEmail(
        'event_key',
        { NAME: 'John', PROJECT: 'Purva' },
        'Puravankara',
        { to: 'john@example.com' },
      );

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = warnSpy.mock.calls[0][0] as string;
      expect(message).toContain('event_key');
      expect(message).toContain(String(disabled.id));
      expect(message).toContain(disabled.subject);
      expect(message.toLowerCase()).toContain('disabled');
    });
  });

  describe('composeEmail — AC5 template not found', () => {
    it('still throws NotFoundException when the template lookup is empty', async () => {
      templateRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.composeEmail('missing_event', { NAME: 'John' }, 'Puravankara', {
          to: 'john@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('renderEmail union return', () => {
    it('returns subject/body for active templates', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...baseTemplate });

      const rendered = await service.renderEmail(
        'event_key',
        { NAME: 'Jane', PROJECT: 'Purva' },
        'Puravankara',
      );

      expect((rendered as { skipped?: boolean }).skipped).toBeFalsy();
      expect(typeof (rendered as { subject: string }).subject).toBe('string');
      expect(typeof (rendered as { body: string }).body).toBe('string');
    });

    it('returns a skipped payload for disabled templates without throwing', async () => {
      templateRepo.findOne.mockResolvedValueOnce({
        ...baseTemplate,
        isActive: false,
      });

      const rendered = await service.renderEmail(
        'event_key',
        { NAME: 'Jane' },
        'Puravankara',
      );

      expect(rendered).toEqual(
        expect.objectContaining({
          skipped: true,
          reason: 'template_disabled',
          event: 'event_key',
          templateId: baseTemplate.id,
          templateName: baseTemplate.subject,
        }),
      );
    });
  });
});
