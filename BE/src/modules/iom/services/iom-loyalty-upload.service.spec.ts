import { HttpException } from '@nestjs/common';

import { Iom } from '../entities/iom.entity';
import { LoyaltyPointsReleaseTypeEnum } from '../enums/iom.enums';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { LoyaltyPointsUploadActionEnum } from '../dto/upload-loyalty-points.dto';
import { RolesEnum } from 'src/enums/roles.enum';
import { PineLabsApiName } from 'src/modules/pine-labs/enums/pine-labs-api-name.enum';
import { IomLoyaltyUploadService } from './iom-loyalty-upload.service';
import { AuthenticatedUser } from './iom-validation.service';

const LOYALTY_USER: AuthenticatedUser = {
  dbId: 5,
  email: 'loyalty@example.test',
  role: RolesEnum.LOYALTY,
  crmProjects: [10],
};

const baseIom = (overrides: Partial<Iom> = {}): Iom =>
  ({
    id: 1,
    iomNo: 'IOM_20240611_1',
    projectId: 10,
    customerMobile: '9876543210',
    referrerMobile: '9123456780',
    referrerDetails: { name: 'Referrer' },
    refereePoints: 5000,
    referrerPoints: 3000,
    refereePinelabCustomerId: null,
    referrerPinelabCustomerId: null,
    loyaltyPointClassification: null,
    project: { id: 10, name: 'Referee Project', brandId: 1 } as Iom['project'],
    booking: null,
    ...overrides,
  }) as Iom;

