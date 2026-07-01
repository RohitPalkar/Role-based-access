import { Module } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationGateway } from './gateways/notification.gateway';
import { WsHealthController } from './ws-health.controller';
import { WsRedisListenerService } from './ws-redis-listener.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [WsHealthController],
  providers: [EventsGateway, NotificationGateway, WsRedisListenerService],
})
export class WsModule {}
