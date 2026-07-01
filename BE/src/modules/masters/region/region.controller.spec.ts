import { Test, TestingModule } from '@nestjs/testing';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { CanActivate } from '@nestjs/common';
import { CreateUpdateRegionDto } from './dto/create-update-region.dto';

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

describe('RegionController', () => {
  let controller: RegionController;
  let service: jest.Mocked<RegionService>;

  const mockCreatedRegion = { id: 1, name: 'North' };
  const mockRegionsPage: any = {
    message: 'Regions fetched successfully.',
    data: {
      regions: [{ id: 1, name: 'North' }],
      total: 1,
      currentPage: 1,
      totalPages: 1,
    },
  };

  const mockDropdown: any = {
    message: 'Regions dropdown fetched successfully.',
    data: [{ id: 1, name: 'North' }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [
        {
          provide: RegionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getDropdown: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MockRmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(MockRolesGuard)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<RegionController>(RegionController);
    service = module.get(RegionService) as jest.Mocked<RegionService>;

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const dto: CreateUpdateRegionDto = { name: 'North' };
      service.create.mockResolvedValueOnce({
        message: 'Region created successfully.',
        data: mockCreatedRegion,
      });

      const res = await controller.create(dto);
      expect(res).toEqual({
        message: 'Region created successfully.',
        data: mockCreatedRegion,
      });
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed query and return page', async () => {
      service.findAll.mockResolvedValueOnce(mockRegionsPage);

      const res = await controller.findAll({
        page: '1',
        limit: '10',
        search: 'North',
      } as any);
      expect(res).toEqual(mockRegionsPage);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'North',
        sortBy: undefined,
      });
    });

    it('should default page/limit when not provided', async () => {
      service.findAll.mockResolvedValueOnce(mockRegionsPage);
      const res = await controller.findAll({} as any);
      expect(res).toEqual(mockRegionsPage);
      expect(service.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        sortBy: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return region', async () => {
      const expected = {
        message: 'Region fetched successfully.',
        data: mockCreatedRegion,
      };
      service.findOne.mockResolvedValueOnce(expected);

      const res = await controller.findOne(1);
      expect(res).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: CreateUpdateRegionDto = { name: 'North-East' };
      const expected = {
        message: 'Region updated successfully.',
        data: { id: 1 },
      };
      service.update.mockResolvedValueOnce(expected);

      const res = await controller.update(1, dto);
      expect(res).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove (soft delete)', () => {
    it('should call service.softDelete and return message', async () => {
      const expected = { message: 'Region deleted successfully.' };
      service.softDelete.mockResolvedValueOnce(expected);

      const res = await controller.remove(2);
      expect(res).toEqual(expected);
      expect(service.softDelete).toHaveBeenCalledWith(2);
    });
  });

  describe('dropdown', () => {
    it('should return dropdown list from service.getDropdown', async () => {
      service.getDropdown.mockResolvedValueOnce(mockDropdown);

      const res = await controller.dropdown();
      expect(res).toEqual(mockDropdown);
      expect(service.getDropdown).toHaveBeenCalled();
    });

    it('should return empty array when service returns empty data', async () => {
      service.getDropdown.mockResolvedValueOnce({
        message: 'Regions dropdown fetched successfully.',
        data: [],
      });

      const res = await controller.dropdown();
      expect(res).toEqual({
        message: 'Regions dropdown fetched successfully.',
        data: [],
      });
      expect(service.getDropdown).toHaveBeenCalled();
    });
  });
});
