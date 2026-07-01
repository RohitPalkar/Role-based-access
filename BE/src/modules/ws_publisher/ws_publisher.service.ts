import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { logger } from 'src/logger/logger';

@Injectable()
export class WsPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: RedisClientType;
  private connectPromise: Promise<void> | null = null;
  private isConnected = false;

  constructor() {
    this.redis = createClient({ url: process.env.REDIS_URL });

    this.redis.on('error', (err) => {
      logger.error('Redis client error', err);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConnected();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redis.isOpen) {
        await this.redis.quit();
      }
    } catch (err) {
      logger.warn('Error while closing Redis client', err);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.isConnected) return;

    if (this.connectPromise === null) {
      this.connectPromise = this.redis.connect().then(() => {
        this.isConnected = true;
      });
    }

    return this.connectPromise;
  }

  async publishBookingEvent(data: any) {
    await this.ensureConnected();
    return this.redis.publish('booking_event', JSON.stringify(data));
  }

  async publishNotificationEvent(data: any) {
    await this.ensureConnected();
    return this.redis.publish('notification_event', JSON.stringify(data));
  }
}
