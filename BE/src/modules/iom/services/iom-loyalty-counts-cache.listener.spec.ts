import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IomHistoryActionEnum } from '../constants';
import { Iom } from '../entities/iom.entity';
import { IomHistoryEvent } from '../events/iom-history.event';
import { IomLoyaltyCountsCacheListener } from './iom-loyalty-counts-cache.listener';
import { IomLoyaltyCountsCacheService } from './iom-loyalty-counts-cache.service';

describe('IomLoyaltyCountsCacheListener', () => {
  let listener: IomLoyaltyCountsCacheListener;
  let iomRepo: jest.Mocked<Pick<Repository<Iom>, 'findOne'>>;
  let cacheService: jest.Mocked<
    Pick<IomLoyaltyCountsCacheService, 'invalidateForProject'>
  >;

  beforeEach(async () => {
    iomRepo = {
      findOne: jest.fn(),
    };
    cacheService = {
      invalidateForProject: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IomLoyaltyCountsCacheListener,
        { provide: getRepositoryToken(Iom), useValue: iomRepo },
        {
          provide: IomLoyaltyCountsCacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    listener = module.get(IomLoyaltyCountsCacheListener);
  });

  afterEach(() => jest.clearAllMocks());

  it('invalidates cache for the IOM project on history event', async () => {
    iomRepo.findOne.mockResolvedValueOnce({
      id: 42,
      projectId: 10,
      statusId: 5,
    } as Iom);

    const event = new IomHistoryEvent(
      42,
      6,
      7,
      IomHistoryActionEnum.TL_APPROVE,
      5,
    );

    await listener.handle(event);

    expect(iomRepo.findOne).toHaveBeenCalledWith({
      where: { id: 42 },
      select: ['id', 'projectId', 'statusId'],
    });
    expect(cacheService.invalidateForProject).toHaveBeenCalledWith(10);
  });

  it('does not throw when invalidation fails', async () => {
    iomRepo.findOne.mockResolvedValueOnce({
      id: 42,
      projectId: 10,
      statusId: 5,
    } as Iom);
    cacheService.invalidateForProject.mockRejectedValueOnce(
      new Error('redis down'),
    );

    const event = new IomHistoryEvent(
      42,
      6,
      7,
      IomHistoryActionEnum.TL_APPROVE,
      5,
    );

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
