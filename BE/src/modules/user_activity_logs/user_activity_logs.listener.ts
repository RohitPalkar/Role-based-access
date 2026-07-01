import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { UserActivityLogService } from './user_activity_logs.service';

@Injectable()
export class UserActivityListener {
  constructor(
    private readonly userActivityLogService: UserActivityLogService,
  ) {}

  @OnEvent(EventMessagesEnum.CREATE_ACTIVITY_LOG, { async: true })
  async handleAuditLog(payload: any) {
    const sanitized = this.sanitizePayload(payload.details); // remove sensitive
    payload.details = sanitized;
    payload.payloadHash = this.hashPayload(sanitized);
    await this.userActivityLogService.createUserActivityLog(payload);
  }

  private sanitizePayload(payload: any) {
    const clone = { ...payload };
    delete clone.password;
    delete clone.token;
    return clone;
  }

  private hashPayload(payload: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
