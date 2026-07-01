import { PineLabsApiName } from '../enums/pine-labs-api-name.enum';

export type PineLabsHttpMethod = 'GET' | 'POST' | 'PUT';

/** Caller key → Pine Labs field name, or nested template with `{{field}}` placeholders. */
export type PineLabsPayloadMapping = Record<string, string | unknown>;

export interface PineLabsApiDefinition {
  path: string;
  method: PineLabsHttpMethod;
  headers?: Record<string, string>;
  payloadMapping: PineLabsPayloadMapping;
  /** Caller-side keys that must be present before the HTTP call. */
  requiredFields?: string[];
  /** At least one of these caller-side keys must be present before the HTTP call. */
  requiredOneOf?: string[];
}

export interface PineLabsTokenResponseMapping {
  accessTokenField: string;
  expiresInField: string;
}

export interface PineLabsAuthConfig {
  authUrlEnvKey: string;
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  tokenTtlOverrideEnvKey: string;
  tokenResponseMapping: PineLabsTokenResponseMapping;
  expiryBufferSeconds: number;
  defaultTtlSeconds: number;
  /** Auth request body template; `{{clientId}}` and `{{clientSecret}}` are substituted. */
  requestBodyTemplate: Record<string, string>;
}

export interface PineLabsEnvironmentConfig {
  baseUrlEnvKey: string;
  auth: PineLabsAuthConfig;
  globalHeaders: Record<string, string>;
}

export interface PineLabsCachedToken {
  accessToken: string;
  expiresAt: number;
}

export interface PineLabsExecutorError {
  code?: string;
  message: string;
  statusCode?: number;
}

export interface PineLabsExecutorResult {
  success: boolean;
  data?: unknown;
  error?: PineLabsExecutorError;
  apiName: PineLabsApiName;
  correlationId: string;
}

export interface PineLabsExecutorOptions {
  correlationId?: string;
}
