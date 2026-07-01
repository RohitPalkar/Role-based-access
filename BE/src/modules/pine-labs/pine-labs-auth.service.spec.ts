import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import { CustomConfigService } from 'src/config/custom-config.service';
import { PineLabsAuthService } from './pine-labs-auth.service';
import { PineLabsConfigService } from './config/pine-labs-config.service';
import { PineLabsCachedToken } from './interfaces/pine-labs.interface';

describe('PineLabsAuthService', () => {
  let service: PineLabsAuthService;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let httpService: { post: jest.Mock };
  let configService: {
    getDecrypted: jest.Mock;
    get: jest.Mock;
  };
  let pineLabsConfigService: {
    getAuthConfig: jest.Mock;
  };

  const authConfig = {
    authUrlEnvKey: 'PINE_LABS_AUTH_URL',
    clientIdEnvKey: 'PINE_LABS_CLIENT_ID',
    clientSecretEnvKey: 'PINE_LABS_CLIENT_SECRET',
    tokenTtlOverrideEnvKey: 'PINE_LABS_TOKEN_TTL_SECONDS',
    tokenResponseMapping: {
      accessTokenField: 'access_token',
      expiresInField: 'expires_in',
    },
    expiryBufferSeconds: 60,
    defaultTtlSeconds: 3600,
    requestBodyTemplate: {
      grant_type: 'client_credentials',
      client_id: '{{clientId}}',
      client_secret: '{{clientSecret}}',
    },
  };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    httpService = {
      post: jest.fn(),
    };
    configService = {
      getDecrypted: jest.fn((key: string) => {
        const values: Record<string, string> = {
          PINE_LABS_AUTH_URL: 'https://auth.pinelabs.test/token',
          PINE_LABS_CLIENT_ID: 'client-id',
          PINE_LABS_CLIENT_SECRET: 'client-secret',
        };
        return values[key] ?? '';
      }),
      get: jest.fn().mockReturnValue(undefined),
    };
    pineLabsConfigService = {
      getAuthConfig: jest.fn().mockReturnValue(authConfig),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PineLabsAuthService,
        { provide: HttpService, useValue: httpService },
        { provide: CustomConfigService, useValue: configService },
        { provide: PineLabsConfigService, useValue: pineLabsConfigService },
        { provide: CACHE_MANAGER, useValue: cacheService },
      ],
    }).compile();

    service = moduleRef.get(PineLabsAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached token when still valid (AC-1)', async () => {
    const cached: PineLabsCachedToken = {
      accessToken: 'cached-token',
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    cacheService.get.mockResolvedValueOnce(cached);

    const token = await service.getValidToken();

    expect(token).toBe('cached-token');
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('fetches and stores token when cache is empty (AC-2)', async () => {
    cacheService.get.mockResolvedValueOnce(null);
    httpService.post.mockReturnValueOnce(
      of({
        data: { access_token: 'fresh-token', expires_in: 3600 },
      }),
    );

    const token = await service.getValidToken();

    expect(token).toBe('fresh-token');
    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(cacheService.set).toHaveBeenCalledWith(
      'pine-labs:access-token',
      expect.objectContaining({ accessToken: 'fresh-token' }),
      expect.any(Number),
    );
  });

  it('refreshes token when cache entry is expired (AC-3)', async () => {
    cacheService.get.mockResolvedValueOnce({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 1000,
    });
    httpService.post.mockReturnValueOnce(
      of({
        data: { access_token: 'new-token', expires_in: 3600 },
      }),
    );

    const token = await service.getValidToken();

    expect(token).toBe('new-token');
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent refresh calls (single-flight)', async () => {
    cacheService.get.mockResolvedValue(null);
    httpService.post.mockImplementation(() =>
      of({
        data: { access_token: 'shared-token', expires_in: 3600 },
      }),
    );

    const [first, second] = await Promise.all([
      service.getValidToken(),
      service.getValidToken(),
    ]);

    expect(first).toBe('shared-token');
    expect(second).toBe('shared-token');
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached token', async () => {
    await service.invalidateToken();
    expect(cacheService.del).toHaveBeenCalledWith('pine-labs:access-token');
  });

  it('throws when auth response lacks access token', async () => {
    cacheService.get.mockResolvedValueOnce(null);
    httpService.post.mockReturnValueOnce(of({ data: { expires_in: 3600 } }));

    await expect(service.getValidToken()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
