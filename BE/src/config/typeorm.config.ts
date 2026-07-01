// typeorm.config.ts
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as Entities from '../entities/index';
import { CustomConfigModule } from './custom-config.module';
import { CustomConfigService } from './custom-config.service';

export default (async () => {
  const appContext = await NestFactory.createApplicationContext(
    CustomConfigModule,
    {
      logger: false,
    },
  );

  const configService = appContext.get(CustomConfigService);

  return new DataSource({
    type: 'mysql',
    host: configService.getDecrypted('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.getDecrypted('DB_USERNAME'),
    password: configService.getDecrypted('DB_PASSWORD'),
    database: configService.getDecrypted('DB_DATABASE'),
    entities: Entities,
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
  });
})();