describe('IomLoyaltyUploadService', () => {
  let service: IomLoyaltyUploadService;
  let iomRepo: {
    createQueryBuilder: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let validator: { assertProjectAccess: jest.Mock };
  let pineLabsExecutor: { execute: jest.Mock };
  let pinelabCustomerService: {
    findByBrandAndMobile: jest.Mock;
    upsertCustomerId: jest.Mock;
  };
  let transactionalUpdate: jest.Mock;

  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(() => {
    queryBuilder.leftJoinAndSelect.mockReturnThis();
    queryBuilder.where.mockReturnThis();
    queryBuilder.andWhere.mockReturnThis();

    transactionalUpdate = jest.fn().mockResolvedValue(undefined);
    dataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          getRepository: () => ({ update: transactionalUpdate }),
        }),
      ),
    };
    iomRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    validator = { assertProjectAccess: jest.fn().mockResolvedValue(undefined) };
    pineLabsExecutor = {
      execute: jest.fn().mockImplementation((api) => {
        if (api === PineLabsApiName.CUSTOMER_FETCH) {
          return Promise.resolve({
            success: true,
            data: { customer: { customerId: 'FETCHED-ID' } },
          });
        }
        return Promise.resolve({ success: true, data: {} });
      }),
    };
    pinelabCustomerService = {
      findByBrandAndMobile: jest.fn().mockResolvedValue(null),
      upsertCustomerId: jest.fn().mockResolvedValue(undefined),
    };

    service = new IomLoyaltyUploadService(
      iomRepo as never,
      dataSource as never,
      validator as never,
      pineLabsExecutor as never,
      pinelabCustomerService as never,
    );
  });

  afterEach(() => jest.clearAllMocks());

  const uploadDto = (action: LoyaltyPointsUploadActionEnum) => ({
    loyaltyPointsReleaseType: action,
  });

  it('throws IOM_NOT_FOUND when IOM is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        99,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.IOM_NOT_FOUND },
    });
  });

  it('throws UNAUTHORIZED_PROJECT_ACCESS when project access fails', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    validator.assertProjectAccess.mockRejectedValue(
      new HttpException(
        { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
        403,
      ),
    );

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
    });
  });

  it('resolves IDs from pinelab_customers and fetch, not IOM columns', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'REF-PINE-1' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'REFR-PINE-1' });

    await service.uploadLoyaltyPoints(
      LOYALTY_USER,
      1,
      uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
    );

    expect(pineLabsExecutor.execute).not.toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      expect.anything(),
    );
    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.MARK_ELIGIBLE,
      { customerId: 'REF-PINE-1' },
    );
    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.MARK_ELIGIBLE,
      { customerId: 'REFR-PINE-1' },
    );
  });

  it('fetches and upserts when pinelab_customers row is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile.mockResolvedValue(null);

    await service.uploadLoyaltyPoints(
      LOYALTY_USER,
      1,
      uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
    );

    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      { mobileNumber: '9876543210' },
    );
    expect(pinelabCustomerService.upsertCustomerId).toHaveBeenCalledWith(
      1,
      '9876543210',
      'FETCHED-ID',
    );
  });

  it('ELIGIBLE success calls markEligible for both participants and updates IOM', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'REF-PINE-1' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'REFR-PINE-1' });

    const result = await service.uploadLoyaltyPoints(
      LOYALTY_USER,
      1,
      uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
    );

    expect(pineLabsExecutor.execute).toHaveBeenCalledTimes(2);
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(transactionalUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.ELIGIBLE },
    );
    expect(result).toMatchObject({
      iomId: '1',
      loyaltyPointsReleaseType: 'ELIGIBLE',
      loyaltyPointsReleaseStatus: 'ELIGIBLE',
    });
  });

  it('REDEEMABLE success calls redeemPoints for both and returns REDEEMED status', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.ELIGIBLE,
      }),
    );
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'REF-PINE-1' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'REFR-PINE-1' });

    const result = await service.uploadLoyaltyPoints(
      LOYALTY_USER,
      1,
      uploadDto(LoyaltyPointsUploadActionEnum.REDEEMABLE),
    );

    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.REDEEM_POINTS,
      {
        customerId: 'REF-PINE-1',
        points: 5000,
        referenceId: 'IOM_20240611_1',
      },
    );
    expect(transactionalUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.REDEEMABLE },
    );
    expect(result.loyaltyPointsReleaseStatus).toBe('REDEEMED');
  });

  it('rejects duplicate ELIGIBLE when state is ELIGIBLE', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.ELIGIBLE,
      }),
    );

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION },
    });
    expect(pineLabsExecutor.execute).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate ELIGIBLE when state is REDEEMABLE', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.REDEEMABLE,
      }),
    );

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION },
    });
    expect(pineLabsExecutor.execute).not.toHaveBeenCalled();
  });

  it('rejects duplicate REDEEMABLE when state is REDEEMABLE', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        loyaltyPointClassification: LoyaltyPointsReleaseTypeEnum.REDEEMABLE,
      }),
    );

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.REDEEMABLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION },
    });
    expect(pineLabsExecutor.execute).not.toHaveBeenCalled();
  });

  it('rejects when referee Pinelab call fails without DB update', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'REF-PINE-1' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'REFR-PINE-1' });
    pineLabsExecutor.execute.mockResolvedValueOnce({
      success: false,
      error: { message: 'vendor error' },
    });

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: 'PINELAB_UPLOAD_FAILED' },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects when referee succeeds but referrer fails without DB update', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'REF-PINE-1' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'REFR-PINE-1' });
    pineLabsExecutor.execute
      .mockResolvedValueOnce({ success: true, data: {} })
      .mockResolvedValueOnce({
        success: false,
        error: { message: 'referrer failed' },
      });

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: 'PINELAB_UPLOAD_FAILED' },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects when referrer is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({ referrerMobile: null, referrerDetails: null }),
    );

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING },
    });
  });

  it('rejects when Pinelab customer ID cannot be resolved', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile.mockResolvedValue(null);
    pineLabsExecutor.execute.mockImplementation((api) => {
      if (api === PineLabsApiName.CUSTOMER_FETCH) {
        return Promise.resolve({
          success: false,
          error: { statusCode: 404, message: 'Customer not found' },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    await expect(
      service.uploadLoyaltyPoints(
        LOYALTY_USER,
        1,
        uploadDto(LoyaltyPointsUploadActionEnum.ELIGIBLE),
      ),
    ).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING },
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
