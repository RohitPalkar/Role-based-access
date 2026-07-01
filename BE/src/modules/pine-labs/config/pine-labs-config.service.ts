import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomConfigService } from 'src/config/custom-config.service';
import NodeEnv from 'src/enums/node-env.enum';
import { PineLabsApiName } from '../enums/pine-labs-api-name.enum';
import {
  PineLabsApiDefinition,
  PineLabsAuthConfig,
  PineLabsEnvironmentConfig,
} from '../interfaces/pine-labs.interface';
import { PINE_LABS_API_DEFINITIONS } from './pine-labs-api.definitions';
import { PINE_LABS_ENV_CONFIG } from './pine-labs.config';

@Injectable()
export class PineLabsConfigService {
  constructor(private readonly configService: CustomConfigService) {}

  getBaseUrl(): string {
    const envConfig = this.getEnvironmentConfig();
    const baseUrl = this.configService.getDecrypted(envConfig.baseUrlEnvKey);
    if (!baseUrl) {
      throw new BadRequestException(
        `Pine Labs base URL is not configured for environment key ${envConfig.baseUrlEnvKey}`,
      );
    }
    return baseUrl.replace(/\/$/, '');
  }

  getAuthConfig(): PineLabsAuthConfig {
    return this.getEnvironmentConfig().auth;
  }

  getGlobalHeaders(): Record<string, string> {
    return { ...this.getEnvironmentConfig().globalHeaders };
  }

  getApiDefinition(apiName: PineLabsApiName): PineLabsApiDefinition {
    const definition = PINE_LABS_API_DEFINITIONS[apiName];
    if (!definition) {
      throw new BadRequestException(
        `Unknown Pine Labs API: ${String(apiName)}. Valid apiName values: ${Object.values(PineLabsApiName).join(', ')}`,
      );
    }
    return definition;
  }

  private getEnvironmentConfig(): PineLabsEnvironmentConfig {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? NodeEnv.DEV;
    const resolved =
      PINE_LABS_ENV_CONFIG[nodeEnv as NodeEnv.DEV | NodeEnv.UAT | NodeEnv.PROD];
    if (!resolved) {
      return PINE_LABS_ENV_CONFIG[NodeEnv.DEV];
    }
    return resolved;
  }
}
