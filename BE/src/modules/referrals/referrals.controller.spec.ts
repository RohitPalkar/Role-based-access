import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Referral } from './entities/referral.entity';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let service: ReferralsService;

  const mockReferralsService = {
    createLeads: jest.fn(),
    getReferralsByOppId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        {
          provide: ReferralsService,
          useValue: mockReferralsService,
        },
      ],
    }).compile();

    controller = module.get<ReferralsController>(ReferralsController);
    service = module.get<ReferralsService>(ReferralsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLeads', () => {
    it('should call createLeads service with array of CreateLeadDto', async () => {
      const dto: CreateLeadDto[] = [
        {
          fullName: 'John Doe',
          mobileNumber: '9999999999',
          email: 'john@test.com',
          opportunityId: 'OPP123',
        } as CreateLeadDto,
      ];

      const mockResponse: Referral[] = [{ id: 1 } as Referral];

      mockReferralsService.createLeads.mockResolvedValue(mockResponse);

      const result = await controller.createLeads(dto);

      expect(service.createLeads).toHaveBeenCalledTimes(1);
      expect(service.createLeads).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getReferralsByOppId', () => {
    it('should call getReferralsByOppId with oppId', async () => {
      const oppId = 'OPP123';

      const mockResponse = [{ id: 1, oppId }];

      mockReferralsService.getReferralsByOppId.mockResolvedValue(mockResponse);

      const result = await controller.getReferralsByOppId(oppId);

      expect(service.getReferralsByOppId).toHaveBeenCalledTimes(1);
      expect(service.getReferralsByOppId).toHaveBeenCalledWith(oppId);
      expect(result).toEqual(mockResponse);
    });
  });
});
