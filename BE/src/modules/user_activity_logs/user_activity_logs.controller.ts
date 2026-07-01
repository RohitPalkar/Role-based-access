import { Controller, Get, Param } from '@nestjs/common';
import { UserActivityLogService } from './user_activity_logs.service';
import { UserActivityLog } from './entities/user_activity_log.entity';

@Controller('user-activity-logs')
export class UserActivityLogsController {
  constructor(
    private readonly userActivityLogService: UserActivityLogService,
  ) {}

  @Get(':userId')
  async getLogs(@Param('userId') userId: number): Promise<UserActivityLog[]> {
    return this.userActivityLogService.getLogsByUser(userId);
  }
}
