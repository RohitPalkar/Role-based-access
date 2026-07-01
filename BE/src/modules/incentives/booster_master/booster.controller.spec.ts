import { describe } from 'node:test';
import { BoosterService } from './booster.service';
import { BoosterController } from './booster.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { TEST_EXECUTION_TIME } from 'src/config/constants';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrizeType } from './dto/create-booster.dto';
import { StatusEnum } from 'src/enums/status.enum';

type BoosterServiceMock = jest.Mocked<
  Pick<
    BoosterService,
    | 'createBooster'
    | 'deleteBooster'
    | 'filterStatus'
    | 'findAllRewards'
    | 'findBoosterById'
    | 'findBoosters'
    | 'updateBooster'
  >
>;

describe('BoosterController', () => {
  let controller: BoosterController;
  let boosterService: BoosterServiceMock;

  beforeAll(async () => {
    const serviceMock: BoosterServiceMock = {
      createBooster: jest.fn(),
      deleteBooster: jest.fn(),
      filterStatus: jest.fn(),
      findAllRewards: jest.fn(),
      findBoosterById: jest.fn(),
      findBoosters: jest.fn(),
      updateBooster: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoosterController],
      providers: [
        {
          provide: BoosterService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(BoosterController);
    boosterService = module.get(BoosterService) as BoosterServiceMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooster', () => {
    const baseDto: any = {
      name: 'Dussehra Booster',
      startDate: '2025-10-15',
      endDate: '2025-11-15',
      projects: [101, 102],
      boosterSlabs: [{ min: 1, max: 5, amount: 1000 }],
      groupId: 7,
      brandId: 2,
      cityIds: [11, 12],
    };

    it('should create a booster successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Booster added and mapped successfully.',
      };
      boosterService.createBooster.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.create(baseDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.createBooster).toHaveBeenCalledWith(baseDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass the DTO to the service unchanged', async () => {
      const dto = { ...baseDto, name: 'Deepavali Mega Booster' };
      const mockResponse = {
        message: 'Booster added and mapped successfully.',
      };
      boosterService.createBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.createBooster).toHaveBeenCalledTimes(1);
      expect(boosterService.createBooster).toHaveBeenCalledWith(dto);
    });

    it('should enforce response time even with large payloads (success + response time)', async () => {
      const heavyDto = {
        ...baseDto,
        projects: Array.from({ length: 500 }, (_, i) => i + 1),
        boosterSlabs: Array.from({ length: 200 }, (_, i) => ({
          min: i,
          max: i + 1,
          amount: (i + 1) * 10,
        })),
      };
      const mockResponse = {
        message: 'Booster added and mapped successfully.',
      };
      boosterService.createBooster.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.create(heavyDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.createBooster).toHaveBeenCalledWith(heavyDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      boosterService.createBooster.mockRejectedValueOnce(
        new InternalServerErrorException('DB down'),
      );

      await expect(controller.create(baseDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.createBooster).toHaveBeenCalledWith(baseDto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('SQS publish failed');
      boosterService.createBooster.mockRejectedValueOnce(err);

      await expect(controller.create(baseDto)).rejects.toThrow(err);
      expect(boosterService.createBooster).toHaveBeenCalledWith(baseDto);
    });

    it('should accept stringified numbers and pass them through unchanged when pipes do not coerce', async () => {
      const dto = {
        ...baseDto,
        groupId: '7',
        brandId: '2',
        cityIds: ['11', '12'],
      } as any;

      const mockResponse = {
        message: 'Booster added and mapped successfully.',
      };
      boosterService.createBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.createBooster).toHaveBeenCalledWith(dto);
    });
  });

  describe('findBoosters', () => {
    const baseDto: any = {
      brandId: 2,
      groupId: 7,
      cityId: 11,
      projectId: 101,
      status: 'ACTIVE',
      startDate: '2025-10-01',
      endDate: '2025-11-30',
      search: 'dussehra',
      page: 1,
      limit: 20,
      sortBy: 'startDate:desc',
    };

    it('should fetch boosters successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Boosters fetched successfully',
        data: {
          boosters: [{ id: 1, name: 'Dussehra Booster' }],
          total: 1,
          currentPage: 1,
          totalPages: 1,
        },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.findBoosters(baseDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(baseDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass the FilterBoosterDTO to the service unchanged', async () => {
      const dto = {
        ...baseDto,
        search: 'diwali',
        sortBy: 'name:asc,endDate:desc',
      };
      const mockResponse = {
        message: 'Boosters fetched successfully',
        data: { boosters: [], total: 0, currentPage: dto.page, totalPages: 0 },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockResponse);

      const result = await controller.findBoosters(dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosters).toHaveBeenCalledTimes(1);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(dto);
    });

    it('should enforce response time even with large pagination and long search (success + response time)', async () => {
      const heavyDto = {
        ...baseDto,
        page: 50,
        limit: 200,
        search:
          'festival-offer super combo early bird mega diwali dussehra navaratri booster',
        sortBy: 'startDate:desc,name:asc,endDate:asc,createdAt:desc',
      };
      const mockResponse = {
        message: 'Boosters fetched successfully',
        data: {
          boosters: Array.from({ length: 200 }, (_, i) => ({
            id: i + 1,
            name: `B${i + 1}`,
          })),
          total: 10000,
          currentPage: heavyDto.page,
          totalPages: Math.ceil(10000 / heavyDto.limit),
        },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.findBoosters(heavyDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(heavyDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.findBoosters.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to fetch boosters.'),
      );

      await expect(controller.findBoosters(baseDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.findBoosters).toHaveBeenCalledWith(baseDto);
    });

    it('should propagate NotFoundException from the service', async () => {
      boosterService.findBoosters.mockRejectedValueOnce(
        new NotFoundException('No boosters found for filters'),
      );

      await expect(controller.findBoosters(baseDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(boosterService.findBoosters).toHaveBeenCalledWith(baseDto);
    });

    it('should propagate BadRequestException from the service', async () => {
      boosterService.findBoosters.mockRejectedValueOnce(
        new BadRequestException('Invalid date range'),
      );

      await expect(controller.findBoosters(baseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(boosterService.findBoosters).toHaveBeenCalledWith(baseDto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Unexpected repository error');
      boosterService.findBoosters.mockRejectedValueOnce(err);

      await expect(controller.findBoosters(baseDto)).rejects.toThrow(err);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(baseDto);
    });

    it('should pass through an empty-result payload unchanged', async () => {
      const mockEmpty = {
        message: 'Boosters fetched successfully',
        data: { boosters: [], total: 0, currentPage: 1, totalPages: 0 },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockEmpty);

      const result = await controller.findBoosters({
        ...baseDto,
        search: 'nope',
      });

      expect(result).toEqual(mockEmpty);
      expect(boosterService.findBoosters).toHaveBeenCalledWith({
        ...baseDto,
        search: 'nope',
      });
    });

    it('should accept stringified numerics in query and pass them unchanged when pipes do not coerce', async () => {
      const dto = {
        ...baseDto,
        brandId: '2',
        groupId: '7',
        cityId: '11',
        projectId: '101',
        page: '3',
        limit: '50',
      } as any;

      const mockResponse = {
        message: 'Boosters fetched successfully',
        data: { boosters: [], total: 0, currentPage: dto.page, totalPages: 0 },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockResponse);

      const result = await controller.findBoosters(dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(dto);
    });

    it('should forward complex sort expressions verbatim', async () => {
      const dto = {
        ...baseDto,
        sortBy: 'name:asc,startDate:desc,endDate:asc,total:desc',
      };
      const mockResponse = {
        message: 'Boosters fetched successfully',
        data: {
          boosters: [{ id: 9 }],
          total: 1,
          currentPage: dto.page,
          totalPages: 1,
        },
      };
      boosterService.findBoosters.mockResolvedValueOnce(mockResponse);

      const result = await controller.findBoosters(dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosters).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAllRewards', () => {
    it('should fetch rewards successfully (success + response time)', async () => {
      const mockResponse: { message: string; data: typeof PrizeType } = {
        message: 'Rewards fetched successfully.',
        data: PrizeType,
      };
      boosterService.findAllRewards.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.getAllRewards();
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.findAllRewards).toHaveBeenCalledTimes(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass through the service response unchanged', async () => {
      const mockResponse: { message: string; data: typeof PrizeType } = {
        message: 'Rewards fetched successfully.',
        data: PrizeType,
      };
      boosterService.findAllRewards.mockResolvedValueOnce(mockResponse);

      const result = await controller.getAllRewards();

      expect(result).toBe(mockResponse);
      expect(boosterService.findAllRewards).toHaveBeenCalledTimes(1);
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.findAllRewards.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to fetch rewards.'),
      );

      await expect(controller.getAllRewards()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.findAllRewards).toHaveBeenCalledTimes(1);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('unexpected failure');
      boosterService.findAllRewards.mockRejectedValueOnce(err);

      await expect(controller.getAllRewards()).rejects.toThrow(err);
      expect(boosterService.findAllRewards).toHaveBeenCalledTimes(1);
    });
  });

  describe('filterStatus', () => {
    it('should fetch status data successfully (success + response time)', async () => {
      const mockResponse: { message: string; data: { name: StatusEnum }[] } = {
        message: 'data fetched successfully.',
        data: [{ name: StatusEnum.INACTIVE }, { name: StatusEnum.ACTIVE }],
      };
      boosterService.filterStatus.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.filterStatus();
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.filterStatus).toHaveBeenCalledTimes(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    // passthrough
    it('should return the exact service response without modifications', async () => {
      const mockResponse: { message: string; data: { name: StatusEnum }[] } = {
        message: 'data fetched successfully.',
        data: [{ name: StatusEnum.ACTIVE }, { name: StatusEnum.INACTIVE }],
      };
      boosterService.filterStatus.mockResolvedValueOnce(mockResponse);

      const result = await controller.filterStatus();

      expect(result).toBe(mockResponse);
      expect(boosterService.filterStatus).toHaveBeenCalledTimes(1);
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.filterStatus.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to fetch status.'),
      );

      await expect(controller.filterStatus()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.filterStatus).toHaveBeenCalledTimes(1);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('unexpected failure');
      boosterService.filterStatus.mockRejectedValueOnce(err);

      await expect(controller.filterStatus()).rejects.toThrow(err);
      expect(boosterService.filterStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBoosterById', () => {
    const baseId = 42;

    it('should fetch a booster successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Booster fetched successfully.',
        data: {
          id: baseId,
          name: 'Dussehra Booster',
          group: { id: 7, name: 'Group 7' },
          startDate: '15-10-2025',
          endDate: '15-11-2025',
          status: 'ACTIVE',
          brand: [{ id: 2, name: 'BrandX' }],
          city: [{ id: 11, name: 'Pune' }],
          projects: [{ id: 101, name: 'Project Alpha' }],
          boosterSlabs: [
            {
              id: 1,
              startRange: 1,
              endRange: 5,
              rewardType: 'AMOUNT',
              rewardValue: 1000,
            },
          ],
        },
      };
      boosterService.findBoosterById.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.findBoosterById(baseId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(baseId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass through the service response unchanged', async () => {
      const mockResponse = {
        message: 'Booster fetched successfully.',
        data: { id: baseId },
      };
      boosterService.findBoosterById.mockResolvedValueOnce(mockResponse);

      const result = await controller.findBoosterById(baseId);

      expect(result).toBe(mockResponse);
      expect(boosterService.findBoosterById).toHaveBeenCalledTimes(1);
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(baseId);
    });

    it('should throw BadRequestException at controller level for non-numeric id and not call service', async () => {
      const badId = 'abc' as any;

      await expect(controller.findBoosterById(badId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findBoosterById(badId)).rejects.toThrow(
        'Invalid boosterId. It must be a number.',
      );
      expect(boosterService.findBoosterById).not.toHaveBeenCalled();
    });

    it('should accept stringified numeric id and pass it through unchanged when pipes do not coerce', async () => {
      const strId = '42' as any;
      const mockResponse = {
        message: 'Booster fetched successfully.',
        data: { id: 42 },
      };
      boosterService.findBoosterById.mockResolvedValueOnce(mockResponse);

      const result = await controller.findBoosterById(strId);

      expect(result).toEqual(mockResponse);
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(strId);
    });

    it('should propagate NotFoundException from the service', async () => {
      boosterService.findBoosterById.mockRejectedValueOnce(
        new NotFoundException(`Booster with ID ${baseId} not found.`),
      );

      await expect(controller.findBoosterById(baseId)).rejects.toThrow(
        NotFoundException,
      );
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(baseId);
    });

    it('should propagate BadRequestException from the service (e.g., non-positive id)', async () => {
      const zeroId = 0;
      boosterService.findBoosterById.mockRejectedValueOnce(
        new BadRequestException('Invalid ID. ID must be a positive number.'),
      );

      await expect(controller.findBoosterById(zeroId)).rejects.toThrow(
        BadRequestException,
      );
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(zeroId);
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.findBoosterById.mockRejectedValueOnce(
        new InternalServerErrorException(
          'An unexpected error occurred while fetching the Booster.',
        ),
      );

      await expect(controller.findBoosterById(baseId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(baseId);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('repository connection lost');
      boosterService.findBoosterById.mockRejectedValueOnce(err);

      await expect(controller.findBoosterById(baseId)).rejects.toThrow(err);
      expect(boosterService.findBoosterById).toHaveBeenCalledWith(baseId);
    });
  });

  describe('updateBooster', () => {
    const baseId = 42;
    const baseDto: any = {
      name: 'Dussehra Booster v2',
      startDate: '2025-10-20',
      endDate: '2025-11-20',
      projects: [101, 102],
      boosterSlabs: [
        {
          id: 1,
          startRange: 1,
          endRange: 5,
          rewardType: 'AMOUNT',
          rewardValue: 1500,
        },
      ],
      brandId: 2,
      cityIds: [11, 12],
      groupId: 7,
    };

    it('should update a booster successfully (success + response time)', async () => {
      const mockResponse = { message: 'Booster updated successfully.' };
      boosterService.updateBooster.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateBooster(baseId as any, baseDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        baseDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass id and DTO to the service unchanged', async () => {
      const id = 77;
      const dto = {
        ...baseDto,
        name: 'Deepavali Mega Booster v2',
        projects: [1, 2, 3],
      };
      const mockResponse = { message: 'Booster updated successfully.' };
      boosterService.updateBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateBooster(id as any, dto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.updateBooster).toHaveBeenCalledTimes(1);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(id, dto);
    });

    it('should enforce response time even with large payloads (success + response time)', async () => {
      const heavyDto = {
        ...baseDto,
        projects: Array.from({ length: 800 }, (_, i) => i + 1),
        boosterSlabs: Array.from({ length: 250 }, (_, i) => ({
          id: i + 1,
          startRange: i,
          endRange: i + 1,
          rewardType: i % 2 ? 'AMOUNT' : 'PERCENT',
          rewardValue: (i + 1) * 5,
        })),
        cityIds: Array.from({ length: 50 }, (_, i) => i + 10),
      };
      const mockResponse = { message: 'Booster updated successfully.' };
      boosterService.updateBooster.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateBooster(baseId as any, heavyDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        heavyDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException at controller level for non-numeric id (and not call service)', async () => {
      const badId = 'abc' as any;

      await expect(controller.updateBooster(badId, baseDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateBooster(badId, baseDto)).rejects.toThrow(
        'Invalid boosterId. It must be a number.',
      );
      expect(boosterService.updateBooster).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException at controller level for non-positive id (and not call service)', async () => {
      const zeroId = 0 as any;

      await expect(controller.updateBooster(zeroId, baseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(boosterService.updateBooster).not.toHaveBeenCalled();
    });

    it('should accept stringified numeric id and pass it through unchanged when pipes do not coerce', async () => {
      const strId = '42' as any;
      const mockResponse = { message: 'Booster updated successfully.' };
      boosterService.updateBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateBooster(strId, baseDto);

      expect(result).toEqual(mockResponse);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(strId, baseDto);
    });

    it('should propagate NotFoundException from the service', async () => {
      boosterService.updateBooster.mockRejectedValueOnce(
        new NotFoundException(`Booster with ID ${baseId} not found.`),
      );

      await expect(
        controller.updateBooster(baseId as any, baseDto),
      ).rejects.toThrow(NotFoundException);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        baseDto,
      );
    });

    it('should propagate BadRequestException from the service (e.g., invalid dates or project/brand/city mismatch)', async () => {
      boosterService.updateBooster.mockRejectedValueOnce(
        new BadRequestException('Invalid date range'),
      );

      await expect(
        controller.updateBooster(baseId as any, baseDto),
      ).rejects.toThrow(BadRequestException);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        baseDto,
      );
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.updateBooster.mockRejectedValueOnce(
        new InternalServerErrorException(
          'An unexpected error occurred while updating the Booster.',
        ),
      );

      await expect(
        controller.updateBooster(baseId as any, baseDto),
      ).rejects.toThrow(InternalServerErrorException);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        baseDto,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('transaction failed');
      boosterService.updateBooster.mockRejectedValueOnce(err);

      await expect(
        controller.updateBooster(baseId as any, baseDto),
      ).rejects.toThrow(err);
      expect(boosterService.updateBooster).toHaveBeenCalledWith(
        baseId,
        baseDto,
      );
    });
  });

  describe('deleteBooster', () => {
    const baseId = 42;

    it('should delete a booster successfully (success + response time)', async () => {
      const mockResponse = {
        message: `Booster with ID ${baseId} has been deleted successfully.`,
      };
      boosterService.deleteBooster.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.deleteBooster(baseId as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(baseId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass the id to the service unchanged', async () => {
      const id = 77;
      const mockResponse = {
        message: `Booster with ID ${id} has been deleted successfully.`,
      };
      boosterService.deleteBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.deleteBooster(id as any);

      expect(result).toBe(mockResponse);
      expect(boosterService.deleteBooster).toHaveBeenCalledTimes(1);
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(id);
    });

    it('should throw BadRequestException at controller level for non-numeric id and not call service', async () => {
      const badId = 'abc' as any;

      await expect(controller.deleteBooster(badId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteBooster(badId)).rejects.toThrow(
        'Invalid boosterId. It must be a number.',
      );
      expect(boosterService.deleteBooster).not.toHaveBeenCalled();
    });

    it('should accept stringified numeric id and pass it through unchanged when pipes do not coerce', async () => {
      const strId = '42' as any;
      const mockResponse = {
        message: `Booster with ID ${strId} has been deleted successfully.`,
      };
      boosterService.deleteBooster.mockResolvedValueOnce(mockResponse);

      const result = await controller.deleteBooster(strId);

      expect(result).toEqual(mockResponse);
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(strId);
    });

    it('should propagate NotFoundException from the service', async () => {
      boosterService.deleteBooster.mockRejectedValueOnce(
        new NotFoundException(`Booster with ID ${baseId} not found.`),
      );

      await expect(controller.deleteBooster(baseId as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(baseId);
    });

    it('should propagate BadRequestException from the service (e.g., invalid ID)', async () => {
      boosterService.deleteBooster.mockRejectedValueOnce(
        new BadRequestException('Invalid ID. ID must be a positive number.'),
      );

      await expect(controller.deleteBooster(baseId as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(baseId);
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      boosterService.deleteBooster.mockRejectedValueOnce(
        new InternalServerErrorException(
          'An unexpected error occurred while deleting the Booster.',
        ),
      );

      await expect(controller.deleteBooster(baseId as any)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(baseId);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('repository failure');
      boosterService.deleteBooster.mockRejectedValueOnce(err);

      await expect(controller.deleteBooster(baseId as any)).rejects.toThrow(
        err,
      );
      expect(boosterService.deleteBooster).toHaveBeenCalledWith(baseId);
    });
  });
});
