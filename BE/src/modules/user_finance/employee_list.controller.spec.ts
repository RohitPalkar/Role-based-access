import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeListController } from './employee_list.controller';
import { EmployeeListService } from './employee_list.service';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import {
  CanActivate,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { UpdateUserFinanceDto } from './dto/update_employee_list.dto';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

// simple guard mocks to bypass Nest guard behaviour in unit tests
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

describe('EmployeeListController', () => {
  let controller: EmployeeListController;
  let service: jest.Mocked<EmployeeListService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeListController],
      providers: [
        {
          provide: EmployeeListService,
          useValue: {
            getAllEmployees: jest.fn(),
            getEmployeeById: jest.fn(),
            updateEmployeeFinance: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<EmployeeListController>(EmployeeListController);
    service = module.get(
      EmployeeListService,
    ) as jest.Mocked<EmployeeListService>;
    jest.clearAllMocks();
  });

  describe('getAllEmployees', () => {
    it('should call service.getAllEmployees with parsed query params and return result', async () => {
      const query: CommonFindAllQueryDto = {
        page: 2,
        limit: 25,
        search: 'alice',
        sortBy: 'updatedAt',
      };

      const expected = {
        statusCode: 200,
        message: 'Employees fetched',
        data: { items: [], totalRecords: 0, currentPage: 2 },
      };

      service.getAllEmployees.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getAllEmployees(query);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.getAllEmployees).toHaveBeenCalledWith(
        query.page,
        query.limit,
        query.search,
        query.sortBy,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const query: CommonFindAllQueryDto = { page: 1, limit: 10 };
      const err = new Error('DB error');

      service.getAllEmployees.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.getAllEmployees(query)).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee when found', async () => {
      const id = 123;
      const expected = { id, name: 'Alice', email: 'a@example.com' };

      service.getEmployeeById.mockResolvedValueOnce(expected as any);

      const start = Date.now();
      const result = await controller.getEmployeeById(id);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.getEmployeeById).toHaveBeenCalledWith(id);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when employee not found', async () => {
      const id = 999;
      const err = new NotFoundException(`Employee with id ${id} not found`);

      service.getEmployeeById.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.getEmployeeById(id)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const id = 5;
      const err = new Error('unexpected');

      service.getEmployeeById.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.getEmployeeById(id)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateFinance', () => {
    it('should call updateEmployeeFinance and return updated user', async () => {
      const id = 77;
      const dto: UpdateUserFinanceDto = {
        accountNumber: 'ACC123',
        ifsc: 'IFSC0001',
        bankName: 'Bank A',
      } as any;

      const expected = {
        statusCode: 200,
        message: 'Updated',
        data: { id, ...dto },
      };

      service.updateEmployeeFinance.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.updateFinance(id, dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.updateEmployeeFinance).toHaveBeenCalledWith(id, dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate validation errors from service', async () => {
      const id = 77;
      const dto: UpdateUserFinanceDto = { accountNumber: '' } as any;
      const err = new BadRequestException('Invalid payload');

      service.updateEmployeeFinance.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.updateFinance(id, dto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const id = 77;
      const dto: UpdateUserFinanceDto = {
        accountNumber: 'ACC',
        ifsc: 'IFSC',
      } as any;
      const err = new Error('boom');

      service.updateEmployeeFinance.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.updateFinance(id, dto)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
