import { NestFactory } from '@nestjs/core';
import { WsModule } from './ws.module';
import { logger } from 'src/logger/logger';
import { RedisIoAdapter } from './redis-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(WsModule);
  app.enableCors();

  const configService = app.get(ConfigService);
  // Use port from ENV
  const port = configService.get<number>('WS_PORT');

  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  await app.listen(port);
  logger.info(`WebSocket Server running on ${port}`);
}

bootstrap();
