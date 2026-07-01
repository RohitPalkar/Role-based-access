import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivityLog } from './entities/user_activity_log.entity';

@Injectable()
export class UserActivityLogService {
  constructor(
    @InjectRepository(UserActivityLog)
    private readonly activityLogRepo: Repository<UserActivityLog>,
  ) {}

  /**
   * Create a new user activity log entry
   * @param payload Partial data for the log entry
   * @returns The created UserActivityLog entity
   */
  async createUserActivityLog(
    payload: Partial<UserActivityLog>,
  ): Promise<UserActivityLog> {
    const log = this.activityLogRepo.create(payload); // create entity instance
    return await this.activityLogRepo.save(log); // save and return entity
  }

  /**
   * Retrieve activity logs for a specific user
   * @param userId ID of the user
   * @returns Array of UserActivityLog entries
   */
  async getLogsByUser(userId: number): Promise<UserActivityLog[]> {
    return this.activityLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
