import { Test, TestingModule } from '@nestjs/testing';
import { BookingDocumentsController } from './booking_documents.controller';
import { BookingDocumentsService } from './booking_documents.service';
import { BookingDocumentsDto } from './dto/booking_documents.dto';
import { BookingStageEnum } from '../../enums/booking-documents.enum';
import { CanActivate } from '@nestjs/common';

// import the real guards used in the controller
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { OppAccessGuard } from '../sso/gaurds/opp-access.gaurd';
import { TEST_EXECUTION_TIME } from 'src/config/constants';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';

// 🔹 Mock Guards
class MockRmAdminAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}
class MockOppAccessGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

const mockInterceptor = {
  intercept: jest.fn((context, next) => next.handle()),
};

describe('BookingDocumentsController', () => {
  let controller: BookingDocumentsController;
  let service: BookingDocumentsService;
  const mockUser = {
    dbId: 123,
    name: 'Test User',
    email: 'test@example.com',
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingDocumentsController],
      providers: [
        {
          provide: BookingDocumentsService,
          useValue: {
            createDocument: jest.fn(),
            deleteDocument: jest.fn(),
            getDocuments: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
        {
          provide: APP_INTERCEPTOR,
          useValue: mockInterceptor,
        },
      ],
    })
      // override the REAL guards, so NestJS never tries to inject CACHE_MANAGER
      .overrideGuard(RmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(OppAccessGuard)
      .useValue(new MockOppAccessGuard())
      .compile();

    controller = module.get<BookingDocumentsController>(
      BookingDocumentsController,
    );
    service = module.get<BookingDocumentsService>(BookingDocumentsService);
  });

  describe('createDocument', () => {
    it('should create document within TEST_EXECUTION_TIME', async () => {
      const dto: BookingDocumentsDto = {
        opportunityId: 'OPP-001',
        name: 'Agreement',
        path: '/docs/agreement.pdf',
        type: 'pdf',
        isOtherDoc: false,
        stage: BookingStageEnum.PRE_BOOKING,
        voucherId: 1,
      };

      const mockResult = { id: 1, ...dto };
      (service.createDocument as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.createDocument(dto, mockUser);
      const duration = Date.now() - start;

      expect(service.createDocument).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error within TEST_EXECUTION_TIME', async () => {
      const dto: BookingDocumentsDto = {
        opportunityId: 'OPP-001',
        name: 'Agreement',
        path: '/docs/agreement.pdf',
        type: 'pdf',
        isOtherDoc: false,
        stage: BookingStageEnum.PRE_BOOKING,
        voucherId: 1,
      };

      (service.createDocument as jest.Mock).mockRejectedValue(
        new Error('DB Error'),
      );

      const start = Date.now();
      await expect(controller.createDocument(dto, mockUser)).rejects.toThrow(
        'DB Error',
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document within TEST_EXECUTION_TIME', async () => {
      const documentId = 123;
      const mockResult = { success: true };

      (service.deleteDocument as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.deleteDocument(documentId);
      const duration = Date.now() - start;

      expect(service.deleteDocument).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getDocuments', () => {
    it('should return documents within TEST_EXECUTION_TIME', async () => {
      const oppId = 'OPP-001';
      const type = 'pdf';
      const stage = 'PRE_BOOKING';
      const mockResult = [{ id: 1, name: 'Doc 1' }];

      (service.getDocuments as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.getDocuments(oppId, type, stage);
      const duration = Date.now() - start;

      expect(service.getDocuments).toHaveBeenCalledWith(oppId, type, stage);
      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('bookingDocuments', () => {
    it('should return pre-booking documents within TEST_EXECUTION_TIME', async () => {
      const oppId = 'OPP-002';
      const mockResult = [{ id: 2, name: 'Pre-booking doc' }];

      (service.getDocuments as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.bookingDocuments(oppId);
      const duration = Date.now() - start;

      expect(service.getDocuments).toHaveBeenCalledWith(
        oppId,
        BookingStageEnum.PRE_BOOKING,
        BookingStageEnum.PRE_BOOKING,
      );
      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
