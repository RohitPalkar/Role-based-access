/**
 * Environment utilities
 */

export const isDevelopment = import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.DEV;
export const isStaging = import.meta.env.VITE_APP_ENV === 'staging';
export const isProduction = import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.PROD;
export const isLocal = import.meta.env.VITE_APP_ENV === 'local';

export const currentEnv = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';

/**
 * Get environment-specific configuration
 */
export const getEnvConfig = () => ({
  env: currentEnv,
  isDev: isDevelopment,
  isStage: isStaging,
  isProd: isProduction,
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
  version: import.meta.env.PACKAGE_VERSION || '1.0.0',
  serverUrl: import.meta.env.VITE_SERVER_URL,
  assetUrl: import.meta.env.VITE_ASSET_URL,
  webSocketUrl: import.meta.env.VITE_WEB_SOCKET_URL,
});

/**
 * Environment-specific console logging
 */
export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(`[${currentEnv.toUpperCase()}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(`[${currentEnv.toUpperCase()}]`, ...args);
    }
  },
  error: (...args: any[]) => {
    console.error(`[${currentEnv.toUpperCase()}]`, ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment || isLocal) {
      console.debug(`[${currentEnv.toUpperCase()}]`, ...args);
    }
  },
};

/**
 * Runtime environment validation
 */
export const validateEnv = () => {
  const requiredVars = [
    'VITE_SERVER_URL',
    'VITE_ASSET_URL',
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value.trim() === '';
  });

  if (missingVars.length > 0) {
    const error = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(error);
    
    if (isProduction) {
      throw new Error(error);
    }
  }

  logger.log('Environment validation passed', {
    env: currentEnv,
    serverUrl: import.meta.env.VITE_SERVER_URL,
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Not available',
  });
};

// Auto-validate environment on import in non-production builds
if (!isProduction) {
  validateEnv();
}