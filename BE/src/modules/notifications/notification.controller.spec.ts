import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    findUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    create: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockUser = { dbId: 'user123' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  //  Test: findUserNotifications()
  describe('findUserNotifications', () => {
    it('should return notifications for a user', async () => {
      const query: CommonFindAllQueryDto = { page: 1, limit: 10 };
      const expected = [{ id: 'notif1' }];

      mockNotificationService.findUserNotifications.mockResolvedValue(expected);

      const result = await controller.findUserNotifications(mockUser, query);

      expect(service.findUserNotifications).toHaveBeenCalledWith(
        mockUser.dbId,
        1,
        10,
      );
      expect(result).toEqual(expected);
    });
  });

  // Test: getUnreadCount()
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const expected = { unreadCount: 5 };
      mockNotificationService.getUnreadCount.mockResolvedValue(expected);

      const result = await controller.getUnreadCount(mockUser);

      expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(expected);
    });
  });

  // Test: handleLogsCreatedEvent()
  describe('handleLogsCreatedEvent', () => {
    it('should handle create notification event', async () => {
      const data: CreateNotificationDto = {
        notifications: [
          {
            title: 'Voucher cancellation processed',
            message: `A voucher with Unique Reference ID "1234", has been cancelled by testUser(testRole}).`,
            type: 'Voucher',
            isForAllSalesBH: true,
          },
        ],
      } as CreateNotificationDto;

      const expected = { id: 'notif123', ...data };
      mockNotificationService.create.mockResolvedValue(expected);

      const result = await controller.handleLogsCreatedEvent(data);

      expect(service.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(expected);
    });
  });

  // Test: create()
  describe('create', () => {
    it('should create a new notification', async () => {
      const dto: CreateNotificationDto = {
        notifications: [
          {
            title: 'Voucher cancellation processed',
            message: `A voucher with Unique Reference ID "1234", has been cancelled by testUser(testRole}).`,
            type: 'Voucher',
            isForAllSalesBH: true,
          },
        ],
      } as CreateNotificationDto;

      const expected = { id: 'notif001', ...dto };
      mockNotificationService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // Test: markAsRead()
  describe('markAsRead', () => {
    it('should mark notifications as read for a user', async () => {
      const expected = { success: true };
      mockNotificationService.markAsRead.mockResolvedValue(expected);

      const result = await controller.markAsRead(mockUser);

      expect(service.markAsRead).toHaveBeenCalledWith(mockUser.dbId);
      expect(result).toEqual(expected);
    });
  });
});
