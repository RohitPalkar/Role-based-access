import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

import { IOM_LOYALTY_COUNTS_CACHE_TTL_MS } from '../constants';
import { IomLoyaltyCounts } from '../types/iom-list-item.interface';
import {
  buildLoyaltyCountsCacheKey,
  buildProjectIndexKey,
} from '../utils/iom-loyalty-counts-cache.util';
import { IomLoyaltyCountsCacheService } from './iom-loyalty-counts-cache.service';

const PROJECT_SCOPE = [11, 10];
const COUNTS: IomLoyaltyCounts = {
  iomRequestInvoice: 2,
  pendingSubmission: 3,
  submittedInvoice: 1,
};
const CACHE_KEY = buildLoyaltyCountsCacheKey(PROJECT_SCOPE);

describe('IomLoyaltyCountsCacheService', () => {
  let service: IomLoyaltyCountsCacheService;
  let cache: jest.Mocked<Pick<Cache, 'get' | 'set'>>;
  let redisClient: {
    pipeline: jest.Mock;
    smembers: jest.Mock;
    del: jest.Mock;
  };
  let pipeline: {
    sadd: jest.Mock;
    pexpire: jest.Mock;
    exec: jest.Mock;
  };

  beforeEach(async () => {
    pipeline = {
      sadd: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    redisClient = {
      pipeline: jest.fn().mockReturnValue(pipeline),
      smembers: jest.fn().mockResolvedValue([CACHE_KEY]),
      del: jest.fn().mockResolvedValue(1),
    };

    cache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IomLoyaltyCountsCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            ...cache,
            store: { client: redisClient },
          },
        },
      ],
    }).compile();

    service = module.get(IomLoyaltyCountsCacheService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns cached counts without calling compute on cache hit', async () => {
    cache.get.mockResolvedValueOnce(COUNTS);
    const compute = jest.fn();

    const result = await service.getCounts(PROJECT_SCOPE, compute);

    expect(result).toEqual(COUNTS);
    expect(cache.get).toHaveBeenCalledWith(CACHE_KEY);
    expect(compute).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('calls compute, sets Redis with TTL, and registers index on cache miss', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    const compute = jest.fn().mockResolvedValue(COUNTS);

    const result = await service.getCounts(PROJECT_SCOPE, compute);

    expect(result).toEqual(COUNTS);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(
      CACHE_KEY,
      COUNTS,
      IOM_LOYALTY_COUNTS_CACHE_TTL_MS,
    );
    expect(redisClient.pipeline).toHaveBeenCalled();
    expect(pipeline.sadd).toHaveBeenCalledWith(
      buildProjectIndexKey(10),
      CACHE_KEY,
    );
    expect(pipeline.sadd).toHaveBeenCalledWith(
      buildProjectIndexKey(11),
      CACHE_KEY,
    );
    expect(pipeline.pexpire).toHaveBeenCalledWith(
      buildProjectIndexKey(10),
      IOM_LOYALTY_COUNTS_CACHE_TTL_MS,
    );
    expect(pipeline.exec).toHaveBeenCalled();
  });

  it('uses a deterministic cache key from sorted project scope', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    const compute = jest.fn().mockResolvedValue(COUNTS);

    await service.getCounts([11, 10], compute);

    const expectedHash = createHash('sha256').update('10,11').digest('hex');
    expect(cache.get).toHaveBeenCalledWith(
      `iom:counts:loyalty:${expectedHash}`,
    );
  });

  it('falls back to compute when Redis get throws', async () => {
    cache.get.mockRejectedValueOnce(new Error('redis down'));
    const compute = jest.fn().mockResolvedValue(COUNTS);

    const result = await service.getCounts(PROJECT_SCOPE, compute);

    expect(result).toEqual(COUNTS);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('invalidateForProject deletes indexed keys and the index set', async () => {
    await service.invalidateForProject(10);

    expect(redisClient.smembers).toHaveBeenCalledWith(buildProjectIndexKey(10));
    expect(redisClient.del).toHaveBeenCalledWith(CACHE_KEY);
    expect(redisClient.del).toHaveBeenCalledWith(buildProjectIndexKey(10));
  });
});
