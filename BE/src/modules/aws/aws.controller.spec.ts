import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AwsController } from './aws.controller';
import { AwsService } from './aws.service';
import { GetPreSignedURLDto } from './dto/get-presigned-url.dto';
import { describe } from 'node:test';
import UploadFoldersEnum from 'src/enums/upload-folders.enum';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

type AwsServiceMock = jest.Mocked<
  Pick<
    AwsService,
    | 'getPreSignedURL'
    | 'fetchFileFromS3'
    | 'deleteFileFromS3'
    | 'sendEmail'
    | 'uploadToS3'
  >
>;

describe('AwsController', () => {
  let controller: AwsController;
  let awsService: AwsServiceMock;

  beforeAll(async () => {
    const serviceMock: AwsServiceMock = {
      getPreSignedURL: jest.fn(),
      fetchFileFromS3: jest.fn(),
      deleteFileFromS3: jest.fn(),
      sendEmail: jest.fn(),
      uploadToS3: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AwsController],
      providers: [{ provide: AwsService, useValue: serviceMock }],
    }).compile();

    controller = module.get(AwsController);
    awsService = module.get(AwsService) as AwsServiceMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreSignedURL', () => {
    const baseBody: GetPreSignedURLDto = {
      key: 'some-long-file-name-TOO_LONG.pdf',
      folder: UploadFoldersEnum.DOCUMENTS,
    };
    it('should return presigned url successfully (success + response time)', async () => {
      const body = { ...baseBody };

      const mockResponse = {
        message: 'Presigned URL created successfully.',
        data: {
          s3Basepath: 'https://cdn.example.com',
          key: 'documents/12345some-long-file-.pdf', // illustrative, controller test just asserts passthrough from service
          signedUrl: 'https://s3.signed-url',
        },
      };
      awsService.getPreSignedURL.mockResolvedValueOnce(mockResponse as any);

      const start = Date.now();
      const result = await controller.getPreSignedURL(body);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(awsService.getPreSignedURL).toHaveBeenCalledWith(
        body.key,
        body.folder,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass exact DTO params to service (key + folder)', async () => {
      const body: GetPreSignedURLDto = {
        key: 'KYC-PAN-user_7788990123.pdf',
        folder: UploadFoldersEnum.DOCUMENTS,
      };

      const mockResponse = {
        message: 'Presigned URL created successfully.',
        data: {
          s3Basepath: 'https://cdn.example.com',
          key: 'kyc/54321KYC-PAN-user_.pdf',
          signedUrl: 'https://s3.url',
        },
      };
      awsService.getPreSignedURL.mockResolvedValueOnce(mockResponse as any);

      const result = await controller.getPreSignedURL(body);

      expect(result).toEqual(mockResponse);
      expect(awsService.getPreSignedURL).toHaveBeenCalledWith(
        'KYC-PAN-user_7788990123.pdf',
        UploadFoldersEnum.DOCUMENTS,
      );
    });

    it('should handle another success case (different folder) and enforce response time', async () => {
      const body: GetPreSignedURLDto = {
        key: 'invoice-2025-10.pdf',
        folder: UploadFoldersEnum.IMAGES,
      };

      const mockResponse = {
        message: 'Presigned URL created successfully.',
        data: {
          s3Basepath: 'https://cdn.example.com',
          key: 'invoices/abc123invoice-2025-10.pdf',
          signedUrl: 'https://s3.signed-url-2',
        },
      };
      awsService.getPreSignedURL.mockResolvedValueOnce(mockResponse as any);

      const start = Date.now();
      const result = await controller.getPreSignedURL(body);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(awsService.getPreSignedURL).toHaveBeenCalledWith(
        'invoice-2025-10.pdf',
        UploadFoldersEnum.IMAGES,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    // ---- Propagated errors from service ----

    it('should surface InternalServerErrorException when service fails', async () => {
      const body = { ...baseBody };
      awsService.getPreSignedURL.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to generate Presigned URL'),
      );

      await expect(controller.getPreSignedURL(body)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(awsService.getPreSignedURL).toHaveBeenCalledWith(
        body.key,
        body.folder,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const body = { ...baseBody, key: 'contract-2025-09.pdf' };
      const err = new Error('S3 down');
      awsService.getPreSignedURL.mockRejectedValueOnce(err);

      await expect(controller.getPreSignedURL(body)).rejects.toThrow(err);
      expect(awsService.getPreSignedURL).toHaveBeenCalledWith(
        body.key,
        body.folder,
      );
    });
  });

  describe('deleteFileFromS3', () => {
    it('should delete file successfully (success + response time)', async () => {
      const key = 'documents/abc123-invoice.pdf';

      const mockResponse = {
        statusCode: 200,
        message: 'File deleted successfully.',
        data: null,
      };
      awsService.deleteFileFromS3.mockResolvedValueOnce(mockResponse as any);

      const start = Date.now();
      const result = await controller.deleteFileFromS3(key);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(awsService.deleteFileFromS3).toHaveBeenCalledWith(key);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass exact key to service', async () => {
      const key = 'kyc/USER_7788990123/pan.pdf';

      const mockResponse = {
        statusCode: 200,
        message: 'File deleted successfully.',
        data: null,
      };
      awsService.deleteFileFromS3.mockResolvedValueOnce(mockResponse as any);

      const result = await controller.deleteFileFromS3(key);

      expect(result).toEqual(mockResponse);
      expect(awsService.deleteFileFromS3).toHaveBeenCalledWith(
        'kyc/USER_7788990123/pan.pdf',
      );
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      const key = 'documents/missing.pdf';
      awsService.deleteFileFromS3.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to delete file'),
      );

      await expect(controller.deleteFileFromS3(key)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(awsService.deleteFileFromS3).toHaveBeenCalledWith(key);
    });

    it('should propagate generic errors from the service', async () => {
      const key = 'contracts/2025-09/contract.pdf';
      const err = new Error('S3 down');
      awsService.deleteFileFromS3.mockRejectedValueOnce(err);

      await expect(controller.deleteFileFromS3(key)).rejects.toThrow(err);
      expect(awsService.deleteFileFromS3).toHaveBeenCalledWith(key);
    });
  });

  describe('fetchFileFromS3 (event handler)', () => {
    const baseEvent = { key: 'documents/reports/sample.pdf' } as {
      key: string;
    }; // S3FileFetchEvent shape

    it('should fetch file buffer successfully (success + response time)', async () => {
      const s3Event = { ...baseEvent };
      const mockBuffer = Buffer.from('%PDF-1.4 mock'); // whatever buffer

      awsService.fetchFileFromS3.mockResolvedValueOnce(mockBuffer as any);

      const start = Date.now();
      const result = await controller.fetchFileFromS3(s3Event as any);
      const duration = Date.now() - start;

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(mockBuffer);
      expect(awsService.fetchFileFromS3).toHaveBeenCalledWith(s3Event.key);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return null when service returns null (NoSuchKey / empty)', async () => {
      const s3Event = { key: 'kyc/USER_7788990123/pan.pdf' };

      awsService.fetchFileFromS3.mockResolvedValueOnce(null as any);

      const result = await controller.fetchFileFromS3(s3Event as any);

      expect(result).toBeNull();
      expect(awsService.fetchFileFromS3).toHaveBeenCalledWith(
        'kyc/USER_7788990123/pan.pdf',
      );
    });

    it('should propagate generic errors from the service (reject path)', async () => {
      const s3Event = { key: 'bad/path/missing.pdf' };
      const err = new Error('S3 GetObject failed');

      awsService.fetchFileFromS3.mockRejectedValueOnce(err);

      await expect(controller.fetchFileFromS3(s3Event as any)).rejects.toThrow(
        err,
      );
      expect(awsService.fetchFileFromS3).toHaveBeenCalledWith(s3Event.key);
    });
  });

  // -------------
  // sendEmail handler
  // -------------
  describe('sendEmail (event handler)', () => {
    const baseEmailEvent = {
      to: 'user@example.com',
      subject: 'Hello',
      textBody: 'Hi there',
      htmlBody: undefined,
      cc: undefined,
      bcc: undefined,
    } as {
      to: string | string[];
      subject: string;
      textBody?: string;
      htmlBody?: string;
      cc?: string | string[];
      bcc?: string | string[];
    }; // EmailNotifyEvent shape

    it('should send email successfully (success + response time)', async () => {
      const emailEvent = { ...baseEmailEvent };

      const mockResponse = {
        data: {
          messageId: 'mock-message-id-123',
          recipients: 'user@example.com',
        },
      };
      awsService.sendEmail.mockResolvedValueOnce(mockResponse as any);

      const start = Date.now();
      const result = await controller.sendEmail(emailEvent as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(awsService.sendEmail).toHaveBeenCalledWith(emailEvent as any);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass through full event (arrays + htmlBody) to service', async () => {
      const emailEvent = {
        to: ['a@ex.com', 'b@ex.com'],
        cc: ['c1@ex.com', 'c2@ex.com'],
        bcc: 'hidden@ex.com',
        subject: 'Monthly Report',
        textBody: undefined,
        htmlBody: '<h1>Report</h1>',
      };

      const mockResponse = {
        data: {
          messageId: 'msg-999',
          recipients: 'a@ex.com,b@ex.com',
        },
      };
      awsService.sendEmail.mockResolvedValueOnce(mockResponse as any);

      const result = await controller.sendEmail(emailEvent as any);

      expect(result).toEqual(mockResponse);
      expect(awsService.sendEmail).toHaveBeenCalledWith(emailEvent as any);
    });

    it('should return HttpException instance as-is when service returns it (service catch-return pattern)', async () => {
      const emailEvent = { ...baseEmailEvent, to: '' }; // invalid, for example
      const badReq = new BadRequestException('Invalid recipient');

      awsService.sendEmail.mockResolvedValueOnce(badReq as any);

      const result = await controller.sendEmail(emailEvent as any);

      expect(result).toBeInstanceOf(BadRequestException);
      expect(awsService.sendEmail).toHaveBeenCalledWith(emailEvent as any);
    });

    it('should return InternalServerErrorException instance as-is when service returns it', async () => {
      const emailEvent = { ...baseEmailEvent, subject: 'Oops' };
      const isErr = new InternalServerErrorException('SES not reachable');

      awsService.sendEmail.mockResolvedValueOnce(isErr as any);

      const result = await controller.sendEmail(emailEvent as any);

      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(awsService.sendEmail).toHaveBeenCalledWith(emailEvent as any);
    });

    it('should propagate generic errors from the service (reject path)', async () => {
      const emailEvent = { ...baseEmailEvent, to: 'ops@example.com' };
      const err = new Error('SES down');

      awsService.sendEmail.mockRejectedValueOnce(err);

      await expect(controller.sendEmail(emailEvent as any)).rejects.toThrow(
        err,
      );
      expect(awsService.sendEmail).toHaveBeenCalledWith(emailEvent as any);
    });
  });
});
