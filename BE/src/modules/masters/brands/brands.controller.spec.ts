import { Test, TestingModule } from '@nestjs/testing';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import {
  CanActivate,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

// Simple guard mocks to bypass Nest's guard behaviour in unit tests
class MockRmAdminAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}
class MockRolesGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('BrandsController', () => {
  let controller: BrandsController;
  let brandsService: jest.Mocked<BrandsService>;

  const mockUser = { id: 11, name: 'Brand Admin', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        {
          provide: BrandsService,
          useValue: {
            findAll: jest.fn(),
            findAllBrands: jest.fn(),
            getBrandById: jest.fn(),
            updateBrand: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<BrandsController>(BrandsController);
    brandsService = module.get(BrandsService) as jest.Mocked<BrandsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllBrands', () => {
    it('should call brandsService.findAll with correct params and return result', async () => {
      const queryDto: CommonFindAllQueryDto = {
        page: 2,
        limit: 20,
        search: 'nike',
        sortBy: 'name',
      };

      const expectedResult = {
        statusCode: 200,
        message: 'Brands fetched successfully',
        data: { brands: [], total: 0, currentPage: 2 },
      };

      brandsService.findAll.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.findAllBrands(mockUser, queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(brandsService.findAll).toHaveBeenCalledWith(
        mockUser,
        queryDto.page,
        queryDto.limit,
        queryDto.search,
        queryDto.sortBy,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate errors from brandsService.findAll (failure)', async () => {
      const queryDto: CommonFindAllQueryDto = { page: 1, limit: 10 };
      const err = new BadRequestException('Invalid query');

      brandsService.findAll.mockRejectedValue(err);

      const start = Date.now();
      await expect(
        controller.findAllBrands(mockUser, queryDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findAllBrandsAdmin', () => {
    it('should return all brands for admin', async () => {
      const expected = {
        statusCode: 200,
        message: 'All brands',
        data: [{ id: 1, name: 'Brand A' }],
      };

      brandsService.findAllBrands.mockResolvedValue(expected);

      const start = Date.now();
      const result = await controller.findAllBrandsAdmin();
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(brandsService.findAllBrands).toHaveBeenCalledTimes(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const err = new Error('DB down');
      brandsService.findAllBrands.mockRejectedValue(err);

      const start = Date.now();
      await expect(controller.findAllBrandsAdmin()).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findOne', () => {
    it('should return brand when found', async () => {
      const brandId = 42;
      const expected = {
        statusCode: 200,
        message: 'Brand found',
        data: { id: brandId, name: 'B' },
      };

      brandsService.getBrandById.mockResolvedValue(expected);

      const start = Date.now();
      const result = await controller.findOne(brandId);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(brandsService.getBrandById).toHaveBeenCalledWith(brandId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when brand not found', async () => {
      const brandId = 999;
      const err = new NotFoundException(`Brand with id ${brandId} not found`);

      brandsService.getBrandById.mockRejectedValue(err);

      const start = Date.now();
      await expect(controller.findOne(brandId)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('update', () => {
    it('should call updateBrand and return updated data', async () => {
      const brandId = 5;
      const updateDto = { name: 'Updated Brand' } as any;
      const expected = {
        statusCode: 200,
        message: 'Brand updated',
        data: { id: brandId, name: updateDto.name },
      };

      brandsService.updateBrand.mockResolvedValue(expected);

      const start = Date.now();
      const result = await controller.update(brandId, updateDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(brandsService.updateBrand).toHaveBeenCalledWith(
        brandId,
        updateDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate validation errors from service', async () => {
      const brandId = 5;
      const updateDto = { name: '' } as any;
      const err = new BadRequestException('Invalid payload');

      brandsService.updateBrand.mockRejectedValue(err);

      const start = Date.now();
      await expect(controller.update(brandId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const brandId = 5;
      const updateDto = { name: 'OK' } as any;
      const err = new Error('Unexpected');

      brandsService.updateBrand.mockRejectedValue(err);

      const start = Date.now();
      await expect(controller.update(brandId, updateDto)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
