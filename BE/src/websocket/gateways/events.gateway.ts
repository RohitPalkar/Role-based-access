import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { logger } from 'src/logger/logger';
const wsPort = Number(process.env.WS_PORT) || 3002;

// To emit events to react app to handle post sign activities
@WebSocketGateway({ namespace: 'booking_events', cors: true })
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly defaultLogger = new Logger('EventsGateway', {
    timestamp: true,
  });
  public isInitialized = false;
  @WebSocketServer() server: Server;

  onModuleInit() {
    this.isInitialized = true;
    this.defaultLogger.log(`WebSocket Gateway initialized on : ${wsPort}`);
  }

  clientCount(): number {
    return (this.server as any)?.sockets?.size ?? 0;
  }

  handleConnection(client: Socket) {
    const authOppId = client.handshake.auth.oppId as string;
    const queryOppId = client.handshake.query.oppId as string;
    const oppId = authOppId || queryOppId;

    if (!oppId) {
      client.disconnect();
      throw new UnauthorizedException('Invalid token');
    }

    client.join(oppId); //Join room
    logger.info(`Client connected: ${client.id}, joined oppId room: ${oppId}`);
  }

  handleDisconnect(client: Socket) {
    logger.info(`Client disconnected: ${client.id}`);
  }

  // Emit an event to a specific opportunity
  emitToBooking(oppId: string, opportunityData: any) {
    this.server.to(oppId).emit('opportunity_update', opportunityData);
  }

  // Emit an event to a specific opportunity's referrer
  emitToReferrer(oppId: string, opportunityData: any) {
    this.server.to(oppId).emit('referrer_signed', opportunityData);
  }
}
