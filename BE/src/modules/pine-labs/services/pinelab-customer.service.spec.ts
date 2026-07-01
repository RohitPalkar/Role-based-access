import { PinelabCustomer } from '../entities/pinelab-customer.entity';
import { PinelabCustomerService } from './pinelab-customer.service';

describe('PinelabCustomerService', () => {
  let service: PinelabCustomerService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    service = new PinelabCustomerService(repo as never);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByBrandAndMobile normalizes mobile before query', async () => {
    repo.findOne.mockResolvedValue({ id: 1, pinelabCustomerId: 'P-1' });

    await service.findByBrandAndMobile(1, '+91 98765-43210');

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { brandId: 1, mobileNo: '919876543210' },
    });
  });

  it('findByBrandAndMobile returns null for empty mobile', async () => {
    const result = await service.findByBrandAndMobile(1, '   ');

    expect(result).toBeNull();
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('upsertCustomerId inserts new row', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.upsertCustomerId(1, '9876543210', 'P-NEW');

    expect(repo.save).toHaveBeenCalledWith({
      brandId: 1,
      mobileNo: '9876543210',
      pinelabCustomerId: 'P-NEW',
    });
  });

  it('upsertCustomerId updates existing row when ID changes', async () => {
    const existing = {
      id: 5,
      brandId: 1,
      mobileNo: '9876543210',
      pinelabCustomerId: 'P-OLD',
    } as PinelabCustomer;
    repo.findOne.mockResolvedValue(existing);

    await service.upsertCustomerId(1, '9876543210', 'P-NEW');

    expect(repo.save).toHaveBeenCalledWith({
      ...existing,
      pinelabCustomerId: 'P-NEW',
    });
  });

  it('upsertCustomerId skips save when existing ID is unchanged', async () => {
    repo.findOne.mockResolvedValue({
      id: 5,
      brandId: 1,
      mobileNo: '9876543210',
      pinelabCustomerId: 'P-SAME',
    });

    await service.upsertCustomerId(1, '9876543210', 'P-SAME');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('upsertCustomerId is a no-op when Pinelab ID is null or empty', async () => {
    await service.upsertCustomerId(1, '9876543210', null);
    await service.upsertCustomerId(1, '9876543210', '  ');

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
