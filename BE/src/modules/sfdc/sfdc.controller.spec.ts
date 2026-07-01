import { Test, TestingModule } from '@nestjs/testing';
import { SfdcController } from './sfdc.controller';
import { SfdcService } from './sfdc.service';

describe('SfdcController', () => {
  let controller: SfdcController;
  let service: SfdcService;

  const mockSfdcService = {
    createLeadOnSFDC: jest.fn(),
    getChannelPartnerList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SfdcController],
      providers: [
        {
          provide: SfdcService,
          useValue: mockSfdcService,
        },
      ],
    }).compile();

    controller = module.get<SfdcController>(SfdcController);
    service = module.get<SfdcService>(SfdcService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLogsCreatedEvent', () => {
    it('should call createLeadOnSFDC with event data', async () => {
      const eventData = { leadId: 123 };

      await controller.handleLogsCreatedEvent(eventData);

      expect(service.createLeadOnSFDC).toHaveBeenCalledTimes(1);
      expect(service.createLeadOnSFDC).toHaveBeenCalledWith(eventData);
    });
  });

  describe('getChannelPartnerList', () => {
    it('should return channel partner list with search', async () => {
      const search = 'test partner';
      const mockResponse = [{ id: 1, name: 'Test Partner' }];

      mockSfdcService.getChannelPartnerList.mockResolvedValue(mockResponse);

      const result = await controller.getChannelPartnerList(search);

      expect(service.getChannelPartnerList).toHaveBeenCalledTimes(1);
      expect(service.getChannelPartnerList).toHaveBeenCalledWith(search);
      expect(result).toEqual(mockResponse);
    });

    it('should return channel partner list without search', async () => {
      const mockResponse = [{ id: 2, name: 'Partner A' }];

      mockSfdcService.getChannelPartnerList.mockResolvedValue(mockResponse);

      const result = await controller.getChannelPartnerList();

      expect(service.getChannelPartnerList).toHaveBeenCalledTimes(1);
      expect(service.getChannelPartnerList).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResponse);
    });
  });
});
