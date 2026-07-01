import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'notification_event',
  cors: { origin: '*' },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly clients = new Map<number, Socket>();

  constructor(private readonly configService: ConfigService) {}

  clientCount(): number {
    return (this.server as any)?.sockets?.size ?? 0;
  }

  // Handle new user connections
  handleConnection(client: Socket) {
    const userId = parseInt(client.handshake.query.userId as string, 10);
    if (!userId || isNaN(userId)) {
      client.disconnect(true);
      return;
    }

    this.clients.set(userId, client);
  }

  // Handle user disconnection
  handleDisconnect(client: Socket) {
    const userId = parseInt(client.handshake.query.userId as string, 10);
    if (userId && this.clients.has(userId)) {
      this.clients.delete(userId);
    }
  }

  /**
   * 🔹 **Send Notification**
   * - If `userId` is provided → Send only to that user
   * - If `userId` is `null` → Broadcast to **all connected users**
   */
  sendNotification(userId: number | null, notificationCount: any) {
    if (userId) {
      // 🔹 **User-Specific Notification**
      const client = this.clients.get(userId);
      if (client) {
        client.emit('newNotification', notificationCount);
      }
    } else {
      // 🔹 **Global Notification (Broadcast to All Users)**
      this.server.emit('newNotification', notificationCount);
    }
  }
}
