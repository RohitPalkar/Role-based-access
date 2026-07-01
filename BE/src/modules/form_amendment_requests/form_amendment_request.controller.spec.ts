import {
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe } from 'node:test';
import { FormAmendmentRequestsController } from './form_amendment_requests.controller';
import { FormAmendmentRequestService } from './form_amendment_requests.service';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

type FormAmendmentRequestServiceMock = jest.Mocked<
  Pick<
    FormAmendmentRequestService,
    'createRequestLogs' | 'getAmendmentRequest' | 'getAmendmentRequestById'
  >
>;

describe('FormAmendmentRequestsController', () => {
  let controller: FormAmendmentRequestsController;
  let amendmentRequestsService: FormAmendmentRequestServiceMock;

  beforeAll(async () => {
    const serviceMock: FormAmendmentRequestServiceMock = {
      createRequestLogs: jest.fn(),
      getAmendmentRequest: jest.fn(),
      getAmendmentRequestById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormAmendmentRequestsController],
      providers: [
        {
          provide: FormAmendmentRequestService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(FormAmendmentRequestsController);
    amendmentRequestsService = module.get(
      FormAmendmentRequestService,
    ) as FormAmendmentRequestServiceMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAmendmentRequest', () => {
    it('should fetch amendment requests successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const mockResponse = {
        message: 'Form Amendment requests fetched successfully.',
        data: {
          count: 2,
          logs: [
            { id: 1, note: 'a' },
            { id: 2, note: 'b' },
          ],
        },
      };
      amendmentRequestsService.getAmendmentRequest.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.getAmendmentRequest(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty list gracefully when no requests found', async () => {
      const oppId = 'OPP_EMPTY';
      const mockResponse = {
        message: 'Form Amendment requests fetched successfully.',
        data: {
          count: 0,
          logs: [],
        },
      };
      amendmentRequestsService.getAmendmentRequest.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.getAmendmentRequest(oppId);

      expect(result).toEqual(mockResponse);
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
    });

    it('should pass the route param oppId to service unchanged', async () => {
      const oppId = 'OPP-XYZ-001';
      const mockResponse = {
        message: 'Form Amendment requests fetched successfully.',
        data: {
          count: 1,
          logs: [{ id: 99, note: 'ok' }],
        },
      };
      amendmentRequestsService.getAmendmentRequest.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.getAmendmentRequest(oppId);

      expect(result).toEqual(mockResponse);
      expect(
        amendmentRequestsService.getAmendmentRequest,
      ).toHaveBeenCalledTimes(1);
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        'OPP-XYZ-001',
      );
    });

    it('should enforce response time even for larger result sets (success + response time)', async () => {
      const oppId = 'OPP_HEAVY';
      const mockResponse = {
        message: 'Form Amendment requests fetched successfully.',
        data: {
          count: 100,
          logs: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })),
        },
      };
      amendmentRequestsService.getAmendmentRequest.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.getAmendmentRequest(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate HttpException (e.g., NotFoundException) from the service', async () => {
      const oppId = 'OPP404';
      const notFound = new NotFoundException('Opportunity not found');
      amendmentRequestsService.getAmendmentRequest.mockRejectedValueOnce(
        notFound,
      );

      await expect(controller.getAmendmentRequest(oppId)).rejects.toThrow(
        NotFoundException,
      );
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
    });

    it('should surface InternalServerErrorException when service wraps a generic error', async () => {
      const oppId = 'OPP500';
      const wrapped = new InternalServerErrorException(
        'Failed to get request: DB down',
      );
      amendmentRequestsService.getAmendmentRequest.mockRejectedValueOnce(
        wrapped,
      );

      await expect(controller.getAmendmentRequest(oppId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
    });

    it('should propagate generic HttpException (non-NotFound) from the service', async () => {
      const oppId = 'OPP403';
      class CustomHttpError extends HttpException {
        constructor() {
          super('Forbidden', 403);
        }
      }
      const httpErr = new CustomHttpError();
      amendmentRequestsService.getAmendmentRequest.mockRejectedValueOnce(
        httpErr,
      );

      await expect(controller.getAmendmentRequest(oppId)).rejects.toThrow(
        HttpException,
      );
      expect(amendmentRequestsService.getAmendmentRequest).toHaveBeenCalledWith(
        oppId,
      );
    });
  });

  describe('getAmendmentRequestById', () => {
    it('should fetch a request by id successfully (success + response time)', async () => {
      const requestId = 101;
      const mockResponse = {
        message: 'Form Amendment request fetched successfully.',
        data: { id: 101, note: 'check docs', status: 'OPEN' },
      };
      amendmentRequestsService.getAmendmentRequestById.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.getAmendmentRequestById(requestId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(101);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass the numeric route param to service unchanged', async () => {
      const requestId = 777;
      const mockResponse = {
        message: 'Form Amendment request fetched successfully.',
        data: { id: 777, note: 'ok' },
      };
      amendmentRequestsService.getAmendmentRequestById.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.getAmendmentRequestById(requestId);

      expect(result).toEqual(mockResponse);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledTimes(1);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(777);
    });

    it('should enforce response time even when the payload is large (success + response time)', async () => {
      const requestId = 2025;
      const bigPayload = {
        id: 2025,
        note: 'heavy',
        changes: Array.from({ length: 1000 }, (_, i) => ({
          field: `f${i}`,
          from: 'a',
          to: 'b',
        })),
      };
      const mockResponse = {
        message: 'Form Amendment request fetched successfully.',
        data: bigPayload,
      };
      amendmentRequestsService.getAmendmentRequestById.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.getAmendmentRequestById(requestId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(2025);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate NotFoundException when the request is not found', async () => {
      const requestId = 404;
      const notFound = new NotFoundException(
        `Form Amendment request not found with ID: ${requestId}`,
      );
      amendmentRequestsService.getAmendmentRequestById.mockRejectedValueOnce(
        notFound,
      );

      await expect(
        controller.getAmendmentRequestById(requestId),
      ).rejects.toThrow(NotFoundException);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(404);
    });

    it('should surface InternalServerErrorException when service wraps a generic error', async () => {
      const requestId = 500;
      const wrapped = new InternalServerErrorException(
        'Failed to get logs: DB down',
      );
      amendmentRequestsService.getAmendmentRequestById.mockRejectedValueOnce(
        wrapped,
      );

      await expect(
        controller.getAmendmentRequestById(requestId),
      ).rejects.toThrow(InternalServerErrorException);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(500);
    });

    it('should propagate other HttpExceptions from the service (e.g., Forbidden)', async () => {
      const requestId = 403;
      class ForbiddenHttpError extends HttpException {
        constructor() {
          super('Forbidden', 403);
        }
      }
      const httpErr = new ForbiddenHttpError();
      amendmentRequestsService.getAmendmentRequestById.mockRejectedValueOnce(
        httpErr,
      );

      await expect(
        controller.getAmendmentRequestById(requestId),
      ).rejects.toThrow(HttpException);
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(403);
    });

    it('should accept a numeric string id and pass the coerced value to service (if your pipes coerce)', async () => {
      const requestId = '123' as any; // simulate raw param
      const mockResponse = {
        message: 'Form Amendment request fetched successfully.',
        data: { id: 123, note: 'string-id path param' },
      };
      amendmentRequestsService.getAmendmentRequestById.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.getAmendmentRequestById(requestId);

      expect(result).toEqual(mockResponse);
      // If your Param pipes coerce to number, update expectation to 123.
      expect(
        amendmentRequestsService.getAmendmentRequestById,
      ).toHaveBeenCalledWith(requestId);
    });
  });

  describe('createRequestLogs (event handler)', () => {
    const baseDto: any = {
      id: undefined,
      opportunityId: 'OPP-123',
      actorId: 9,
      actorName: 'RM Bob',
      payload: { field: 'email', from: 'a@x.com', to: 'b@y.com' },
      status: 'OPEN',
    };
    it('should forward payload to service and return quickly (fire-and-forget)', async () => {
      const dto = { ...baseDto };
      const mockServiceResponse = {
        message: 'Form Amendment request created successfully.',
        data: { id: 101, ...dto },
      };
      amendmentRequestsService.createRequestLogs.mockResolvedValueOnce(
        mockServiceResponse,
      );

      const start = Date.now();
      const result = await controller.createRequestLogs(dto);
      const duration = Date.now() - start;

      expect(result).toBeUndefined();
      expect(amendmentRequestsService.createRequestLogs).toHaveBeenCalledWith(
        dto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should not block even if service takes longer (success + response time on controller path)', async () => {
      const dto = { ...baseDto, opportunityId: 'OPP-HEAVY' };

      amendmentRequestsService.createRequestLogs.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  message: 'Form Amendment request created successfully.',
                  data: { id: 2025, ...dto },
                }),
              250,
            ),
          ),
      );

      const start = Date.now();
      const result = await controller.createRequestLogs(dto);
      const duration = Date.now() - start;

      expect(result).toBeUndefined();
      expect(amendmentRequestsService.createRequestLogs).toHaveBeenCalledWith(
        dto,
      );
      // Because we didn't await the service, controller returns fast
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should bubble synchronous HttpException thrown by the service', async () => {
      const dto = { ...baseDto, opportunityId: 'OPP-404' };
      const err = new NotFoundException('Opportunity not found');

      // Force a synchronous throw (not a rejected Promise)
      amendmentRequestsService.createRequestLogs.mockImplementationOnce(() => {
        throw err;
      });

      await expect(controller.createRequestLogs(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(amendmentRequestsService.createRequestLogs).toHaveBeenCalledWith(
        dto,
      );
    });

    it('should NOT throw when the service returns a rejected Promise (fire-and-forget caveat)', async () => {
      const dto = { ...baseDto, opportunityId: 'OPP-500' };
      const wrapped = new InternalServerErrorException(
        'Failed to create log: DB down',
      );
      amendmentRequestsService.createRequestLogs.mockImplementationOnce(() =>
        Promise.reject(wrapped).catch(() => undefined),
      );

      await expect(controller.createRequestLogs(dto)).resolves.toBeUndefined();
      expect(amendmentRequestsService.createRequestLogs).toHaveBeenCalledWith(
        dto,
      );
    });
  });
});
