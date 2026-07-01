import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import { getRequestContext } from 'src/infra/request-context';
import { logger } from 'src/logger/logger';
import {
  buildNormalizedError,
  mapPayload,
  normalizePineLabsResponse,
  sanitizeForLog,
} from 'src/helpers/pine-labs.helper';
import { PineLabsApiName } from './enums/pine-labs-api-name.enum';
import {
  PineLabsApiDefinition,
  PineLabsExecutorOptions,
  PineLabsExecutorResult,
  PineLabsHttpMethod,
} from './interfaces/pine-labs.interface';
import { PineLabsAuthService } from './pine-labs-auth.service';
import { PineLabsConfigService } from './config/pine-labs-config.service';

@Injectable()
export class PineLabsExecutorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly authService: PineLabsAuthService,
    private readonly configService: PineLabsConfigService,
  ) {}

  async execute(
    apiName: PineLabsApiName,
    data: Record<string, unknown>,
    options?: PineLabsExecutorOptions,
  ): Promise<PineLabsExecutorResult> {
    const correlationId =
      options?.correlationId ?? getRequestContext()?.requestId ?? randomUUID();

    try {
      const definition = this.configService.getApiDefinition(apiName);
      const baseUrl = this.configService.getBaseUrl();
      const body = mapPayload(definition, data);
      const url = `${baseUrl}${definition.path}`;

      return {
        success: true,
        data: {},
        error: null,
        apiName: apiName,
        correlationId: '',
      };
      return await this.executeWithRetry(
        apiName,
        correlationId,
        definition,
        url,
        body,
        false,
      );
    } catch (error) {
      return this.handlePreflightError(error, apiName, correlationId);
    }
  }

  private async executeWithRetry(
    apiName: PineLabsApiName,
    correlationId: string,
    definition: PineLabsApiDefinition,
    url: string,
    body: unknown,
    isRetry: boolean,
  ): Promise<PineLabsExecutorResult> {
    try {
      const token = await this.authService.getValidToken();
      const headers = this.buildHeaders(definition, token, correlationId);
      const raw = await this.executeHttp(definition.method, url, body, headers);
      return normalizePineLabsResponse(raw, apiName, correlationId);
    } catch (error) {
      if (!isRetry && this.isUnauthorizedError(error)) {
        logger.warn(
          'Pine Labs API returned 401; refreshing token and retrying',
          {
            apiName,
            correlationId,
          },
        );
        await this.authService.invalidateToken();
        await this.authService.refreshToken();
        return this.executeWithRetry(
          apiName,
          correlationId,
          definition,
          url,
          body,
          true,
        );
      }

      return this.handleExecutionError(error, apiName, correlationId, isRetry);
    }
  }

  private buildHeaders(
    definition: PineLabsApiDefinition,
    token: string,
    correlationId: string,
  ): Record<string, string> {
    return {
      ...this.configService.getGlobalHeaders(),
      ...(definition.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'X-Correlation-Id': correlationId,
    };
  }

  private async executeHttp(
    method: PineLabsHttpMethod,
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<unknown> {
    const config = { headers, responseType: 'json' as const };

    if (method === 'GET') {
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data;
    }

    if (method === 'PUT') {
      const response = await firstValueFrom(
        this.httpService.put(url, body, config),
      );
      return response.data;
    }

    const response = await firstValueFrom(
      this.httpService.post(url, body, config),
    );
    return response.data;
  }

  private isUnauthorizedError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }
    return false;
  }

  private handlePreflightError(
    error: unknown,
    apiName: PineLabsApiName,
    correlationId: string,
  ): PineLabsExecutorResult {
    if (error instanceof BadRequestException) {
      const message = this.extractHttpExceptionMessage(error);
      logger.error('Pine Labs executor pre-flight validation failed', {
        apiName,
        correlationId,
        message,
      });
      return buildNormalizedError(apiName, correlationId, message);
    }
    throw error;
  }

  private extractHttpExceptionMessage(error: BadRequestException): string {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    const message = (response as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return error.message;
  }

  private handleExecutionError(
    error: unknown,
    apiName: PineLabsApiName,
    correlationId: string,
    isRetry: boolean,
  ): PineLabsExecutorResult {
    const statusCode =
      error instanceof AxiosError ? error.response?.status : undefined;
    const responseBody =
      error instanceof AxiosError ? error.response?.data : undefined;
    const message =
      error instanceof Error ? error.message : 'Pine Labs API request failed';

    logger.error('Pine Labs API request failed', {
      apiName,
      correlationId,
      isRetry,
      statusCode,
      body: sanitizeForLog(responseBody),
    });

    if (responseBody !== undefined) {
      const normalized = normalizePineLabsResponse(
        responseBody,
        apiName,
        correlationId,
      );
      if (!normalized.success) {
        return normalized;
      }
    }

    return buildNormalizedError(apiName, correlationId, message, statusCode);
  }
}
