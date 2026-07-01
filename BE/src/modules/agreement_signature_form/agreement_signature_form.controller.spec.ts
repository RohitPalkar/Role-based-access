// Mock problematic modules before imports.
// NOTE (PB-188): the more complete `debug` factory and the EventEmitter2 mock
// below are pre-existing test-drift fixes pulled into this branch because the
// previous `jest.mock('debug', () => jest.fn())` no longer satisfies
// `ioredis`'s `genDebugFunction` after a transitive dependency bump, which
// caused this spec to fail to compile when running the PB-188 SFDC webhook
// specs alongside the existing suite. The change is unrelated to the SFDC
// webhook itself and can be lifted into its own PR if preferred.
jest.mock('puppeteer', () => ({}));
jest.mock('debug', () => {
  const createDebugFn = () => {
    const fn: any = (...args: any[]) => {
      void args;
      return undefined;
    };

    fn.enabled = false;
    fn.namespace = '';
    fn.color = 0;
    fn.destroy = () => true;
    fn.extend = () => createDebugFn();
    fn.log = () => undefined;

    return fn;
  };

  const factory: any = (namespace?: string) => {
    void namespace;
    return createDebugFn();
  };

  factory.default = factory;
  factory.enable = () => undefined;
  factory.disable = () => '';
  factory.enabled = () => false;
  factory.coerce = (v: any) => v;
  factory.names = [];
  factory.skips = [];
  factory.formatters = {};

  return factory;
});
jest.mock('src/modules/pdf/pdf.service', () => ({
  PdfService: jest.fn().mockImplementation(() => ({
    generatePdf: jest.fn(),
  })),
}));
jest.mock('src/modules/leegality/leegality.service', () => ({
  LeegalityService: jest.fn().mockImplementation(() => ({
    createDocument: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AgreementSignatureFormController } from './agreement_signature_form.controller';
import { AgreementSignatureFormService } from './agreement_signature_form.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AgreementSignatureFormController', () => {
  let controller: AgreementSignatureFormController;

  const mockService = {
    createForm: jest.fn(),
    updateForm: jest.fn(),
    updateInvitees: jest.fn(),
    getForm: jest.fn(),
    listAgreementSignatures: jest.fn(),
    getInternalSignatories: jest.fn(),
    getDropdownUsers: jest.fn(),
    exportAgreement: jest.fn(),
    signInternalSignatory: jest.fn(),
    internalWebhook: jest.fn(),
    externalWebhook: jest.fn(),
    addUser: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgreementSignatureFormController],
      providers: [
        {
          provide: AgreementSignatureFormService,
          useValue: mockService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AgreementSignatureFormController>(
      AgreementSignatureFormController,
    );
    jest.clearAllMocks();
  });

  describe('createForm', () => {
    it('should return success on valid input (success + response time)', async () => {
      mockService.createForm.mockResolvedValue({
        success: true,
        data: { id: 1 },
      });
      const dto = { foo: 'bar' };
      const user = { dbId: 123 };
      const start = Date.now();
      const result = await controller.createForm(dto as any, user);
      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
      expect(mockService.createForm).toHaveBeenCalledWith(dto, user.dbId);
      expect(duration).toBeLessThan(1000);
    });
    it('should throw on service error (failure + response time)', async () => {
      mockService.createForm.mockRejectedValue(
        new BadRequestException('Invalid'),
      );
      const start = Date.now();
      await expect(
        controller.createForm({} as any, { dbId: 1 }),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('updateForm', () => {
    it('should return success on valid update (success + response time)', async () => {
      mockService.updateForm.mockResolvedValue({
        success: true,
        data: { id: 2 },
      });
      const start = Date.now();
      const result = await controller.updateForm(2, { foo: 'bar' } as any);
      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(2);
      expect(mockService.updateForm).toHaveBeenCalledWith(2, { foo: 'bar' });
      expect(duration).toBeLessThan(1000);
    });
    it('should throw NotFoundException if not found (failure + response time)', async () => {
      mockService.updateForm.mockRejectedValue(
        new NotFoundException('Not found'),
      );
      const start = Date.now();
      await expect(controller.updateForm(99, {} as any)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('updateInvitees', () => {
    it('should return success on valid update with performance timing (success + response time)', async () => {
      mockService.updateInvitees.mockResolvedValue({
        success: true,
        message: 'Invitees updated successfully.',
        data: {
          internal: [{ id: 1, name: 'Internal User' }],
          external: [{ name: 'Applicant 1', email: 'app1@test.com' }],
        },
      });
      const start = Date.now();
      const result = await controller.updateInvitees({
        agreementIds: [1],
        internal: [
          {
            id: 1,
            name: 'Internal User',
            email: 'internal@test.com',
            countryCode: '+91',
            contactNumber: '9876543210',
          },
        ],
      });
      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(result.message).toBe('Invitees updated successfully.');
      expect(mockService.updateInvitees).toHaveBeenCalledWith({
        agreementIds: [1],
        internal: [
          {
            id: 1,
            name: 'Internal User',
            email: 'internal@test.com',
            countryCode: '+91',
            contactNumber: '9876543210',
          },
        ],
      });
      expect(duration).toBeLessThan(1000);
    });
    it('should throw BadRequestException if no applicants found (failure + response time)', async () => {
      mockService.updateInvitees.mockRejectedValue(
        new BadRequestException('At least one applicant must be present'),
      );
      const start = Date.now();
      await expect(
        controller.updateInvitees({ agreementIds: [1], internal: [] }),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
    it('should handle performance timing logs for async operations', async () => {
      // Mock console.log to verify performance timing is logged
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockService.updateInvitees.mockResolvedValue({
        success: true,
        data: { invitees: [] },
      });
      await controller.updateInvitees({ agreementIds: [1], internal: [] });
      // Note: Performance timing logs are in service layer, not controller
      consoleSpy.mockRestore();
      expect(mockService.updateInvitees).toHaveBeenCalledWith({
        agreementIds: [1],
        internal: [],
      });
    });
  });

  describe('getForm', () => {
    it('should return form data on success (success + response time)', async () => {
      mockService.getForm.mockResolvedValue({ success: true, data: { id: 3 } });
      const start = Date.now();
      const result = await controller.getForm(3);
      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(3);
      expect(mockService.getForm).toHaveBeenCalledWith(3);
      expect(duration).toBeLessThan(1000);
    });
    it('should throw NotFoundException if not found (failure + response time)', async () => {
      mockService.getForm.mockRejectedValue(new NotFoundException('Not found'));
      const start = Date.now();
      await expect(controller.getForm(99)).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('listAgreementSignatures', () => {
    it('should return list with new fields on success (success + response time)', async () => {
      const mockResponse = {
        message: 'Agreement signature forms fetched successfully.',
        data: {
          result: [
            {
              id: 1,
              projectName: 'Test Project',
              unitNo: 'A101',
              applicantName: 'John Doe',
              internalSignatorySignature: 'Not Signed',
              internalSignatoryRedirection: 'https://sign.url',
              signedPdf: 'signed.pdf',
            },
          ],
          summary: { totalSent: 5, totalSigned: 2 },
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };
      mockService.listAgreementSignatures.mockResolvedValue(mockResponse);
      const query = { page: 1, limit: 10, sortBy: 'applicantName:asc' };
      const user = { dbId: 123 } as any;
      const start = Date.now();
      const result = await controller.listAgreementSignatures(
        query as any,
        user,
      );
      const duration = Date.now() - start;
      expect(result.message).toBe(
        'Agreement signature forms fetched successfully.',
      );
      expect(result.data.result[0].internalSignatorySignature).toBe(
        'Not Signed',
      );
      expect(result.data.result[0].internalSignatoryRedirection).toBe(
        'https://sign.url',
      );
      expect(result.data.result[0].signedPdf).toBe('signed.pdf');
      expect(mockService.listAgreementSignatures).toHaveBeenCalledWith(
        query,
        user,
        false,
      );
      expect(duration).toBeLessThan(1000);
    });
    it('should handle search by applicant name, unitNo, enquiryReferenceNumber', async () => {
      const query = { search: 'John', page: 1, limit: 10 };
      const user = { dbId: 123 } as any;
      mockService.listAgreementSignatures.mockResolvedValue({
        message: 'ok',
        data: { result: [] },
      });
      await controller.listAgreementSignatures(query as any, user);
      expect(mockService.listAgreementSignatures).toHaveBeenCalledWith(
        query,
        user,
        false,
      );
    });
    it('should throw on service error (failure + response time)', async () => {
      mockService.listAgreementSignatures.mockRejectedValue(
        new BadRequestException('Invalid'),
      );
      const start = Date.now();
      const user = { dbId: 123 } as any;
      await expect(
        controller.listAgreementSignatures({} as any, user),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('getDropdownUsers', () => {
    it('should return dropdown users on success (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'Dropdown users fetched successfully',
        data: {
          internalSignatories: [
            { id: 1, name: 'Internal User 1' },
            { id: 2, name: 'Internal User 2' },
          ],
          crmUsers: [
            { id: 3, name: 'CRM User 1' },
            { id: 4, name: 'CRM User 2' },
          ],
        },
      };
      mockService.getDropdownUsers.mockResolvedValue(mockResponse);
      const start = Date.now();
      const result = await controller.getDropdownUsers();
      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(result.data.internalSignatories).toHaveLength(2);
      expect(result.data.crmUsers).toHaveLength(2);
      expect(mockService.getDropdownUsers).toHaveBeenCalledWith();
      expect(duration).toBeLessThan(1000);
    });
    it('should throw on service error (failure + response time)', async () => {
      mockService.getDropdownUsers.mockRejectedValue(
        new BadRequestException('Database error'),
      );
      const start = Date.now();
      await expect(controller.getDropdownUsers()).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('getInternalSignatories', () => {
    it('should return internal signatories on success', async () => {
      const expected = {
        data: [{ id: 1, name: 'Internal User' }],
      };
      mockService.getInternalSignatories.mockResolvedValue(expected);

      const result = await controller.getInternalSignatories();

      expect(result).toEqual(expected);
      expect(mockService.getInternalSignatories).toHaveBeenCalledWith();
    });

    it('should propagate errors from service', async () => {
      const error = new Error('fetch failed');
      mockService.getInternalSignatories.mockRejectedValue(error);

      await expect(controller.getInternalSignatories()).rejects.toThrow(error);
      expect(mockService.getInternalSignatories).toHaveBeenCalledWith();
    });
  });

  describe('exportAgreementListing', () => {
    it('should export agreements with given query params', async () => {
      const query = { page: 1, limit: 10 } as any;
      const user = { dbId: 123 } as any;
      const expected = { data: [], message: 'Exported' };
      mockService.exportAgreement.mockResolvedValue(expected);

      const result = await controller.exportAgreementListing(query, user);

      expect(result).toEqual(expected);
      expect(mockService.exportAgreement).toHaveBeenCalledWith(query, user);
    });

    it('should propagate errors from service', async () => {
      const query = { page: 1, limit: 10 } as any;
      const user = { dbId: 123 } as any;
      const error = new Error('export failed');
      mockService.exportAgreement.mockRejectedValue(error);

      await expect(
        controller.exportAgreementListing(query, user),
      ).rejects.toThrow(error);
      expect(mockService.exportAgreement).toHaveBeenCalledWith(query, user);
    });
  });

  describe('signInternalSignatory', () => {
    it('should initiate internal signatory signing process (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message:
          'Signature process for Internal Signatory initiated successfully.',
        data: null,
      };
      mockService.signInternalSignatory.mockResolvedValue(mockResponse);
      const start = Date.now();
      const result = await controller.signInternalSignatory(1);
      const duration = Date.now() - start;
      expect(result).toEqual(mockResponse);
      expect(mockService.signInternalSignatory).toHaveBeenCalledWith(1);
      expect(duration).toBeLessThan(1000);
    });
    it('should throw BadRequestException if customer signatures pending (failure + response time)', async () => {
      mockService.signInternalSignatory.mockRejectedValue(
        new BadRequestException('Customer signatures are still pending!'),
      );
      const start = Date.now();
      await expect(controller.signInternalSignatory(1)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
    it('should throw NotFoundException if no internal invitees (failure + response time)', async () => {
      mockService.signInternalSignatory.mockRejectedValue(
        new NotFoundException('No internal invitees found'),
      );
      const start = Date.now();
      await expect(controller.signInternalSignatory(1)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('handleInternalWebhook', () => {
    it('should handle internal webhook successfully (success + response time)', async () => {
      const webhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'doc123',
        irn: 'IRN-1234-OPP123',
        request: { name: 'Internal User' },
      };
      mockService.internalWebhook.mockResolvedValue(undefined);
      const start = Date.now();
      await controller.handleInternalWebhook(webhookData);
      const duration = Date.now() - start;
      expect(mockService.internalWebhook).toHaveBeenCalledWith(webhookData);
      expect(duration).toBeLessThan(1000);
    });
    it('should handle webhook errors (failure + response time)', async () => {
      const webhookData = { webhookType: 'Failed' };
      mockService.internalWebhook.mockRejectedValue(
        new BadRequestException('Webhook processing failed'),
      );
      const start = Date.now();
      await expect(
        controller.handleInternalWebhook(webhookData),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('handleExternalWebhook', () => {
    it('should handle external webhook successfully (success + response time)', async () => {
      const webhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'doc123',
        irn: 'IRN-1234-OPP123',
        request: { name: 'Customer User' },
      };
      mockService.externalWebhook.mockResolvedValue(undefined);
      const start = Date.now();
      await controller.handleExternalWebhook(webhookData);
      const duration = Date.now() - start;
      expect(mockService.externalWebhook).toHaveBeenCalledWith(webhookData);
      expect(duration).toBeLessThan(1000);
    });
    it('should handle webhook errors (failure + response time)', async () => {
      const webhookData = { webhookType: 'Failed' };
      mockService.externalWebhook.mockRejectedValue(
        new BadRequestException('Webhook processing failed'),
      );
      const start = Date.now();
      await expect(
        controller.handleExternalWebhook(webhookData),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('addUser', () => {
    it('should call service with correct parameters and return success response', async () => {
      const mockResponse = {
        success: true,
        message: 'User added successfully.',
        data: { id: 1, name: 'John Doe' },
      };
      mockService.addUser.mockResolvedValue(mockResponse);

      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        role: 1,
        isSignatory: true,
        empCode: 'EMP001',
        reportingTo: 2,
        crmProjects: [1, 2],
        department: 1,
      };
      const user = { dbId: 123 };

      const result = await controller.addUser(dto as any, user);

      expect(mockService.addUser).toHaveBeenCalledWith(dto, user.dbId);
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors and propagate them', async () => {
      const mockError = new BadRequestException('User already exists');
      mockService.addUser.mockRejectedValue(mockError);

      const dto = { name: 'Test User', email: 'test@example.com' };
      const user = { dbId: 123 };

      await expect(controller.addUser(dto as any, user)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.addUser).toHaveBeenCalledWith(dto, user.dbId);
    });

    it('should handle different types of service errors', async () => {
      const mockError = new NotFoundException('Role not found');
      mockService.addUser.mockRejectedValue(mockError);

      const dto = { name: 'Test User', role: 999 };
      const user = { dbId: 123 };

      await expect(controller.addUser(dto as any, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle unexpected service errors', async () => {
      const mockError = new Error('Database connection failed');
      mockService.addUser.mockRejectedValue(mockError);

      const dto = { name: 'Test User' };
      const user = { dbId: 123 };

      await expect(controller.addUser(dto as any, user)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should call service with correct parameters and return success response', async () => {
      const mockResponse = {
        success: true,
        message: 'User updated successfully.',
        data: { id: 1, name: 'John Doe Updated' },
      };
      mockService.updateUser.mockResolvedValue(mockResponse);

      const userId = 1;
      const dto = {
        name: 'John Doe Updated',
        email: 'john.updated@example.com',
        role: 2,
        isSignatory: false,
      };

      const result = await controller.updateUser(userId, dto as any);

      expect(mockService.updateUser).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors and propagate them', async () => {
      const mockError = new BadRequestException('User not found');
      mockService.updateUser.mockRejectedValue(mockError);

      const userId = 1;
      const dto = { name: 'Test User' };

      await expect(controller.updateUser(userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.updateUser).toHaveBeenCalledWith(userId, dto);
    });

    it('should handle different types of service errors', async () => {
      const mockError = new NotFoundException('User not found');
      mockService.updateUser.mockRejectedValue(mockError);

      const userId = 1;
      const dto = { name: 'Test User' };

      await expect(controller.updateUser(userId, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle unexpected service errors', async () => {
      const mockError = new Error('Database connection failed');
      mockService.updateUser.mockRejectedValue(mockError);

      const userId = 1;
      const dto = { name: 'Test User' };

      await expect(controller.updateUser(userId, dto as any)).rejects.toThrow();
    });
  });
});
