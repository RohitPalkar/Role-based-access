import { HttpException } from '@nestjs/common';

import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { RolesEnum } from 'src/enums/roles.enum';
import { PineLabsApiName } from 'src/modules/pine-labs/enums/pine-labs-api-name.enum';
import { EMPTY_LOYALTY_ADDRESS } from '../types/loyalty-details.interface';
import { IomLoyaltyDetailsService } from './iom-loyalty-details.service';
import { AuthenticatedUser } from './iom-validation.service';

const CRM_USER: AuthenticatedUser = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10],
};

const baseIom = (overrides: Partial<Iom> = {}): Iom =>
  ({
    id: 1,
    projectId: 10,
    customerMobile: '9876543210',
    customerDetails: {
      name: 'Referee Name',
      address: '123 Main St',
      city: 'Bengaluru',
      unitNo: 'A-101',
    },
    referrerMobile: '9123456780',
    referrerDetails: {
      name: 'Referrer Name',
      address: '456 Oak Ave',
      projectId: '10',
      unitNo: 'B-202',
    },
    salePrice: 10_000_000,
    brokeragePercentage: 2.5,
    totalBrokerageAmount: 250_000,
    referralPointsAdjustment: 100,
    refereePoints: 5000,
    referrerPoints: 5000,
    referrerRatio: 1,
    refereeRatio: 1,
    refereePinelabCustomerId: null,
    referrerPinelabCustomerId: null,
    project: { id: 10, name: 'Referee Project', brandId: 1 } as Iom['project'],
    booking: { customerName: 'Referee Name' } as Iom['booking'],
    unitNumber: 'A-101',
    ...overrides,
  }) as Iom;

const matchedCustomerResponse = {
  success: true,
  data: {
    customer: {
      customerId: 'PINE-REF-1',
      name: 'Referee Name',
      mobileNumber: '9876543210',
      address: '123 Main St, Bengaluru',
    },
  },
};

const notFoundResponse = {
  success: false,
  error: { statusCode: 404, message: 'Customer not found' },
};

