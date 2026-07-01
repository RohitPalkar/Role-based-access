import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplatesController } from './email_templates.controller';
import { EmailTemplatesService } from './email_templates.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

describe('EmailTemplatesController', () => {
  let controller: EmailTemplatesController;
  let service: jest.Mocked<EmailTemplatesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplatesController],
      providers: [
        {
          provide: EmailTemplatesService,
          useValue: {
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            getAllTemplates: jest.fn(),
            getTemplateByEvent: jest.fn(),
            composeEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmailTemplatesController>(EmailTemplatesController);
    service = module.get<jest.Mocked<EmailTemplatesService>>(
      EmailTemplatesService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const dto: any = {
        event: 'test_event',
        subject: 'Sub',
        body: 'Body',
        layout: 'default',
      };
      const mockResponse = {
        statusCode: 200,
        message: 'Template created successfully',
        data: { id: 1, ...dto },
      };
      service.createTemplate.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.createTemplate(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.createTemplate).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw ConflictException when event already exists', async () => {
      const dto: any = {
        event: 'duplicate',
        subject: 's',
        body: 'b',
        layout: 'default',
      };
      service.createTemplate.mockRejectedValueOnce(
        new ConflictException('exists'),
      );

      await expect(controller.createTemplate(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.createTemplate).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const dto: any = { id: 1, subject: 'Updated' };
      const mockResponse = {
        statusCode: 200,
        message: 'Template update successfully',
        data: { id: 1, subject: 'Updated' },
      };
      service.updateTemplate.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateTemplate(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.updateTemplate).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when template not found', async () => {
      const dto: any = { id: 999, subject: 'x' };
      service.updateTemplate.mockRejectedValueOnce(
        new NotFoundException('not found'),
      );

      await expect(controller.updateTemplate(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.updateTemplate).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Template details fetched successfully',
        data: [{ id: 1 }, { id: 2 }],
      };
      service.getAllTemplates.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.getAllTemplates();
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.getAllTemplates).toHaveBeenCalled();
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle service errors', async () => {
      const error = new Error('db error');
      service.getAllTemplates.mockRejectedValueOnce(error);
      await expect(controller.getAllTemplates()).rejects.toThrow(error);
    });
  });

  describe('getTemplate', () => {
    it('should return template by event', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Template details fetched successfully',
        data: { id: 1, event: 'x' },
      };
      service.getTemplateByEvent.mockResolvedValueOnce(mockResponse);

      const result = await controller.getTemplate('x');
      expect(result).toEqual(mockResponse);
      expect(service.getTemplateByEvent).toHaveBeenCalledWith('x');
    });

    it('should throw NotFoundException when not found', async () => {
      service.getTemplateByEvent.mockRejectedValueOnce(
        new NotFoundException('not found'),
      );
      await expect(controller.getTemplate('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getTemplateByEvent).toHaveBeenCalledWith('missing');
    });
  });

  describe('composeEmail (test endpoint)', () => {
    it('should compose email successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Email composed successfully',
        data: { subject: 'S', body: '<p>B</p>' },
      };
      service.composeEmail.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.composeEmail('event_key');
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.composeEmail).toHaveBeenCalledWith('event_key', {
        NAME: 'John Doe',
        PROJECT: 'Purva',
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle NotFoundException for missing template', async () => {
      service.composeEmail.mockRejectedValueOnce(
        new NotFoundException('missing'),
      );
      await expect(controller.composeEmail('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(service.composeEmail).toHaveBeenCalledWith('missing', {
        NAME: 'John Doe',
        PROJECT: 'Purva',
      });
    });
  });

  describe('handleComposeEmail (event listener)', () => {
    it('should delegate to service and return response', async () => {
      const event: any = {
        event: 'event_key',
        variables: { A: 'a' },
        brand: 'Puravankara',
        recipients: { to: 'a@b.com', cc: ['c@d.com'], bcc: [] },
      };
      const mockResponse = {
        statusCode: 200,
        message: 'Email composed successfully',
        data: { subject: 'S', body: '<p>B</p>' },
      };
      service.composeEmail.mockResolvedValueOnce(mockResponse);

      const result = await controller.handleComposeEmail(event);
      expect(result).toEqual(mockResponse);
      expect(service.composeEmail).toHaveBeenCalledWith(
        'event_key',
        { A: 'a' },
        'Puravankara',
        { to: 'a@b.com', cc: ['c@d.com'], bcc: [] },
      );
    });

    it('should propagate errors from service', async () => {
      const event: any = {
        event: 'x',
        variables: {},
        brand: 'Puravankara',
        recipients: { to: 'x@y.com' },
      };
      service.composeEmail.mockRejectedValueOnce(
        new BadRequestException('Invalid'),
      );
      await expect(controller.handleComposeEmail(event)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
