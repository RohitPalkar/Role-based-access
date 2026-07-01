import { Module } from '@nestjs/common';
import { UserActivityLogService } from './user_activity_logs.service';
import { UserActivityLogsController } from './user_activity_logs.controller';
import { UserActivityLog } from './entities/user_activity_log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivityListener } from './user_activity_logs.listener';

@Module({
  imports: [TypeOrmModule.forFeature([UserActivityLog])],
  providers: [UserActivityLogService, UserActivityListener],
  controllers: [UserActivityLogsController],
})
export class UserActivityLogsModule {}
