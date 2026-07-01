import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { CustomConfigService } from 'src/config/custom-config.service';
import { httpPost } from 'src/utils/http.utils';
import { logger } from 'src/logger/logger';
import {
  PineLabsAuthConfig,
  PineLabsCachedToken,
} from './interfaces/pine-labs.interface';
import { PineLabsConfigService } from './config/pine-labs-config.service';

const CACHE_KEY = 'pine-labs:access-token';

@Injectable()
export class PineLabsAuthService {
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: CustomConfigService,
    private readonly pineLabsConfigService: PineLabsConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  async getValidToken(): Promise<string> {
    const authConfig = this.pineLabsConfigService.getAuthConfig();
    const bufferMs = authConfig.expiryBufferSeconds * 1000;
    const cached = await this.cacheService.get<PineLabsCachedToken>(CACHE_KEY);

    if (cached?.accessToken && cached.expiresAt > Date.now() + bufferMs) {
      return cached.accessToken;
    }

    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchAndCacheToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async invalidateToken(): Promise<void> {
    await this.cacheService.del(CACHE_KEY);
  }

  private async fetchAndCacheToken(): Promise<string> {
    const authConfig = this.pineLabsConfigService.getAuthConfig();
    const authUrl = this.configService.getDecrypted(authConfig.authUrlEnvKey);
    if (!authUrl) {
      throw new UnauthorizedException('Pine Labs auth URL is not configured');
    }

    const clientId = this.configService.getDecrypted(authConfig.clientIdEnvKey);
    const clientSecret = this.configService.getDecrypted(
      authConfig.clientSecretEnvKey,
    );
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'Pine Labs client credentials are not configured',
      );
    }

    const requestBody = this.buildAuthRequestBody(
      authConfig,
      clientId,
      clientSecret,
    );

    try {
      const response = await httpPost<Record<string, unknown>>(
        this.httpService,
        authUrl,
        requestBody,
      );
      return this.cacheTokenFromResponse(authConfig, response);
    } catch (error) {
      logger.error('Failed to generate Pine Labs access token:', error);
      throw new UnauthorizedException(
        'Failed to generate Pine Labs access token',
      );
    }
  }

  private buildAuthRequestBody(
    authConfig: PineLabsAuthConfig,
    clientId: string,
    clientSecret: string,
  ): Record<string, string> {
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(authConfig.requestBodyTemplate)) {
      body[key] = value
        .replace('{{clientId}}', clientId)
        .replace('{{clientSecret}}', clientSecret);
    }
    return body;
  }

  private async cacheTokenFromResponse(
    authConfig: PineLabsAuthConfig,
    response: Record<string, unknown>,
  ): Promise<string> {
    const { accessTokenField, expiresInField } =
      authConfig.tokenResponseMapping;
    const accessToken = response[accessTokenField];
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new UnauthorizedException(
        'Pine Labs auth response did not include an access token',
      );
    }

    const ttlOverride = Number(
      this.configService.get<string>(authConfig.tokenTtlOverrideEnvKey),
    );
    const expiresInRaw = response[expiresInField];
    const expiresInSeconds = Number.isFinite(ttlOverride)
      ? ttlOverride
      : typeof expiresInRaw === 'number'
        ? expiresInRaw
        : Number(expiresInRaw) || authConfig.defaultTtlSeconds;

    const bufferMs = authConfig.expiryBufferSeconds * 1000;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const ttlMs = Math.max(expiresInSeconds * 1000 - bufferMs, 1000);

    const cachedToken: PineLabsCachedToken = {
      accessToken,
      expiresAt,
    };
    await this.cacheService.set(CACHE_KEY, cachedToken, ttlMs);
    return accessToken;
  }
}
