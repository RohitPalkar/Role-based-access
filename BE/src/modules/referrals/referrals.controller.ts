import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Referral } from './entities/referral.entity';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('/create-lead')
  async createLeads(
    @Body('referrals') createLeadDtos: CreateLeadDto[], // Accept array of CreateLeadDto
  ): Promise<Referral[]> {
    return this.referralsService.createLeads(createLeadDtos);
  }

  @Get('/get-referrals/:oppId')
  getReferralsByOppId(@Param('oppId') oppId: string): Promise<any> {
    return this.referralsService.getReferralsByOppId(oppId);
  }
}
