import { Test, TestingModule } from '@nestjs/testing';
import { CompanyMasterController } from './company_master.controller';
import { CompanyMasterService } from './company_master.service';

class MockCompanyMasterService {
  getAllCompanies = jest.fn();
}

describe('CompanyMasterController.getAllCompanies', () => {
  let controller: CompanyMasterController;
  let service: MockCompanyMasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyMasterController],
      providers: [
        { provide: CompanyMasterService, useClass: MockCompanyMasterService },
      ],
    }).compile();

    controller = module.get(CompanyMasterController);
    service = module.get(CompanyMasterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all active companies when no search is provided', async () => {
    const mockResult = {
      statusCode: 200,
      message: 'Companies fetched',
      data: [
        { id: 1, name: 'Acme Corp' },
        { id: 2, name: 'Globex Ltd' },
      ],
    };
    service.getAllCompanies.mockResolvedValueOnce(mockResult);

    const result = await controller.getAllCompanies();

    expect(result).toEqual(mockResult);
    expect(service.getAllCompanies).toHaveBeenCalledWith(undefined);
  });

  it('should forward the search query param to the service', async () => {
    const mockResult = {
      statusCode: 200,
      message: 'Companies fetched',
      data: [{ id: 1, name: 'Acme Corp' }],
    };
    service.getAllCompanies.mockResolvedValueOnce(mockResult);

    const result = await controller.getAllCompanies('acme');

    expect(result).toEqual(mockResult);
    expect(service.getAllCompanies).toHaveBeenCalledWith('acme');
  });

  it('should return an empty list when search yields no matches', async () => {
    const mockResult = {
      statusCode: 200,
      message: 'Companies fetched',
      data: [],
    };
    service.getAllCompanies.mockResolvedValueOnce(mockResult);

    const result = await controller.getAllCompanies('xyz');

    expect(result).toEqual(mockResult);
    expect(service.getAllCompanies).toHaveBeenCalledWith('xyz');
  });

  it('should propagate errors thrown by the service', async () => {
    const err = new Error('DB connection failed');
    service.getAllCompanies.mockRejectedValueOnce(err);

    await expect(controller.getAllCompanies()).rejects.toThrow(err);
    expect(service.getAllCompanies).toHaveBeenCalledTimes(1);
  });

  it('should respond within an acceptable time', async () => {
    service.getAllCompanies.mockResolvedValueOnce({
      statusCode: 200,
      message: 'Companies fetched',
      data: [],
    });

    const start = Date.now();
    await controller.getAllCompanies('test');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
