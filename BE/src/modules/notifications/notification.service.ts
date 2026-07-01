import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { logger } from '../../logger/logger';
import { Users } from 'src/entities';
import { format } from 'date-fns';
import { RolesEnum } from 'src/enums/roles.enum';
import { DATE_FORMAT_DD_MMMM_YYYY, SUCCESS } from 'src/config/constants';
import { WsPublisherService } from '../ws_publisher/ws_publisher.service';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly wsPublisherService: WsPublisherService,
  ) {}

  /**
   * Create one notification record per user in `userIds`.
   */

  async create(createNotificationDto: CreateNotificationDto): Promise<any> {
    try {
      const notifications = createNotificationDto.notifications;

      if (!notifications || notifications.length === 0) {
        throw new BadRequestException(
          'At least one notification must be provided.',
        );
      }

      const {
        broadcastNotificationsToInsert,
        individualNotificationsToInsert,
        notificationsGroupedByUser,
      } = this.partitionNotifications(notifications);

      if (broadcastNotificationsToInsert.length > 0) {
        await this.notificationRepository.insert(
          broadcastNotificationsToInsert,
        );
      }

      if (individualNotificationsToInsert.length > 0) {
        await this.notificationRepository.insert(
          individualNotificationsToInsert,
        );
      }

      for (const [userId, userNotifications] of notificationsGroupedByUser) {
        await this.wsPublisherService.publishBookingEvent({
          type: 'new_notification',
          userId,
          data: {
            notifications: userNotifications,
            messageCount: 1,
          },
        });
      }

      return {
        message: 'Notifications created and sent successfully.',
      };
    } catch (error) {
      logger.error(
        'Error while creating notifications',
        error?.stack || error?.message,
      );

      logsAndErrorHandling('NotificationService.create', error, {
        createNotificationDto,
      });
    }
  }

  private partitionNotifications(notifications: any[]) {
    const broadcastNotificationsToInsert: Array<any> = [];
    const individualNotificationsToInsert: Array<any> = [];

    const notificationsGroupedByUser = new Map<
      number,
      Array<{ type: string; title: string; message: string }>
    >();

    for (const notificationData of notifications) {
      const {
        type,
        title,
        message,
        userIds,
        isForAllAdmin,
        isForAllFinanceAdmin,
        isForAllRm,
        isForAllSalesBH,
        isForAllBackendCheckers,
        isForAllCRM,
      } = notificationData;

      const broadcastFlags = {
        isForAllAdmin: !!isForAllAdmin,
        isForAllFinanceAdmin: !!isForAllFinanceAdmin,
        isForAllRm: !!isForAllRm,
        isForAllBackendCheckers: !!isForAllBackendCheckers,
        isForAllSalesBH: !!isForAllSalesBH,
        isForAllCRM: !!isForAllCRM,
      };

      const isBroadcast = Object.values(broadcastFlags).some(Boolean);

      if (isBroadcast) {
        broadcastNotificationsToInsert.push({
          type,
          title,
          message,
          isRead: false,
          ...broadcastFlags,
        });
        continue;
      }

      if (userIds && userIds.length > 0) {
        for (const userId of userIds) {
          const userIdNumber = Number(userId);

          individualNotificationsToInsert.push({
            type,
            title,
            message,
            user: { id: userIdNumber },
            isRead: false,
          });

          if (!notificationsGroupedByUser.has(userIdNumber)) {
            notificationsGroupedByUser.set(userIdNumber, []);
          }

          notificationsGroupedByUser.get(userIdNumber).push({
            type,
            title,
            message,
          });
        }
      }
    }

    return {
      broadcastNotificationsToInsert,
      individualNotificationsToInsert,
      notificationsGroupedByUser,
    };
  }

  /**
   * Fetch notifications for a specific user
   */

  async findUserNotifications(
    userId: number,
    page: number,
    limit: number,
  ): Promise<any> {
    try {
      // 1. Validate user existence along with role information
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }

      // Determine the role of the requesting user.
      const isAdmin =
        user.role.name === RolesEnum.ADMIN ||
        user.role.name === RolesEnum.SUPER_ADMIN;
      const isFinanceAdmin = user.role.name === RolesEnum.FINANCE_ADMIN;
      const isRM = user.role.name === RolesEnum.RM;
      const isMIS = user.role.name === RolesEnum.MIS;
      const isCRM = user.role.name === RolesEnum.CRM;
      const isSalesBH = user.role.name === RolesEnum.SALES_BH;

      // 2. Pagination setup
      const skip = (page - 1) * limit;

      // 3. Sorting logic (newest first)
      const order: Record<string, 'ASC' | 'DESC'> = {
        id: 'DESC',
      };

      let notifications: any[] = [];
      let total = 0;

      // 4. Query notifications based on user role
      if (isAdmin) {
        // For admins: fetch individual notifications and broadcast notifications for all admins
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [{ user: { id: userId } }, { isForAllAdmin: true }],
            skip,
            take: limit,
            order,
          },
        );
      } else if (isFinanceAdmin) {
        // For finance admins: fetch individual notifications and broadcast notifications for all finance admins
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [{ user: { id: userId } }, { isForAllFinanceAdmin: true }],
            skip,
            take: limit,
            order,
          },
        );
      } else if (isRM) {
        // For RM users: fetch individual notifications and broadcast notifications for all RM users
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [{ user: { id: userId } }, { isForAllRm: true }],
            skip,
            take: limit,
            order,
          },
        );
      } else if (isCRM) {
        // For RM users: fetch individual notifications and broadcast notifications for all RM users
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [{ user: { id: userId } }, { isForAllCRM: true }],
            skip,
            take: limit,
            order,
          },
        );
      } else if (isMIS) {
        // For RM users: fetch individual notifications and broadcast notifications for all RM users
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [
              { user: { id: userId } },
              { isForAllBackendCheckers: true },
            ],
            skip,
            take: limit,
            order,
          },
        );
      } else if (isSalesBH) {
        // For RM users: fetch individual notifications and broadcast notifications for all RM users
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: [{ user: { id: userId } }, { isForAllSalesBH: true }],
            skip,
            take: limit,
            order,
          },
        );
      } else {
        // For other users, fetch only their individual notifications.
        [notifications, total] = await this.notificationRepository.findAndCount(
          {
            where: { user: { id: userId } },
            skip,
            take: limit,
            order,
          },
        );
      }

      // 5. Process and format notifications
      const formattedNotifications = notifications.map((notification) => {
        let computedIsRead = notification.isRead;

        const roleConfigs = [
          {
            enabled: isAdmin && notification.isForAllAdmin,
            readIds: notification.adminReadIds,
          },
          {
            enabled: isFinanceAdmin && notification.isForAllFinanceAdmin,
            readIds: notification.financeAdminReadIds,
          },
          {
            enabled: isRM && notification.isForAllRm,
            readIds: notification.rmReadIds,
          },
          {
            enabled: isMIS && notification.isForAllBackendCheckers,
            readIds: notification.backendCheckerReadIds,
          },
          {
            enabled: isCRM && notification.isForAllCRM,
            readIds: notification.crmReadIds,
          },
          {
            enabled: isSalesBH && notification.isForAllSalesBH,
            readIds: notification.salesBHReadIds,
          },
        ];

        const matchedRole = roleConfigs.find((r) => r.enabled);

        if (matchedRole) {
          const readIds: number[] = matchedRole.readIds || [];
          computedIsRead = readIds.includes(userId);
        }

        const formattedDate = format(
          new Date(notification.createdAt),
          DATE_FORMAT_DD_MMMM_YYYY,
        );

        return {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: computedIsRead,
          createdAt: formattedDate,
        };
      });

      return {
        message: 'Notifications fetched successfully.',
        data: {
          notifications: formattedNotifications,
          total,
          page: page,
          limit: limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch notifications for user ${userId}`,
        error.stack || error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch notifications.');
    }
  }

  async getUnreadCount(user: any): Promise<any> {
    const userId = user?.dbId ?? '';
    const role = user?.role ?? '';

    // 1. Personal unread notifications
    const personalCount = await this.notificationRepository.count({
      where: {
        user: { id: userId },
        isRead: false,
      },
    });

    // 2. Broadcast mapping
    type BroadcastRoleConfig = {
      flagColumn: string;
      readIdsColumn: string;
    };

    const roleConfig: Partial<Record<RolesEnum, BroadcastRoleConfig>> = {
      [RolesEnum.ADMIN]: {
        flagColumn: 'isForAllAdmin',
        readIdsColumn: 'adminReadIds',
      },
      [RolesEnum.SUPER_ADMIN]: {
        flagColumn: 'isForAllAdmin',
        readIdsColumn: 'adminReadIds',
      },
      [RolesEnum.FINANCE_ADMIN]: {
        flagColumn: 'isForAllFinanceAdmin',
        readIdsColumn: 'financeAdminReadIds',
      },
      [RolesEnum.RM]: {
        flagColumn: 'isForAllRm',
        readIdsColumn: 'rmReadIds',
      },
      [RolesEnum.MIS]: {
        flagColumn: 'isForAllBackendCheckers',
        readIdsColumn: 'rmReadIds',
      },
      [RolesEnum.CRM]: {
        flagColumn: 'isForAllCRM',
        readIdsColumn: 'rmReadIds',
      },
      [RolesEnum.SALES_BH]: {
        flagColumn: 'isForAllSalesBH',
        readIdsColumn: 'rmReadIds',
      },
      [RolesEnum.CRM_TL]: {
        flagColumn: 'isForAllCrmTL',
        readIdsColumn: 'crmTlReadIds',
      },
      [RolesEnum.CRM_HEAD]: {
        flagColumn: 'isForAllCrmHead',
        readIdsColumn: 'crmHeadReadIds',
      },
      [RolesEnum.FINANCE_HEAD]: {
        flagColumn: 'isForAllFinanceHead',
        readIdsColumn: 'financeHeadReadIds',
      },
      [RolesEnum.FINANCE_USER]: {
        flagColumn: 'isForAllFinanceUser',
        readIdsColumn: 'financeUserReadIds',
      },
      [RolesEnum.LOYALTY]: {
        flagColumn: 'isForAllLoyalty',
        readIdsColumn: 'loyaltyReadIds',
      },
    };

    const config = roleConfig[role];
    if (!config) {
      return personalCount;
    }
    console.log('role:', role);
    console.log('config:', config);

    // 3. Broadcast unread count
    const result = await this.notificationRepository
      .createQueryBuilder('n')
      .select('COUNT(*)', 'count')
      .where(`n.${config.flagColumn} = true`)
      .andWhere(
        `(n.${config.readIdsColumn} IS NULL
        OR JSON_CONTAINS(n.${config.readIdsColumn}, CAST(:userId AS JSON), '$') = 0)`,
        { userId },
      )
      // Strongly recommended safety valve
      .andWhere('n.createdAt >= NOW() - INTERVAL 30 DAY')
      .getRawOne();

    const broadcastCount = Number(result.count) || 0;

    return {
      statusCode: SUCCESS,
      message: 'Unread notifications fetched successfully.',
      data: personalCount + broadcastCount,
    };
  }

  /**
   * Mark a single notification as read by this user.
   */
  async markAsRead(userId: number): Promise<any> {
    try {
      // 1. Ensure user exists along with role information
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }

      // Determine the role of the user
      const isAdmin =
        user.role.name === RolesEnum.ADMIN ||
        user.role.name === RolesEnum.SUPER_ADMIN;
      const isFinanceAdmin = user.role.name === RolesEnum.FINANCE_ADMIN;
      const isRM = user.role.name === RolesEnum.RM;

      // 2. Mark personal notifications as read (bulk update)
      await this.notificationRepository.update(
        { user: { id: userId }, isRead: false },
        { isRead: true },
      );

      // 3. Bulk update broadcast notifications for Admins
      if (isAdmin) {
        await this.notificationRepository
          .createQueryBuilder()
          .update(Notifications)
          .set({
            adminReadIds: () =>
              `JSON_ARRAY_APPEND(COALESCE(adminReadIds, JSON_ARRAY()), '$', :userId)`,
          })
          .where('isForAllAdmin = :isForAllAdmin', { isForAllAdmin: true })
          .andWhere(
            `(adminReadIds IS NULL OR JSON_CONTAINS(adminReadIds, CAST(:userId AS JSON), '$') = 0)`,
          )
          .setParameter('userId', userId)
          .execute();
      }

      // 4. Bulk update broadcast notifications for RM users
      if (isRM) {
        await this.notificationRepository
          .createQueryBuilder()
          .update(Notifications)
          .set({
            rmReadIds: () =>
              `JSON_ARRAY_APPEND(COALESCE(rmReadIds, JSON_ARRAY()), '$', :userId)`,
          })
          .where('isForAllRm = :isForAllRm', { isForAllRm: true })
          .andWhere(
            `(rmReadIds IS NULL OR JSON_CONTAINS(rmReadIds, CAST(:userId AS JSON), '$') = 0)`,
          )
          .setParameter('userId', userId)
          .execute();
      }

      // 5. Bulk update broadcast notifications for Finance Admin users
      if (isFinanceAdmin) {
        await this.notificationRepository
          .createQueryBuilder()
          .update(Notifications)
          .set({
            financeAdminReadIds: () =>
              `JSON_ARRAY_APPEND(COALESCE(financeAdminReadIds, JSON_ARRAY()), '$', :userId)`,
          })
          .where('isForAllFinanceAdmin = :isForAllFinanceAdmin', {
            isForAllFinanceAdmin: true,
          })
          .andWhere(
            `(financeAdminReadIds IS NULL OR JSON_CONTAINS(financeAdminReadIds, CAST(:userId AS JSON), '$') = 0)`,
          )
          .setParameter('userId', userId)
          .execute();
      }

      return { message: 'All notifications marked as read successfully.' };
    } catch (error) {
      logger.error(
        `Failed to mark all notifications as read for user ${userId}`,
        error.stack || error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update notifications.');
    }
  }
}
