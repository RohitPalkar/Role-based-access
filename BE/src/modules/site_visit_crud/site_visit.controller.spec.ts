import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SiteVisitCrudController } from './site_visit.controller';
import { SiteVisitCrudService } from './site_visit.service';
import { ConfigService } from '@nestjs/config';

describe('SiteVisitCrudController', () => {
  let controller: SiteVisitCrudController;
  let service: jest.Mocked<SiteVisitCrudService>;
  let configService: jest.Mocked<ConfigService>;
  beforeEach(() => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateVisitCount: jest.fn(),
      computeIsMarkRevisitByEnquiry: jest.fn(),
      getDropDown: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    controller = new SiteVisitCrudController(service, configService);
  });

  describe('createForm', () => {
    const Domain = 'example.com';

    // minimal valid DTO per new CreateSiteVisitFormDto
    const baseDto: any = {
      enquiryId: 123,
      mobile: '9999',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      residentialAddress: 'Somewhere',
      occupation: 'Engineer',
      purchaseDuration: 'soon',
      financeSource: 'Savings',
      residentialStatus: 'Rented',
      projectName: 'Alpha Heights',
      // optional
      projectId: 1,
    };

    const makeReq = () => ({ get: jest.fn().mockReturnValue(Domain) }) as any;

    it('success → creates form and returns success message (response time)', async () => {
      const dto = { ...baseDto };
      const saved = { id: 1, savedForm: { id: 1, ...dto } };

      service.create.mockResolvedValueOnce(saved);

      const start = Date.now();
      const result = await controller.createForm(dto, makeReq());
      const duration = Date.now() - start;

      expect(result).toEqual({
        message: 'Visit created And mapped successfully.',
      });
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
      expect(duration).toBeLessThan(1000);
    });

    it('failure → duplicate enquiryId throws BadRequest', async () => {
      const dto = { ...baseDto };

      service.create.mockRejectedValueOnce(
        new BadRequestException(
          'A form with this Enquiry Id is already submitted.',
        ),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('failure → invalid dropdown value (residentialStatus)', async () => {
      const dto = { ...baseDto, residentialStatus: 'alien' };

      service.create.mockRejectedValueOnce(
        new BadRequestException(
          'please select value from dropdown for attribute resedential status',
        ),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('failure → invalid dropdown value (ownedHouseCount)', async () => {
      const dto = { ...baseDto, ownedHouseCount: '100 homes' };

      service.create.mockRejectedValueOnce(
        new BadRequestException(
          'please select value from dropdown for attribute number of house owned',
        ),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('failure → invalid dropdown value (purchaseDuration)', async () => {
      const dto = { ...baseDto, purchaseDuration: 'forever' };

      service.create.mockRejectedValueOnce(
        new BadRequestException(
          'please select value from dropdown for attribute purchse duration',
        ),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('failure → invalid dropdown value (financeSource)', async () => {
      const dto = { ...baseDto, financeSource: 'crypto' };

      service.create.mockRejectedValueOnce(
        new BadRequestException(
          'please select value from dropdown for attribute finance source',
        ),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('failure → welcome code used = 0 without primarySource', async () => {
      const dto = { ...baseDto, isWelcomeCodeUsed: 0 };
      service.create.mockRejectedValueOnce(
        new BadRequestException('Please send a valid request.'),
      );

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });

    it('unexpected error → bubbles up (DB down)', async () => {
      const dto = { ...baseDto };

      service.create.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(controller.createForm(dto, makeReq())).rejects.toThrow(
        'DB connection lost',
      );
      expect(service.create).toHaveBeenCalledWith(
        dto,
        'example.com/alpha-heights',
      );
    });
  });

  describe('updateForm', () => {
    it('success → updates form and returns success message (response time)', async () => {
      const dto = { occupation: 'Manager' } as any;
      const id = 1;

      service.update.mockResolvedValueOnce({ id, dto } as any);

      const start = Date.now();
      const result = await controller.updateForm(id, dto);
      const duration = Date.now() - start;

      expect(result).toEqual({
        message: 'Visit details updated successfully.',
      });
      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(duration).toBeLessThan(1000);
    });

    it('failure → throws BadRequest when invalid update payload', async () => {
      const dto = { financeSource: 'crypto' } as any;
      const id = 2;

      service.update.mockRejectedValueOnce(
        new BadRequestException(
          'please select value from dropdown for attribute finance source',
        ),
      );

      await expect(controller.updateForm(id, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });

    it('unexpected error → bubbles up', async () => {
      const dto = { occupation: 'Engineer' } as any;
      const id = 3;

      service.update.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(controller.updateForm(id, dto)).rejects.toThrow(
        'DB write failed',
      );
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('updateVisitCount', () => {
    it('success → increments visitCount and returns success message (response time)', async () => {
      const id = 10;
      const dto = { occupation: 'Engineer' } as any;

      service.updateVisitCount = jest.fn().mockResolvedValueOnce({
        id,
        enquiryId: id,
        visitCount: 2,
        ...dto,
      });

      const start = Date.now();
      const result = await controller.updateVisitCount(id, dto);
      const duration = Date.now() - start;

      expect(result).toEqual({
        message: 'Visit details updated successfully.',
      });
      expect(service.updateVisitCount).toHaveBeenCalledWith(id, dto);
      expect(duration).toBeLessThan(1000);
    });

    it('failure → record not found throws error', async () => {
      const id = 999;
      const dto = {};

      service.updateVisitCount = jest
        .fn()
        .mockRejectedValueOnce(new Error(`Record with id ${id} not found`));

      await expect(controller.updateVisitCount(id, dto)).rejects.toThrow(
        `Record with id ${id} not found`,
      );
      expect(service.updateVisitCount).toHaveBeenCalledWith(id, dto);
    });

    it('success → increments visitCount without dto', async () => {
      const id = 11;

      service.updateVisitCount = jest.fn().mockResolvedValueOnce({
        id,
        enquiryId: id,
        visitCount: 1,
      });

      const result = await controller.updateVisitCount(id, undefined);
      expect(result).toEqual({
        message: 'Visit details updated successfully.',
      });
      expect(service.updateVisitCount).toHaveBeenCalledWith(id, undefined);
    });

    it('unexpected error → bubbles up (DB save failed)', async () => {
      const id = 12;
      const dto = { occupation: 'Manager' } as any;

      service.updateVisitCount = jest
        .fn()
        .mockRejectedValueOnce(new Error('DB save failed'));

      await expect(controller.updateVisitCount(id, dto)).rejects.toThrow(
        'DB save failed',
      );
      expect(service.updateVisitCount).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('listForms', () => {
    it('success → returns forms filtered by mobile + ProjectName (response time)', async () => {
      const filter = {
        mobile: '9999',
        ProjectName: 'Alpha Heights',
        sourcingRmName: undefined,
        fromDate: undefined,
        toDate: undefined,
      };

      const forms = [
        {
          projectId: 1,
          mobile: '9999',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          residentialAddress: '123 Street',
          occupation: 'Engineer',
          organizationName: 'ABC Corp',
          designation: 'Manager',
          currentAccommodation: 'rented',
          ownedHouseCount: '1st home',
          purchaseDuration: '1 month',
          financeSource: 'own funds',
          residentialStatus: 'indian',
          organizationAddress: '456 Road',
          assignedRM: 'RM01',
          assignedRmName: 'Alice',
          sourcingRm: 'SRM01',
          sourcingRmName: 'Bob',
        },
      ];

      service.findAll = jest.fn().mockResolvedValueOnce({ data: forms });

      const start = Date.now();
      const result = await controller.listForms(
        filter.mobile,
        filter.ProjectName,
        filter.sourcingRmName,
        filter.fromDate,
        filter.toDate,
      );
      const duration = Date.now() - start;

      expect(result).toEqual({ data: forms });
      expect(service.findAll).toHaveBeenCalledWith(filter);
      expect(duration).toBeLessThan(1000);
    });

    it('success → returns empty list if no forms found', async () => {
      const filter = {
        mobile: '8888',
        ProjectName: 'SkyCourt',
        sourcingRmName: undefined,
        fromDate: undefined,
        toDate: undefined,
      };

      service.findAll = jest.fn().mockResolvedValueOnce({ data: [] });

      const result = await controller.listForms(
        filter.mobile,
        filter.ProjectName,
        filter.sourcingRmName,
        filter.fromDate,
        filter.toDate,
      );

      expect(result).toEqual({ data: [] });
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it('success → works when only mobile filter is provided', async () => {
      const filter = {
        mobile: '7777',
        ProjectName: undefined,
        sourcingRmName: undefined,
        fromDate: undefined,
        toDate: undefined,
      };

      service.findAll = jest
        .fn()
        .mockResolvedValueOnce({ data: [{ projectId: 5, mobile: '7777' }] });

      const result = await controller.listForms(
        filter.mobile,
        filter.ProjectName,
        filter.sourcingRmName,
        filter.fromDate,
        filter.toDate,
      );

      expect(result).toEqual({ data: [{ projectId: 5, mobile: '7777' }] });
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it('success → forwards all provided filters (including sourcingRmName & date range)', async () => {
      const filter = {
        mobile: '5555',
        ProjectName: 'Omega Towers',
        sourcingRmName: 'Charlie RM',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      };

      const payload = { data: [] };
      service.findAll = jest.fn().mockResolvedValueOnce(payload);

      const result = await controller.listForms(
        filter.mobile,
        filter.ProjectName,
        filter.sourcingRmName,
        filter.fromDate,
        filter.toDate,
      );

      expect(result).toEqual(payload);

      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it('failure → bubbles up DB error', async () => {
      const filter = {
        mobile: '6666',
        ProjectName: 'Delta Residency',
        sourcingRmName: undefined,
        fromDate: undefined,
        toDate: undefined,
      };

      service.findAll = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      await expect(
        controller.listForms(
          filter.mobile,
          filter.ProjectName,
          filter.sourcingRmName,
          filter.fromDate,
          filter.toDate,
        ),
      ).rejects.toThrow('DB error');

      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it('success → accepts undefined for all filters (no filtering)', async () => {
      const filter = {
        mobile: undefined,
        ProjectName: undefined,
        sourcingRmName: undefined,
        fromDate: undefined,
        toDate: undefined,
      };

      const payload = { data: [{ projectId: 42, mobile: '0000' }] };
      service.findAll = jest.fn().mockResolvedValueOnce(payload);

      const result = await controller.listForms(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
      );

      expect(result).toEqual(payload);
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });

    it('success → preserves input exactly (no trimming/mutation by controller)', async () => {
      const filter = {
        mobile: '  1234  ',
        ProjectName: '  Mirage  ',
        sourcingRmName: '  Eve  ',
        fromDate: ' 2025-01-01 ',
        toDate: ' 2025-01-31 ',
      };

      const payload = { data: [] };
      service.findAll = jest.fn().mockResolvedValueOnce(payload);

      const result = await controller.listForms(
        filter.mobile,
        filter.ProjectName,
        filter.sourcingRmName,
        filter.fromDate,
        filter.toDate,
      );

      expect(result).toEqual(payload);
      expect(service.findAll).toHaveBeenCalledWith(filter);
    });
  });

  describe('getFormDropdown', () => {
    it('should get dropdown options with isGreOrigin true', async () => {
      const name = 'test';
      const req = {
        get: jest.fn().mockReturnValue('https://gre-portal-url'),
      } as any;
      const expected = { options: ['a', 'b'] };

      configService.get.mockReturnValue('gre-portal-url');
      service.getDropDown.mockResolvedValue(expected);

      const result = await controller.getFormDropdown(name, req);

      expect(service.getDropDown).toHaveBeenCalledWith(name, true);
      expect(result).toEqual(expected);
    });

    it('should get dropdown options with isGreOrigin false', async () => {
      const name = 'test';
      const req = {
        get: jest.fn().mockReturnValue('https://other-url'),
      } as any;
      const expected = { options: ['x', 'y'] };

      configService.get.mockReturnValue('https://some-sv-url');
      service.getDropDown.mockResolvedValue(expected);

      const result = await controller.getFormDropdown(name, req);

      expect(service.getDropDown).toHaveBeenCalledWith(name, false);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from service', async () => {
      const name = 'test';
      const req = {
        get: jest.fn().mockReturnValue('https://other-url'),
      } as any;
      const error = new Error('failed');

      configService.get.mockReturnValue('https://some-sv-url');
      service.getDropDown.mockRejectedValue(error);

      await expect(controller.getFormDropdown(name, req)).rejects.toThrow(
        error,
      );
      expect(service.getDropDown).toHaveBeenCalledWith(name, false);
    });
  });

  describe('getVisitId', () => {
    it('success → returns form when found (response time)', async () => {
      const id = 1;
      const form = {
        enquiryId: 1,
        id: 101,
        createdAt: new Date('2025-01-01T10:00:00.000Z'),
        firstName: 'John',
        lastName: 'Doe',
        headCount: 3,
        assignedRM: 'RM01',
        exitTime: '17:30',
      };

      service.findOne = jest.fn().mockResolvedValueOnce({ data: form });

      const start = Date.now();
      const result = await controller.getVisitId(id);
      const duration = Date.now() - start;

      expect(result).toEqual({ data: form });
      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(duration).toBeLessThan(1000);
    });

    it('failure → throws NotFoundException when form does not exist', async () => {
      const id = 99;

      service.findOne = jest
        .fn()
        .mockRejectedValueOnce(new NotFoundException('Form not found'));

      await expect(controller.getVisitId(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.findOne).toHaveBeenCalledWith(id);
    });

    it('failure → bubbles up DB error', async () => {
      const id = 5;

      service.findOne = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      await expect(controller.getVisitId(id)).rejects.toThrow('DB error');
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('getIsMarkRevisitByEnquiry', () => {
    it('success → returns isMarkRevisit=1 (response time)', async () => {
      const enquiryId = 123;
      service.computeIsMarkRevisitByEnquiry = jest
        .fn()
        .mockResolvedValueOnce(1);

      const start = Date.now();
      const result = await controller.getIsMarkRevisitByEnquiry(enquiryId);
      const duration = Date.now() - start;

      expect(result).toEqual({
        statusCode: 200,
        message: 'isMarkRevisit computed',
        data: { enquiryId, isMarkRevisit: 1 },
      });
      expect(service.computeIsMarkRevisitByEnquiry).toHaveBeenCalledWith(
        enquiryId,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('success → returns isMarkRevisit=0', async () => {
      const enquiryId = 456;
      service.computeIsMarkRevisitByEnquiry = jest
        .fn()
        .mockResolvedValueOnce(0);

      const result = await controller.getIsMarkRevisitByEnquiry(enquiryId);

      expect(result).toEqual({
        statusCode: 200,
        message: 'isMarkRevisit computed',
        data: { enquiryId, isMarkRevisit: 0 },
      });
      expect(service.computeIsMarkRevisitByEnquiry).toHaveBeenCalledWith(
        enquiryId,
      );
    });

    it('failure → throws BadRequest when enquiryId is missing/invalid (undefined)', async () => {
      service.computeIsMarkRevisitByEnquiry = jest
        .fn()
        .mockRejectedValueOnce(
          new BadRequestException('Enquiry Id is required'),
        );

      await expect(
        controller.getIsMarkRevisitByEnquiry(undefined as unknown as number),
      ).rejects.toThrow(BadRequestException);

      expect(service.computeIsMarkRevisitByEnquiry).toHaveBeenCalledWith(
        undefined as unknown as number,
      );
    });

    it('failure → throws BadRequest when enquiryId is 0', async () => {
      service.computeIsMarkRevisitByEnquiry = jest
        .fn()
        .mockRejectedValueOnce(
          new BadRequestException('Enquiry Id is required'),
        );

      await expect(controller.getIsMarkRevisitByEnquiry(0)).rejects.toThrow(
        BadRequestException,
      );

      expect(service.computeIsMarkRevisitByEnquiry).toHaveBeenCalledWith(0);
    });

    it('failure → bubbles up generic errors from service', async () => {
      const enquiryId = 789;
      const err = new Error('DB error');
      service.computeIsMarkRevisitByEnquiry = jest
        .fn()
        .mockRejectedValueOnce(err);

      await expect(
        controller.getIsMarkRevisitByEnquiry(enquiryId),
      ).rejects.toThrow(err);
      expect(service.computeIsMarkRevisitByEnquiry).toHaveBeenCalledWith(
        enquiryId,
      );
    });
  });
});
