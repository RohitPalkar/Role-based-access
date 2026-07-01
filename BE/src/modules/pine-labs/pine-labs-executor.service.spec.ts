import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';
import { logger } from 'src/logger/logger';
import { PineLabsApiName } from './enums/pine-labs-api-name.enum';
import { PineLabsExecutorService } from './pine-labs-executor.service';
import { PineLabsAuthService } from './pine-labs-auth.service';
import { PineLabsConfigService } from './config/pine-labs-config.service';

describe('PineLabsExecutorService', () => {
  let service: PineLabsExecutorService;
  let authService: {
    getValidToken: jest.Mock;
    refreshToken: jest.Mock;
    invalidateToken: jest.Mock;
  };
  let configService: {
    getApiDefinition: jest.Mock;
    getBaseUrl: jest.Mock;
    getGlobalHeaders: jest.Mock;
  };
  let httpService: {
    post: jest.Mock;
    get: jest.Mock;
    put: jest.Mock;
  };
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const baseDefinition = {
    path: '/customer/fetch',
    method: 'POST' as const,
    payloadMapping: {
      customerId: 'customer_id',
      mobileNumber: 'mobile',
    },
    requiredOneOf: ['customerId', 'mobileNumber'],
  };

  beforeEach(async () => {
    authService = {
      getValidToken: jest.fn().mockResolvedValue('test-token'),
      refreshToken: jest.fn().mockResolvedValue('refreshed-token'),
      invalidateToken: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      getApiDefinition: jest.fn().mockReturnValue(baseDefinition),
      getBaseUrl: jest.fn().mockReturnValue('https://api.pinelabs.test'),
      getGlobalHeaders: jest.fn().mockReturnValue({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    };
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PineLabsExecutorService,
        { provide: HttpService, useValue: httpService },
        { provide: PineLabsAuthService, useValue: authService },
        { provide: PineLabsConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(PineLabsExecutorService);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation((() => {
      /* noop */
    }) as never);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation((() => {
      /* noop */
    }) as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('routes each apiName to the configured path', async () => {
    httpService.post.mockReturnValueOnce(
      of({ data: { success: true, data: { balance: 100 } } }),
    );

    const result = await service.execute(
      PineLabsApiName.CUSTOMER_FETCH,
      { customerId: 'CUST-1' },
      { correlationId: 'corr-123' },
    );

    expect(configService.getApiDefinition).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
    );
    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.pinelabs.test/customer/fetch',
      { customer_id: 'CUST-1' },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'X-Correlation-Id': 'corr-123',
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.correlationId).toBe('corr-123');
  });

  it('maps caller data via config payload mapping (AC-11)', async () => {
    configService.getApiDefinition.mockReturnValueOnce({
      path: '/points/redeem',
      method: 'POST',
      payloadMapping: {
        customerId: 'customer_id',
        points: 'points',
      },
      requiredFields: ['customerId', 'points'],
    });
    httpService.post.mockReturnValueOnce(of({ data: { success: true } }));

    await service.execute(PineLabsApiName.REDEEM_POINTS, {
      customerId: 'CUST-2',
      points: 50,
    });

    expect(httpService.post.mock.calls[0][1]).toEqual({
      customer_id: 'CUST-2',
      points: 50,
    });
  });

  it('retries once on 401 with token refresh and same body', async () => {
    const axiosError = new AxiosError(
      'Unauthorized',
      '401',
      undefined,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'token expired' },
      },
    );

    httpService.post
      .mockReturnValueOnce(throwError(() => axiosError))
      .mockReturnValueOnce(of({ data: { success: true, data: { ok: true } } }));

    const payload = { customerId: 'CUST-3' };
    const result = await service.execute(
      PineLabsApiName.CUSTOMER_FETCH,
      payload,
      { correlationId: 'corr-401' },
    );

    expect(authService.invalidateToken).toHaveBeenCalledTimes(1);
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(httpService.post.mock.calls[0][1]).toEqual(
      httpService.post.mock.calls[1][1],
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Pine Labs API returned 401; refreshing token and retrying',
      expect.objectContaining({
        apiName: PineLabsApiName.CUSTOMER_FETCH,
        correlationId: 'corr-401',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('does not retry a third time when retry also returns 401', async () => {
    const axiosError = new AxiosError(
      'Unauthorized',
      '401',
      undefined,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'still unauthorized' },
      },
    );

    httpService.post
      .mockReturnValueOnce(throwError(() => axiosError))
      .mockReturnValueOnce(throwError(() => axiosError));

    const result = await service.execute(PineLabsApiName.CUSTOMER_FETCH, {
      customerId: 'CUST-4',
    });

    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Pine Labs API request failed',
      expect.objectContaining({
        apiName: PineLabsApiName.CUSTOMER_FETCH,
        isRetry: true,
      }),
    );
  });

  it('returns normalized error for unknown apiName from config service', async () => {
    configService.getApiDefinition.mockImplementation(() => {
      throw new BadRequestException('Unknown Pine Labs API: invalid');
    });

    const result = await service.execute('invalid' as PineLabsApiName, {
      customerId: 'x',
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Unknown Pine Labs API: invalid');
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('returns normalized error when base URL is not configured', async () => {
    configService.getBaseUrl.mockImplementation(() => {
      throw new BadRequestException(
        'Pine Labs base URL is not configured for environment key PINELABS_BASE_URL',
      );
    });

    const result = await service.execute(PineLabsApiName.CUSTOMER_FETCH, {
      customerId: 'CUST-1',
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('base URL is not configured');
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('returns normalized error when required fields are missing', async () => {
    const result = await service.execute(PineLabsApiName.CUSTOMER_FETCH, {});

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Missing required field');
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('maps mobileNumber to mobile for CUSTOMER_FETCH', async () => {
    httpService.post.mockReturnValueOnce(
      of({ data: { success: true, data: { customer_id: 'CUST-MOB' } } }),
    );

    const result = await service.execute(PineLabsApiName.CUSTOMER_FETCH, {
      mobileNumber: '9876543210',
    });

    expect(result.success).toBe(true);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.pinelabs.test/customer/fetch',
      { mobile: '9876543210' },
      expect.any(Object),
    );
  });

  it('logs apiName and correlationId on non-401 failures', async () => {
    const axiosError = new AxiosError(
      'Bad Request',
      '400',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'invalid payload' },
      },
    );
    httpService.post.mockReturnValueOnce(throwError(() => axiosError));

    const result = await service.execute(
      PineLabsApiName.CUSTOMER_FETCH,
      { customerId: 'CUST-5' },
      { correlationId: 'corr-error' },
    );

    expect(result.success).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Pine Labs API request failed',
      expect.objectContaining({
        apiName: PineLabsApiName.CUSTOMER_FETCH,
        correlationId: 'corr-error',
        statusCode: 400,
      }),
    );
  });
});
