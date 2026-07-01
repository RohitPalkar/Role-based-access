import { Test, TestingModule } from '@nestjs/testing';
import { InventoryUnitController } from './inventory-unit.controller';
import { InventoryUnitService } from './inventory-unit.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('InventoryUnitController', () => {
  let controller: InventoryUnitController;
  let service: jest.Mocked<InventoryUnitService>;

  const mockUser = { id: 1, dbId: 11, name: 'Admin', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryUnitController],
      providers: [
        {
          provide: InventoryUnitService,
          useValue: {
            getInventoryList: jest.fn(),
            getInventoryDropdowns: jest.fn(),
            updateInventoryUnit: jest.fn(),
            sampleExcel: jest.fn(),
            bulkInsert: jest.fn(),
            mapUnitToVoucher: jest.fn(),
            getInventoryUnitById: jest.fn(),
            exportInventory: jest.fn(),
            getApprovalRequests: jest.fn(),
            approveBlockingRequest: jest.fn(),
            rejectBlockingRequest: jest.fn(),
            releaseBlockingRequest: jest.fn(),
          },
        },
        EventEmitter2,
      ],
    }).compile();

    controller = module.get<InventoryUnitController>(InventoryUnitController);
    service = module.get(
      InventoryUnitService,
    ) as jest.Mocked<InventoryUnitService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('getInventoryList', () => {
    const queryDto = {
      page: 1,
      limit: 10,
      campaignId: 160,
      tower: ['A'],
      floor: ['1'],
      configuration: ['2BHK'],
      series: ['S1'],
      facing: ['East'],
      inventoryStatus: 'AVAILABLE',
    };

    it('should return inventory list', async () => {
      const expected = {
        statusCode: 200,
        message: 'List fetched',
        data: [],
      };

      service.getInventoryList.mockResolvedValueOnce(expected);

      const mockUser = { id: 1, role: 'admin' };
      const result = await controller.getInventoryList(
        mockUser,
        queryDto as any,
      );

      expect(result).toEqual(expected);
      expect(service.getInventoryList).toHaveBeenCalledWith(mockUser, queryDto);
    });

    it('should propagate error', async () => {
      service.getInventoryList.mockRejectedValueOnce(
        new Error('Service error'),
      );

      const mockUser = { id: 1, role: 'admin' };
      await expect(
        controller.getInventoryList(mockUser, queryDto as any),
      ).rejects.toThrow(Error);
    });
  });

  describe('getInventoryDropdowns', () => {
    const queryDto = {
      campaignId: 160,
      towerName: ['A', 'B'],
      floor: ['1', '2'],
    };

    it('should return dropdown data', async () => {
      const expected = {
        statusCode: 200,
        message: 'Dropdown fetched',
        data: [],
      };

      service.getInventoryDropdowns.mockResolvedValueOnce(expected);

      const result = await controller.getInventoryDropdowns(queryDto as any);

      expect(result).toEqual(expected);
      expect(service.getInventoryDropdowns).toHaveBeenCalledWith(queryDto);
    });

    it('should propagate error', async () => {
      service.getInventoryDropdowns.mockRejectedValueOnce(
        new Error('Service error'),
      );

      await expect(
        controller.getInventoryDropdowns(queryDto as any),
      ).rejects.toThrow(Error);
    });
  });

  describe('updateInventoryUnit', () => {
    const id = '1';
    const updateDto = { name: 'Updated Unit' };

    it('should update inventory unit', async () => {
      const expected = {
        statusCode: 200,
        message: 'Updated successfully',
        data: updateDto,
      };

      service.updateInventoryUnit.mockResolvedValueOnce(expected);

      const result = await controller.updateInventoryUnit(id, updateDto as any);

      expect(result).toEqual(expected);
      expect(service.updateInventoryUnit).toHaveBeenCalledWith(id, updateDto);
    });

    it('should throw BadRequestException', async () => {
      service.updateInventoryUnit.mockRejectedValueOnce(
        new BadRequestException('Invalid data'),
      );

      await expect(
        controller.updateInventoryUnit(id, updateDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException', async () => {
      service.updateInventoryUnit.mockRejectedValueOnce(
        new InternalServerErrorException('DB error'),
      );

      await expect(
        controller.updateInventoryUnit(id, updateDto as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
  describe('sampleExcel', () => {
    it('should return sample excel', async () => {
      const expected = {
        statusCode: 200,
        message: 'Sample excel',
        data: { s3Path: 'inventory_units/inventory_unit_sample.xlsx' },
      };

      service.sampleExcel.mockResolvedValueOnce(expected);

      const result = await controller.sampleExcel();

      expect(result).toEqual(expected);
      expect(service.sampleExcel).toHaveBeenCalledTimes(1);
    });

    it('should propagate error', async () => {
      service.sampleExcel.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.sampleExcel()).rejects.toThrow(Error);
    });
  });

  // bulkInsert
  describe('bulkInsert', () => {
    const mockDto = {
      fileName: 'inventory_unit_sample.xlsx',
      key: 'inventory_units/inventory_unit_sample.xlsx',
      campaignId: 160,
    };

    it('should insert bulk data', async () => {
      const expected = {
        statusCode: 200,
        message: 'Inserted',
        data: { inserted: 1 },
      };

      service.bulkInsert.mockResolvedValueOnce(expected);

      const result = await controller.bulkInsert(mockUser, mockDto as any);

      expect(result).toEqual(expected);
      expect(service.bulkInsert).toHaveBeenCalledWith(mockUser, mockDto);
    });

    it('should propagate validation errors thrown by service', async () => {
      const err = new BadRequestException('Invalid file');
      service.bulkInsert.mockRejectedValueOnce(err);

      await expect(
        controller.bulkInsert(mockUser, mockDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate unexpected service errors', async () => {
      const err = new InternalServerErrorException('DB error');
      service.bulkInsert.mockRejectedValueOnce(err);

      await expect(
        controller.bulkInsert(mockUser, mockDto as any),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle empty or malformed dto according to service behaviour', async () => {
      const malformedDto = { fileName: '', data: [] };
      const expected = {
        statusCode: 200,
        message: 'No records',
        data: { inserted: 0 },
      };
      service.bulkInsert.mockResolvedValueOnce(expected);

      const result = await controller.bulkInsert(mockUser, malformedDto as any);

      expect(result).toEqual(expected);
      expect(service.bulkInsert).toHaveBeenCalledWith(mockUser, malformedDto);
    });
  });

  describe('getInventoryUnitById', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should return single unit detail', async () => {
      const expected = {
        message: 'Inventory unit fetched successfully.',
        data: {
          id,
          unitNumber: '101',
          campaignId: 160,
          campaignName: 'Test Campaign',
        },
      };

      service.getInventoryUnitById.mockResolvedValueOnce(expected);

      const result = await controller.getInventoryUnitById(id);

      expect(result).toEqual(expected);
      expect(service.getInventoryUnitById).toHaveBeenCalledWith(id);
    });

    it('should propagate not found from service', async () => {
      service.getInventoryUnitById.mockRejectedValueOnce(
        new NotFoundException('Inventory unit not found'),
      );

      await expect(controller.getInventoryUnitById(id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('exportAgreementListing', () => {
    const queryDto = {
      campaignId: 160,
      tower: ['A'],
      floor: ['1'],
      configuration: ['2BHK'],
      series: ['S1'],
      facing: ['East'],
      inventoryStatus: 'AVAILABLE',
    };

    it('should export inventory list', async () => {
      const expected = {
        statusCode: 200,
        message: 'Export successful',
        data: {},
      };

      service.exportInventory = jest.fn().mockResolvedValueOnce(expected);

      const mockUser = { id: 1, role: 'admin' };
      const result = await controller.exportAgreementListing(
        mockUser,
        queryDto as any,
      );

      expect(result).toEqual(expected);
      expect(service.exportInventory).toHaveBeenCalledWith(mockUser, queryDto);
    });

    it('should handle empty query params', async () => {
      const expected = {
        statusCode: 200,
        message: 'Export successful',
        data: {},
      };

      service.exportInventory = jest.fn().mockResolvedValueOnce(expected);

      const mockUser = { id: 1, role: 'admin' };
      const result = await controller.exportAgreementListing(
        mockUser,
        {} as any,
      );

      expect(result).toEqual(expected);
      expect(service.exportInventory).toHaveBeenCalledWith(mockUser, {});
    });

    it('should propagate service errors', async () => {
      service.exportInventory = jest
        .fn()
        .mockRejectedValueOnce(new Error('Service error'));

      const mockUser = { id: 1, role: 'admin' };
      await expect(
        controller.exportAgreementListing(mockUser, queryDto as any),
      ).rejects.toThrow(Error);
    });
  });

  describe('getApprovalRequests', () => {
    const queryDto = {
      page: 1,
      limit: 10,
      unitNumber: '101',
      towerName: 'A',
      search: 'Test',
    };

    it('should return approval requests', async () => {
      const expected = {
        message: 'Approval requests fetched successfully.',
        data: { result: [], total: 0 },
      };

      service.getApprovalRequests.mockResolvedValueOnce(expected);

      const result = await controller.getApprovalRequests(
        queryDto as any,
        mockUser,
      );

      expect(result).toEqual(expected);
      expect(service.getApprovalRequests).toHaveBeenCalledWith(
        queryDto,
        mockUser,
      );
    });

    it('should propagate errors', async () => {
      service.getApprovalRequests.mockRejectedValueOnce(
        new Error('Service error'),
      );

      await expect(
        controller.getApprovalRequests(queryDto as any, mockUser),
      ).rejects.toThrow(Error);
    });
  });

  describe('approveBlockingRequest', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should approve blocking request', async () => {
      const expected = {
        statusCode: 200,
        message: 'Approval request approved successfully',
        data: { id },
      };

      service.approveBlockingRequest.mockResolvedValueOnce(expected);

      const mockDto = { remark: 'Approved' };
      const result = await controller.approveBlockingRequest(
        id,
        mockDto,
        mockUser,
      );

      expect(result).toEqual(expected);
      expect(service.approveBlockingRequest).toHaveBeenCalledWith(
        id,
        mockDto,
        mockUser,
      );
    });

    it('should propagate service errors', async () => {
      service.approveBlockingRequest.mockRejectedValueOnce(
        new BadRequestException('Not authorized'),
      );

      const mockDto = { remark: 'Test' };
      await expect(
        controller.approveBlockingRequest(id, mockDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectBlockingRequest', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const dto = { rejectedReason: 'Invalid payment' };

    it('should reject blocking request', async () => {
      const expected = {
        statusCode: 200,
        message: 'Approval request rejected successfully',
        data: { id },
      };

      service.rejectBlockingRequest.mockResolvedValueOnce(expected);

      const result = await controller.rejectBlockingRequest(
        id,
        dto as any,
        mockUser,
      );

      expect(result).toEqual(expected);
      expect(service.rejectBlockingRequest).toHaveBeenCalledWith(
        id,
        dto,
        mockUser,
      );
    });

    it('should propagate service errors', async () => {
      service.rejectBlockingRequest.mockRejectedValueOnce(
        new BadRequestException('Invalid request'),
      );

      await expect(
        controller.rejectBlockingRequest(id, dto as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseBlockingRequest', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    it('should release blocking request', async () => {
      const expected = {
        statusCode: 200,
        message: 'Blocking request released successfully',
        data: { id },
      };

      service.releaseBlockingRequest.mockResolvedValueOnce(expected);

      const result = await controller.releaseBlockingRequest(id, mockUser);

      expect(result).toEqual(expected);
      expect(service.releaseBlockingRequest).toHaveBeenCalledWith(id, mockUser);
    });

    it('should propagate service errors', async () => {
      service.releaseBlockingRequest.mockRejectedValueOnce(
        new BadRequestException('Invalid request'),
      );

      await expect(
        controller.releaseBlockingRequest(id, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
