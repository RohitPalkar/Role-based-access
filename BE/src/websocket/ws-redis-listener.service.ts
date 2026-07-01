import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationGateway } from './gateways/notification.gateway';
import { logger } from 'src/logger/logger';

@Injectable()
export class WsRedisListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: RedisClientType;
  private connectPromise: Promise<void> | null = null;
  private isConnected = false;
  private isSubscribed = false;

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {
    this.redis = createClient({ url: process.env.REDIS_URL });

    // attach runtime error handler so client errors do not crash process
    this.redis.on('error', (err) => {
      logger.error('Redis client error', { error: err });
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureConnected();
      await this.subscribe();
    } catch (err) {
      logger.error('Failed to initialize Redis listener', {
        error: err?.message ?? err,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribeAndClose();
  }

  // ensure single connect attempt — Sonar-friendly (uses isConnected boolean)
  private async ensureConnected(): Promise<void> {
    if (this.isConnected) return;

    if (this.connectPromise === null) {
      this.connectPromise = this.redis
        .connect()
        .then(() => {
          this.isConnected = true;
        })
        .catch((err) => {
          // clear connectPromise so future attempts can retry
          this.connectPromise = null;
          // rethrow so callers can handle or log
          throw err;
        });
    }

    return this.connectPromise;
  }

  // subscribe to channels and set up message handlers
  private async subscribe(): Promise<void> {
    if (this.isSubscribed) return;
    await this.ensureConnected();

    // booking_event
    await this.redis.subscribe('booking_event', (message: string) => {
      try {
        const payload = JSON.parse(message);
        if (!payload || typeof payload !== 'object') return;

        if (payload.type === 'opportunity_update') {
          this.eventsGateway.emitToBooking(payload.opportunityId, payload.data);
        } else if (payload.type === 'referrer_signed') {
          this.eventsGateway.emitToReferrer(
            payload.opportunityId,
            payload.data,
          );
        } else {
          logger.info('Unknown booking_event type', { type: payload.type });
        }
      } catch (err) {
        logger.error('Failed to handle booking_event message', {
          error: (err as Error).message,
          message,
        });
      }
    });

    // notification_event
    await this.redis.subscribe('notification_event', (message: string) => {
      try {
        const payload = JSON.parse(message);
        if (!payload || typeof payload !== 'object') return;

        if (payload.type === 'new_notification') {
          this.notificationGateway.sendNotification(
            payload.userId,
            payload.data,
          );
        } else {
          logger.info('Unknown notification_event type', {
            type: payload.type,
          });
        }
      } catch (err) {
        logger.error('Failed to handle notification_event message', {
          error: (err as Error).message,
          message,
        });
      }
    });

    this.isSubscribed = true;
    logger.info(
      'WebSocket subscribed to redis channels "booking_event" and "notification_event"',
    );
  }

  // Unsubscribe and close client gracefully
  private async unsubscribeAndClose(): Promise<void> {
    try {
      if (this.isSubscribed) {
        try {
          await this.redis.unsubscribe('booking_event');
          await this.redis.unsubscribe('notification_event');
        } catch (err) {
          logger.warn('Error while unsubscribing from Redis', {
            error: err?.message ?? err,
          });
        }
        this.isSubscribed = false;
      }

      if (this.redis && this.redis.isOpen) {
        try {
          await this.redis.quit();
        } catch (err) {
          logger.warn('Error while quitting Redis client', {
            error: err?.message ?? err,
          });
        } finally {
          this.isConnected = false;
          this.connectPromise = null;
        }
      }
    } catch (err) {
      logger.warn('Error closing Redis client', { error: err?.message ?? err });
    }
  }
}
