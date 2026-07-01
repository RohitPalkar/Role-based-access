import { Controller, Get } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

@Controller('health')
export class WsHealthController {
  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Get()
  check() {
    const bookingClients = this.eventsGateway.clientCount();
    const internalClients = this.notificationGateway.clientCount();
    const totalClients = bookingClients + internalClients;

    const isWsInitialized =
      this.eventsGateway.server !== undefined &&
      this.notificationGateway.server !== undefined;

    return {
      status: isWsInitialized ? 'ok' : 'down',
      message: isWsInitialized
        ? 'WebSocket service is up and running'
        : 'WebSocket service is down',
      data: {
        connectedClients: totalClients,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
