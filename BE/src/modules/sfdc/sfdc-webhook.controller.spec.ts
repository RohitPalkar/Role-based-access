import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

import { BookingStageWebhookDto } from './dto/booking-stage-webhook.dto';
import { LeadChangeWebhookDto } from './dto/lead-change-webhook.dto';
import { SfdcWebhookSignatureGuard } from './guards/sfdc-webhook-signature.guard';
import { SfdcWebhookController } from './sfdc-webhook.controller';
import { SfdcWebhookService } from './sfdc-webhook.service';
import { SfdcVoucherChangeRequestStatus } from './entities/sfdc-voucher-change-request.entity';
import { ACCEPTED } from 'src/config/constants';

describe('SfdcWebhookController', () => {
  let controller: SfdcWebhookController;
  let service: {
    applyLeadChange: jest.Mock;
    processBookingStageWebhook: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      applyLeadChange: jest.fn(),
      processBookingStageWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SfdcWebhookController],
      providers: [{ provide: SfdcWebhookService, useValue: service }],
    })
      .overrideGuard(SfdcWebhookSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SfdcWebhookController>(SfdcWebhookController);
  });

  afterEach(() => jest.clearAllMocks());

  const buildRequest = (
    headers: Record<string, string | string[]> = {},
    body: Record<string, unknown> = {},
  ): Request =>
    ({
      headers,
      body,
    }) as unknown as Request;

  const successPayload = (overrides: Record<string, unknown> = {}) => ({
    statusCode: ACCEPTED,
    message: 'SFDC change request queued for admin review.',
    data: {
      requestId: 'cr-uuid-1',
      prid: 'PRID-001',
      voucherId: 42,
      status: SfdcVoucherChangeRequestStatus.PENDING,
      changedFields: ['leadStatus'],
      duplicate: false,
      ...overrides,
    },
  });

  it('delegates to the service with the correlation id and raw body, returning the 202 envelope', async () => {
    const dto: LeadChangeWebhookDto = { prid: 'PRID-001', leadStatus: 'Hot' };
    const expected = successPayload();
    service.applyLeadChange.mockResolvedValue(expected);

    const rawBody = { PRID: 'PRID-001', 'Lead Status': 'Hot' };
    const result = await controller.applyLeadChange(
      dto,
      buildRequest({ 'x-request-id': 'req-1' }, rawBody),
    );

    expect(result).toEqual(expected);
    expect(service.applyLeadChange).toHaveBeenCalledWith(dto, {
      correlationId: 'req-1',
      rawPayload: rawBody,
    });
  });

  it('passes undefined correlationId when the x-request-id header is absent', async () => {
    const dto: LeadChangeWebhookDto = { prid: 'PRID-001' };
    service.applyLeadChange.mockResolvedValue(successPayload());

    await controller.applyLeadChange(dto, buildRequest());

    expect(service.applyLeadChange).toHaveBeenCalledWith(dto, {
      correlationId: undefined,
      rawPayload: {},
    });
  });

  it('uses the first value when x-request-id is sent as an array', async () => {
    const dto: LeadChangeWebhookDto = { prid: 'PRID-001' };
    service.applyLeadChange.mockResolvedValue(successPayload());

    await controller.applyLeadChange(
      dto,
      buildRequest({ 'x-request-id': ['req-A', 'req-B'] }),
    );

    expect(service.applyLeadChange).toHaveBeenCalledWith(dto, {
      correlationId: 'req-A',
      rawPayload: {},
    });
  });

  it('propagates NotFoundException raised by the service (404 path)', async () => {
    service.applyLeadChange.mockRejectedValue(
      new NotFoundException('No voucher found for the given PRID'),
    );

    const dto: LeadChangeWebhookDto = { prid: 'PRID-MISSING' };
    await expect(
      controller.applyLeadChange(dto, buildRequest()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('POST booking-stage', () => {
    const bookingStageSuccess = () => ({
      statusCode: ACCEPTED,
      message: 'Booking stage webhook accepted.',
      data: {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      },
    });

    it('delegates to processBookingStageWebhook with correlation id and raw body, returning the 202 envelope', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      const expected = bookingStageSuccess();
      service.processBookingStageWebhook.mockResolvedValue(expected);

      const rawBody = {
        'Opportunity ID': '006XXXXXXXXXXXX',
        'Booking Stage': 'BOOKED',
      };
      const result = await controller.applyBookingStage(
        dto,
        buildRequest({ 'x-request-id': 'req-bs-1' }, rawBody),
      );

      expect(result).toEqual(expected);
      expect(service.processBookingStageWebhook).toHaveBeenCalledTimes(1);
      expect(service.processBookingStageWebhook).toHaveBeenCalledWith(dto, {
        correlationId: 'req-bs-1',
        rawPayload: rawBody,
      });
    });

    it('passes undefined correlationId when the x-request-id header is absent', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      service.processBookingStageWebhook.mockResolvedValue(
        bookingStageSuccess(),
      );

      await controller.applyBookingStage(dto, buildRequest());

      expect(service.processBookingStageWebhook).toHaveBeenCalledWith(dto, {
        correlationId: undefined,
        rawPayload: {},
      });
    });

    it('uses the first value when x-request-id is sent as an array', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      service.processBookingStageWebhook.mockResolvedValue(
        bookingStageSuccess(),
      );

      await controller.applyBookingStage(
        dto,
        buildRequest({ 'x-request-id': ['req-bs-A', 'req-bs-B'] }),
      );

      expect(service.processBookingStageWebhook).toHaveBeenCalledWith(dto, {
        correlationId: 'req-bs-A',
        rawPayload: {},
      });
    });

    it('does not invoke the lead-change handler when booking-stage is hit', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      service.processBookingStageWebhook.mockResolvedValue(
        bookingStageSuccess(),
      );

      await controller.applyBookingStage(dto, buildRequest());

      expect(service.applyLeadChange).not.toHaveBeenCalled();
    });

    it('returns the service envelope verbatim so the route responds with statusCode ACCEPTED', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      const expected = bookingStageSuccess();
      service.processBookingStageWebhook.mockResolvedValue(expected);

      const result = await controller.applyBookingStage(dto, buildRequest());

      expect(result.statusCode).toBe(ACCEPTED);
      expect(result).toEqual(expected);
    });

    it('defaults rawPayload to {} when req.body is undefined', async () => {
      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };
      service.processBookingStageWebhook.mockResolvedValue(
        bookingStageSuccess(),
      );

      const req = { headers: {}, body: undefined } as unknown as Request;
      await controller.applyBookingStage(dto, req);

      expect(service.processBookingStageWebhook).toHaveBeenCalledWith(dto, {
        correlationId: undefined,
        rawPayload: {},
      });
    });

    it('propagates HttpException raised by the service', async () => {
      service.processBookingStageWebhook.mockRejectedValue(
        new BadRequestException('bad'),
      );

      const dto: BookingStageWebhookDto = {
        opportunityId: '006XXXXXXXXXXXX',
        bookingStage: 'BOOKED',
      };

      await expect(
        controller.applyBookingStage(dto, buildRequest()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
