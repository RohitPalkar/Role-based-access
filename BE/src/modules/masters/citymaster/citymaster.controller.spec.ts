import { Test, TestingModule } from '@nestjs/testing';
import { CityMasterController } from './citymaster.controller';
import { CityMasterService } from './citymaster.service';
import { BadRequestException } from '@nestjs/common';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

describe('CityMasterController', () => {
  let controller: CityMasterController;
  let cityMasterService: jest.Mocked<CityMasterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CityMasterController],
      providers: [
        {
          provide: CityMasterService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CityMasterController>(CityMasterController);
    cityMasterService = module.get(
      CityMasterService,
    ) as jest.Mocked<CityMasterService>;

    jest.clearAllMocks();
  });

  describe('getCities', () => {
    it('should call findAll with undefined when no brandId provided', async () => {
      const expected = [{ id: 1, name: 'City A' }];
      cityMasterService.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getCities(undefined);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(cityMasterService.findAll).toHaveBeenCalledWith(undefined);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should parse single numeric brandId and call findAll with [number]', async () => {
      const expected = [{ id: 2, name: 'City B' }];
      cityMasterService.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getCities('3');
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(cityMasterService.findAll).toHaveBeenCalledWith([3]);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should parse multiple comma separated brandIds with spaces', async () => {
      const expected = [{ id: 4, name: 'City C' }];
      cityMasterService.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getCities('1, 2 ,3');
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(cityMasterService.findAll).toHaveBeenCalledWith([1, 2, 3]);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should ignore non-numeric entries and call findAll with remaining numbers', async () => {
      const expected = [{ id: 5, name: 'City D' }];
      cityMasterService.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getCities('abc, 4, , 5x, 6 ');
      const duration = Date.now() - start;

      // only '4' and '6' are valid numbers
      expect(result).toEqual(expected);
      expect(cityMasterService.findAll).toHaveBeenCalledWith([4, 6]);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException when brandId param contains no valid numbers', async () => {
      await expect(controller.getCities('abc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getCities(' , , ')).rejects.toThrow(
        BadRequestException,
      );

      // ensure service not called
      expect(cityMasterService.findAll).not.toHaveBeenCalled();
    });
  });
});
