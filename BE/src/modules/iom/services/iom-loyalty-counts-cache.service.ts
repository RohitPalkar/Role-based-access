import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';

import { IOM_LOYALTY_COUNTS_CACHE_TTL_MS } from '../constants';
import { IomLoyaltyCounts } from '../types/iom-list-item.interface';
import {
  buildLoyaltyCountsCacheKey,
  buildProjectIndexKey,
  parseCachedLoyaltyCounts,
} from '../utils/iom-loyalty-counts-cache.util';

@Injectable()
export class IomLoyaltyCountsCacheService {
  private readonly logger = new Logger(IomLoyaltyCountsCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getCounts(
    projectScope: number[],
    compute: () => Promise<IomLoyaltyCounts>,
  ): Promise<IomLoyaltyCounts> {
    const key = buildLoyaltyCountsCacheKey(projectScope);

    try {
      const cached = await this.cache.get<unknown>(key);
      const parsed = parseCachedLoyaltyCounts(cached);
      if (parsed) {
        return parsed;
      }
    } catch (err) {
      this.logger.warn(
        `Redis get failed for loyalty counts key=${key}: ${
          (err as Error)?.message ?? err
        }`,
      );
      return compute();
    }

    const counts = await compute();

    try {
      console.log('setting redis key');
      await this.cache.set(key, counts, IOM_LOYALTY_COUNTS_CACHE_TTL_MS);
      console.log('set redis key');
      await this.indexCacheKey(projectScope, key);
    } catch (err) {
      this.logger.warn(
        `Redis set failed for loyalty counts key=${key}: ${
          (err as Error)?.message ?? err
        }`,
      );
    }

    return counts;
  }

  async invalidateForProject(projectId: number): Promise<void> {
    try {
      const redis = this.getRedisClient();
      if (!redis) {
        return;
      }

      const indexKey = buildProjectIndexKey(projectId);
      const keys = await redis.smembers(indexKey);

      if (keys.length > 0) {
        await redis.del(...keys);
      }
      await redis.del(indexKey);
    } catch (err) {
      this.logger.error(
        `Failed to invalidate loyalty counts for project=${projectId}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }

  private async indexCacheKey(
    projectScope: number[],
    cacheKey: string,
  ): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) {
      return;
    }

    const pipeline = redis.pipeline();
    for (const projectId of projectScope) {
      const indexKey = buildProjectIndexKey(projectId);
      pipeline.sadd(indexKey, cacheKey);
      pipeline.pexpire(indexKey, IOM_LOYALTY_COUNTS_CACHE_TTL_MS);
    }
    await pipeline.exec();
  }

  private getRedisClient() {
    const store = (this.cache as Cache & { store?: RedisStore }).store;
    return store?.client;
  }
}
