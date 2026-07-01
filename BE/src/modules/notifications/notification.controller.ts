import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { User } from '../sso/decorators/user.decorator';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';

@Controller('notifications')
@UseGuards(RmAdminAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ExposeFields('createdAt')
  async findUserNotifications(
    @User() user: any,
    @Query() queryDto: CommonFindAllQueryDto,
  ) {
    const { page, limit } = queryDto;
    return this.notificationService.findUserNotifications(
      user?.dbId,
      page,
      limit,
    );
  }

  @Get('unreadNotification')
  async getUnreadCount(@User() user: any) {
    return this.notificationService.getUnreadCount(user);
  }

  @OnEvent(EventMessagesEnum.CREATE_NOTIFICATIONS)
  async handleLogsCreatedEvent(data: CreateNotificationDto) {
    return this.notificationService.create(data);
  }

  @Post()
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    const result = await this.notificationService.create(createNotificationDto);
    return result;
  }

  /**
   * Mark a specific notification as read
   */
  @Patch('read')
  async markAsRead(@User() user: any) {
    return this.notificationService.markAsRead(user?.dbId);
  }
}
