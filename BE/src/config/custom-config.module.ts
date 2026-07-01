import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomConfigService } from './custom-config.service';
import { config } from './config';
import { validate } from '../validations/env.validation';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [config], validate })],
  providers: [
    ConfigService, // Provide ConfigService from @nestjs/config
    CustomConfigService, // Provide CustomConfigService separately
  ],
  exports: [ConfigService, CustomConfigService], // Export both services
})
export class CustomConfigModule {}
