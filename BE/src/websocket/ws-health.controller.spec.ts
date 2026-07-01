import { Test, TestingModule } from '@nestjs/testing';
import { WsHealthController } from './ws-health.controller';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

describe('WsHealthController', () => {
  let controller: WsHealthController;

  const mockEventsGateway = {
    clientCount: jest.fn(),
    server: {},
  };

  const mockNotificationGateway = {
    clientCount: jest.fn(),
    server: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WsHealthController],
      providers: [
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    controller = module.get(WsHealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok when both gateways are initialized', () => {
      mockEventsGateway.clientCount.mockReturnValue(3);
      mockNotificationGateway.clientCount.mockReturnValue(2);

      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.message).toBe('WebSocket service is up and running');
      expect(result.data.connectedClients).toBe(5);
      expect(result.data.timestamp).toBeDefined();
    });

    it('should return down when any gateway server is undefined', () => {
      mockEventsGateway.clientCount.mockReturnValue(1);
      mockNotificationGateway.clientCount.mockReturnValue(1);

      mockEventsGateway.server = undefined;
      mockNotificationGateway.server = undefined;

      const result = controller.check();

      expect(result.status).toBe('down');
      expect(result.message).toBe('WebSocket service is down');
      expect(result.data.connectedClients).toBe(2);
    });
  });
});