describe('IomLoyaltyDetailsService', () => {
  let service: IomLoyaltyDetailsService;
  let iomRepo: {
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
  };
  let projectsRepo: { findOne: jest.Mock };
  let validator: { assertProjectAccess: jest.Mock };
  let pineLabsExecutor: { execute: jest.Mock };
  let pinelabCustomerService: {
    findByBrandAndMobile: jest.Mock;
    upsertCustomerId: jest.Mock;
  };

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

    iomRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn().mockResolvedValue(undefined),
    };
    projectsRepo = {
      findOne: jest.fn().mockResolvedValue({ name: 'Referrer Project' }),
    };
    validator = { assertProjectAccess: jest.fn().mockResolvedValue(undefined) };
    pineLabsExecutor = {
      execute: jest.fn().mockResolvedValue(matchedCustomerResponse),
    };
    pinelabCustomerService = {
      findByBrandAndMobile: jest.fn().mockResolvedValue(null),
      upsertCustomerId: jest.fn().mockResolvedValue(undefined),
    };

    service = new IomLoyaltyDetailsService(
      iomRepo as never,
      projectsRepo as never,
      validator as never,
      pineLabsExecutor as never,
      pinelabCustomerService as never,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('throws IOM_NOT_FOUND when IOM is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(service.getLoyaltyDetails(CRM_USER, 99)).rejects.toMatchObject(
      {
        response: { code: IomErrorCodeEnum.IOM_NOT_FOUND },
      },
    );
  });

  it('throws UNAUTHORIZED_PROJECT_ACCESS when project access fails', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    validator.assertProjectAccess.mockRejectedValue(
      new HttpException(
        { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
        403,
      ),
    );

    await expect(service.getLoyaltyDetails(CRM_USER, 1)).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS },
    });
  });

  it('throws MANDATORY_FIELDS_MISSING when brand is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        project: { id: 10, name: 'Referee Project' } as Iom['project'],
      }),
    );

    await expect(service.getLoyaltyDetails(CRM_USER, 1)).rejects.toMatchObject({
      response: { code: IomErrorCodeEnum.MANDATORY_FIELDS_MISSING },
    });
  });

  it('calls CUSTOMER_FETCH for referee and referrer', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());

    await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pineLabsExecutor.execute).toHaveBeenCalledTimes(2);
    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      { mobileNumber: '9876543210' },
    );
    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      { mobileNumber: '9123456780' },
    );
  });

  it('uses stored pinelab_customers ID in fetch when present', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'STORED-REF' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'STORED-REFR' });

    await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      { customerId: 'STORED-REF' },
    );
    expect(pineLabsExecutor.execute).toHaveBeenCalledWith(
      PineLabsApiName.CUSTOMER_FETCH,
      { customerId: 'STORED-REFR' },
    );
  });

  it('upserts pinelab_customers when fetch returns ID', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());

    await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pinelabCustomerService.upsertCustomerId).toHaveBeenCalledWith(
      1,
      '9876543210',
      'PINE-REF-1',
    );
    expect(pinelabCustomerService.upsertCustomerId).toHaveBeenCalledWith(
      1,
      '9123456780',
      'PINE-REF-1',
    );
  });

  it('does not upsert when fetch returns no ID', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pineLabsExecutor.execute.mockResolvedValue({
      success: true,
      data: { customer: { name: 'Referee Name' } },
    });

    await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pinelabCustomerService.upsertCustomerId).not.toHaveBeenCalled();
  });

  it('sets shouldCreatePinelabProfile on not-found without upsert', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pineLabsExecutor.execute.mockResolvedValue(notFoundResponse);

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.shouldCreatePinelabProfile).toBe(true);
    expect(result.refereeDetails.pinelabCustomerId).toBeNull();
    expect(pinelabCustomerService.upsertCustomerId).not.toHaveBeenCalled();
  });

  it('resolveDisplayedPinelabCustomerId uses DB ID, not IOM columns', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        refereePinelabCustomerId: 'IOM-COLUMN-ID',
        referrerPinelabCustomerId: 'IOM-COLUMN-REF',
      }),
    );
    pinelabCustomerService.findByBrandAndMobile
      .mockResolvedValueOnce({ pinelabCustomerId: 'DB-REF' })
      .mockResolvedValueOnce({ pinelabCustomerId: 'DB-REFR' });
    pineLabsExecutor.execute.mockResolvedValue({
      success: true,
      data: {
        customer: {
          customerId: 'PINE-REF-1',
          name: 'Mismatch',
          mobileNumber: '0000000000',
        },
      },
    });

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.pinelabCustomerId).toBe('PINE-REF-1');
    expect(result.referrerDetails.pinelabCustomerId).toBe('PINE-REF-1');
  });

  it('throws PINELAB_INTEGRATION_ERROR on integration failure', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pineLabsExecutor.execute.mockResolvedValue({
      success: false,
      error: { statusCode: 502, message: 'upstream error' },
      correlationId: 'corr-1',
    });

    await expect(service.getLoyaltyDetails(CRM_USER, 1)).rejects.toMatchObject({
      response: { code: 'PINELAB_INTEGRATION_ERROR' },
      status: 502,
    });
  });

  it('does not write Pinelab IDs to iomRepo.update', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());

    await service.getLoyaltyDetails(CRM_USER, 1);

    expect(iomRepo.update).not.toHaveBeenCalled();
  });

  it('returns full response shape with payment breakdown', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.customerName).toBe('Referee Name');
    expect(result.refereeDetails.projectName).toBe('Referee Project');
    expect(result.referrerDetails.projectName).toBe('Referrer Project');
    expect(result.paymentDetails).toEqual({
      saleValue: 10_000_000,
      brokeragePercentage: 2.5,
      brokerageAmount: 250_000,
      loyaltyPointsAdjustment: 100,
      pointsForReferee: 5000,
      pointsForReferrer: 5000,
      refereePayoutAmount: 125_000,
      referrerPayoutAmount: 125_000,
    });
  });

  it('returns graceful empty referrer block when referrer is missing', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({ referrerMobile: null, referrerDetails: null }),
    );

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pineLabsExecutor.execute).toHaveBeenCalledTimes(1);
    expect(result.referrerDetails).toEqual({
      customerName: null,
      mobileNumber: null,
      projectName: null,
      unitNumber: null,
      pinelabCustomerId: null,
      isProfileDataMatching: false,
      shouldCreatePinelabProfile: false,
      firstName: null,
      lastName: null,
      sfdcId: null,
      gender: null,
      email: null,
      address: { ...EMPTY_LOYALTY_ADDRESS },
      projectName2: null,
      unitNo2: null,
    });
  });

  it('maps extended referee and referrer fields from fixture JSON', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        customerDetails: {
          name: 'Referee Name',
          firstName: 'Ref',
          lastName: 'Eree',
          sfdcId: 'SF-REF',
          gender: 'M',
          email: 'ref@example.com',
          addressLine1: '123 Main St',
          addressLine2: 'Apt 4',
          pincode: '560001',
          city: 'Bengaluru',
          state: 'KA',
          unitNo: 'A-101',
        },
        referrerDetails: {
          name: 'Referrer Name',
          first_name: 'Ref',
          last_name: 'Errer',
          bp_code: 'BP-REF',
          gender: 'F',
          email_id: 'refrr@example.com',
          address: '456 Oak Ave',
          projectId: '10',
          unitNo: 'B-202',
        },
        bpCode: 'BP-FALLBACK',
      }),
    );

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails).toMatchObject({
      firstName: 'Ref',
      lastName: 'Eree',
      sfdcId: 'SF-REF',
      gender: 'M',
      email: 'ref@example.com',
      address: {
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        pincode: '560001',
        location: 'Bengaluru, KA',
      },
      projectName2: 'Referrer Project',
      unitNo2: 'B-202',
    });
    expect(result.referrerDetails).toMatchObject({
      firstName: 'Ref',
      lastName: 'Errer',
      sfdcId: 'BP-REF',
      gender: 'F',
      email: 'refrr@example.com',
      projectName2: 'Referee Project',
      unitNo2: 'A-101',
    });
  });

  it('returns null extended fields when source keys are absent', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        customerDetails: { name: 'Referee Name' },
        referrerDetails: { name: 'Referrer Name', projectId: '10' },
      }),
    );

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.firstName).toBeNull();
    expect(result.refereeDetails.sfdcId).toBeNull();
    expect(result.refereeDetails.address).toEqual({ ...EMPTY_LOYALTY_ADDRESS });
  });

  it('returns pinelabCustomerId null when shouldCreatePinelabProfile is true', async () => {
    queryBuilder.getOne.mockResolvedValue(baseIom());
    pinelabCustomerService.findByBrandAndMobile.mockResolvedValue({
      pinelabCustomerId: 'STORED-1',
    });
    pineLabsExecutor.execute.mockResolvedValue(notFoundResponse);

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.pinelabCustomerId).toBeNull();
  });

  it('falls back to booking.propertyNumber for referee unitNumber', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        unitNumber: null,
        booking: { propertyNumber: 'UNIT-FROM-BOOKING' } as Iom['booking'],
        customerDetails: { name: 'Referee Name', address: '123 Main St' },
      }),
    );

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(result.refereeDetails.unitNumber).toBe('UNIT-FROM-BOOKING');
  });

  it('skips verification when participant has no mobile or stored Pinelab ID', async () => {
    queryBuilder.getOne.mockResolvedValue(
      baseIom({
        customerMobile: null,
        refereePinelabCustomerId: null,
        referrerMobile: null,
        referrerDetails: null,
      }),
    );

    const result = await service.getLoyaltyDetails(CRM_USER, 1);

    expect(pineLabsExecutor.execute).not.toHaveBeenCalled();
    expect(result.refereeDetails).toMatchObject({
      isProfileDataMatching: false,
      shouldCreatePinelabProfile: false,
    });
  });
});
