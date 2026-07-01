import NodeEnv from 'src/enums/node-env.enum';
import { PineLabsEnvironmentConfig } from '../interfaces/pine-labs.interface';

/**
 * Pine Labs environment configuration.
 *
 * Env vars (add to deployment config; values may be AES-encrypted via getDecrypted):
 * - PINE_LABS_BASE_URL_DEV / PINE_LABS_BASE_URL_UAT / PINE_LABS_BASE_URL_PROD
 * - PINE_LABS_AUTH_URL
 * - PINE_LABS_CLIENT_ID / PINE_LABS_CLIENT_SECRET
 * - PINE_LABS_TOKEN_TTL_SECONDS (optional override)
 */
const sharedAuthConfig = {
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
} as const;

export const PINE_LABS_ENV_CONFIG: Record<
  NodeEnv.DEV | NodeEnv.UAT | NodeEnv.PROD,
  PineLabsEnvironmentConfig
> = {
  [NodeEnv.DEV]: {
    baseUrlEnvKey: 'PINE_LABS_BASE_URL_DEV',
    auth: { ...sharedAuthConfig },
    globalHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  [NodeEnv.UAT]: {
    baseUrlEnvKey: 'PINE_LABS_BASE_URL_UAT',
    auth: { ...sharedAuthConfig },
    globalHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  [NodeEnv.PROD]: {
    baseUrlEnvKey: 'PINE_LABS_BASE_URL_PROD',
    auth: { ...sharedAuthConfig },
    globalHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
};
