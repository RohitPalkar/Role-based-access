import { Test, TestingModule } from '@nestjs/testing';
import { IncentivePolicyController } from './incentive_policy.controller';
import { IncentivePolicyService } from './incentive_policy.service';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { CanActivate } from '@nestjs/common';

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

describe('IncentivePolicyController', () => {
  let controller: IncentivePolicyController;
  let service: jest.Mocked<IncentivePolicyService>;

  const mockUser = {
    id: 10,
    dbId: 100,
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncentivePolicyController],
      providers: [
        {
          provide: IncentivePolicyService,
          useValue: {
            create: jest.fn(),
            findProjectsByBrandAndCity: jest.fn(),
            getAllPolicies: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            getIncentiveSlabsAndBoosters: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<IncentivePolicyController>(
      IncentivePolicyController,
    );
    service = module.get(
      IncentivePolicyService,
    ) as jest.Mocked<IncentivePolicyService>;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const dto = { name: 'policy' } as any;
      const expected = { message: 'created' };
      service.create.mockResolvedValueOnce(expected);

      const res = await controller.create(dto);
      expect(res).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findProjectsByBrandAndCity', () => {
    it('should forward brandId and cityIds to service', async () => {
      service.findProjectsByBrandAndCity.mockResolvedValueOnce({ data: [] });

      const result = await controller.findProjectsByBrandAndCity('1', '2,3');
      expect(result).toEqual({ data: [] });
      expect(service.findProjectsByBrandAndCity).toHaveBeenCalledWith(
        '1',
        '2,3',
      );
    });
  });

  describe('getAllPolicies', () => {
    it('should call service.getAllPolicies with mapped query', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: 'abc',
        sortBy: 'createdAt:desc',
        status: 'active',
        brandId: [1, 2],
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        groupId: 5,
      } as any;

      const expected = { data: [], message: 'ok' };
      service.getAllPolicies.mockResolvedValueOnce(expected);

      const result = await controller.getAllPolicies(query);
      expect(result).toEqual(expected);
      expect(service.getAllPolicies).toHaveBeenCalledWith({
        page: query.page,
        limit: query.limit,
        search: query.search,
        sortBy: query.sortBy,
        status: query.status,
        brandId: query.brandId,
        startDate: query.startDate,
        endDate: query.endDate,
        groupId: query.groupId,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return value', async () => {
      const expected = { data: { id: 1 } };
      service.findOne.mockResolvedValueOnce(expected);

      const res = await controller.findOne(1);
      expect(res).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call service.update and return value', async () => {
      const dto = { name: 'updated' } as any;
      const expected = { message: 'updated' };
      service.update.mockResolvedValueOnce(expected);

      const res = await controller.update(2, dto);
      expect(res).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith(2, dto);
    });
  });

  describe('getIncentiveSlabsAndBoosters', () => {
    it('should call service with parsed projectIds array and user dbId', async () => {
      const expected = { message: 'ok', data: {} };
      service.getIncentiveSlabsAndBoosters.mockResolvedValueOnce(expected);

      const res = await controller.getIncentiveSlabsAndBoosters(mockUser);

      expect(res).toEqual(expected);
      expect(service.getIncentiveSlabsAndBoosters).toHaveBeenCalledWith(
        mockUser,
      );
    });
  });
});
