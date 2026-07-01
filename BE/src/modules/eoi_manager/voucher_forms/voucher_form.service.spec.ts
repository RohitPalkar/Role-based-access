import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';

import { VoucherFormsService } from './voucher_form.service';
import { VoucherForm } from './entities/voucher_form.entity';
import { VoucherUnitMapping } from './entities/voucher_unit_mappings.entity';
import { EoiCampaign } from '../eoi_campaign/entities/eoi_campaign.entity';
import { VoucherUnitBlocking } from '../../inventory-unit/entities/voucher_unit_blocking.entity';
import { Users } from 'src/entities';
import { PdfService } from '../../pdf/pdf.service';
import { AwsService } from '../../aws/aws.service';
import { BookingsService } from '../../bookings/bookings.service';
import { ApplicantDto } from './dto/update-voucher-form.dto';
import { VoucherFormStatusEnum } from 'src/enums/eoi-form.enums';

describe('VoucherFormsService - updateVoucherFormApplicant', () => {
  let service: VoucherFormsService;

  const voucherId = 'VID-12345678';

  const baseVoucherForm = {
    voucherId,
    applicant1: { contactDetails: {} },
    noOfApplicants: 1,
    voucherFormStatus: VoucherFormStatusEnum.IN_PROGRESS,
    userVoucherTrackingId: 'tracking-1',
  };

  const repositoryUpdate = jest.fn();

  const voucherFormRepositoryMock = {
    update: repositoryUpdate,
  };

  const cacheServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repositoryUpdate.mockResolvedValue({ affected: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherFormsService,
        {
          provide: getRepositoryToken(VoucherForm),
          useValue: voucherFormRepositoryMock,
        },
        { provide: getRepositoryToken(EoiCampaign), useValue: {} },
        { provide: getRepositoryToken(VoucherUnitMapping), useValue: {} },
        { provide: getRepositoryToken(VoucherUnitBlocking), useValue: {} },
        { provide: getRepositoryToken(Users), useValue: {} },
        { provide: CACHE_MANAGER, useValue: cacheServiceMock },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: PdfService, useValue: {} },
        { provide: AwsService, useValue: {} },
        { provide: BookingsService, useValue: {} },
      ],
    }).compile();

    service = module.get<VoucherFormsService>(VoucherFormsService);

    jest
      .spyOn(service, 'getVoucherFormByVoucherId')
      .mockResolvedValue({ data: { ...baseVoucherForm } });
  });

  it('omitted isApplicantsUpdated → single repository.update without flag fields', async () => {
    const refreshSpy = jest
      .spyOn(service, 'refreshCacheToken')
      .mockResolvedValue(undefined as any);

    const dto = { applicantNumber: 1, lastStep: 1 } as ApplicantDto;

    await service.updateVoucherFormApplicant(voucherId, dto);

    expect(repositoryUpdate).toHaveBeenCalledTimes(1);
    const [criteria, payload] = repositoryUpdate.mock.calls[0];
    expect(criteria).toEqual({ voucherId });
    expect(payload).not.toHaveProperty('isApplicantsUpdated');
    expect(payload).not.toHaveProperty('applicantsUpdatedAt');
    expect(payload.applicant1).toBeDefined();
    expect(payload.applicant1).not.toHaveProperty('isApplicantsUpdated');
    expect(refreshSpy).toHaveBeenCalledWith('tracking-1');
  });

  it('isApplicantsUpdated === false → single repository.update without flag fields', async () => {
    const dto = {
      applicantNumber: 1,
      lastStep: 1,
      isApplicantsUpdated: false,
    } as ApplicantDto;

    jest
      .spyOn(service, 'refreshCacheToken')
      .mockResolvedValue(undefined as any);

    await service.updateVoucherFormApplicant(voucherId, dto);

    expect(repositoryUpdate).toHaveBeenCalledTimes(1);
    const [, payload] = repositoryUpdate.mock.calls[0];
    expect(payload).not.toHaveProperty('isApplicantsUpdated');
    expect(payload).not.toHaveProperty('applicantsUpdatedAt');
    expect(payload.applicant1).not.toHaveProperty('isApplicantsUpdated');
  });

  it('isApplicantsUpdated === true → single repository.update merges the voucher flags', async () => {
    jest
      .spyOn(service, 'refreshCacheToken')
      .mockResolvedValue(undefined as any);

    const dto = {
      applicantNumber: 1,
      lastStep: 1,
      isApplicantsUpdated: true,
    } as ApplicantDto;

    await service.updateVoucherFormApplicant(voucherId, dto);

    expect(repositoryUpdate).toHaveBeenCalledTimes(1);
    const [criteria, payload] = repositoryUpdate.mock.calls[0];
    expect(criteria).toEqual({ voucherId });
    expect(payload.isApplicantsUpdated).toBe(true);
    expect(payload.applicantsUpdatedAt).toBeInstanceOf(Date);
    expect(payload.applicant1).toBeDefined();
    expect(payload.applicant1).not.toHaveProperty('isApplicantsUpdated');
  });

  it('repository.update failure propagates and skips refreshCacheToken', async () => {
    const refreshSpy = jest
      .spyOn(service, 'refreshCacheToken')
      .mockResolvedValue(undefined as any);

    repositoryUpdate.mockRejectedValueOnce(new Error('db boom'));

    const dto = {
      applicantNumber: 1,
      lastStep: 1,
      isApplicantsUpdated: true,
    } as ApplicantDto;

    await expect(
      service.updateVoucherFormApplicant(voucherId, dto),
    ).rejects.toThrow('db boom');

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
