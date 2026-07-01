import { Test, TestingModule } from '@nestjs/testing';
import { CountryMasterController } from './country_master.controller';
import { CountryMasterService } from './country_master.service';
import { BadRequestException } from '@nestjs/common';

class MockCountryMasterService {
  getAllCountries = jest.fn();
}

describe('CountryMasterController.getAllCountries', () => {
  let controller: CountryMasterController;
  let service: MockCountryMasterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryMasterController],
      providers: [
        { provide: CountryMasterService, useClass: MockCountryMasterService },
      ],
    }).compile();

    controller = module.get(CountryMasterController);
    service = module.get(CountryMasterService);
  });

  it('should fetch countries (success + response time)', async () => {
    const dto = { search: 'ind', page: 1, limit: 10 };
    const mockData = [
      { id: '1', isoCode: 'IN', countryName: 'India', countryCode: '91' },
    ];
    const mockResult = {
      message: 'Countries fetched',
      data: { countries: mockData, total: 1, page: 1, limit: 10 },
    };
    service.getAllCountries.mockResolvedValueOnce(mockResult);

    const start = Date.now();
    const result = await controller.getAllCountries(dto as any);
    const duration = Date.now() - start;

    expect(result).toEqual(mockResult);
    expect(service.getAllCountries).toHaveBeenCalledWith(dto);
    expect(duration).toBeLessThan(1000);
  });

  it('should fetch countries without pagination when page/limit are absent', async () => {
    const dto = { search: '' };
    const mockData = [
      { id: '1', isoCode: 'AD', countryName: 'Andorra', countryCode: '376' },
      {
        id: '2',
        isoCode: 'AE',
        countryName: 'United Arab Emirates',
        countryCode: '971',
      },
    ];
    const mockResult = {
      message: 'Countries fetched',
      data: { countries: mockData, total: mockData.length },
    };
    service.getAllCountries.mockResolvedValueOnce(mockResult);

    const result = await controller.getAllCountries(dto as any);

    expect(result).toEqual(mockResult);
    expect(service.getAllCountries).toHaveBeenCalledWith(dto);
  });

  it('should propagate BadRequestException from the service (e.g., invalid pagination)', async () => {
    const dto = { page: 0, limit: 10 } as any;
    service.getAllCountries.mockRejectedValueOnce(
      new BadRequestException('Invalid pagination'),
    );

    await expect(controller.getAllCountries(dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(service.getAllCountries).toHaveBeenCalledWith(dto);
  });

  it('should propagate generic errors from the service', async () => {
    const dto = { search: 'uae' } as any;
    const err = new Error('DB read failed');
    service.getAllCountries.mockRejectedValueOnce(err);

    await expect(controller.getAllCountries(dto)).rejects.toThrow(err);
    expect(service.getAllCountries).toHaveBeenCalledWith(dto);
  });

  it('should pass the dto through unchanged (preserve fields/spacing)', async () => {
    const dto = { search: '  In  dia  ', page: 2, limit: 5 } as any;
    const mockResult = {
      message: 'Countries fetched',
      data: { countries: [], total: 0, page: 2, limit: 5 },
    };
    service.getAllCountries.mockResolvedValueOnce(mockResult);

    const result = await controller.getAllCountries(dto);

    expect(result).toEqual(mockResult);
    expect(service.getAllCountries).toHaveBeenCalledWith(dto);
  });
});
