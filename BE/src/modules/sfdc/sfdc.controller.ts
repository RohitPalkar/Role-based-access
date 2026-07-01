import { Controller, Get, Query } from '@nestjs/common';
import { SfdcService } from './sfdc.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';

@Controller('sfdc')
export class SfdcController {
  constructor(private readonly sfdcService: SfdcService) {}

  @OnEvent(EventMessagesEnum.LEAD_CREATED)
  async handleLogsCreatedEvent(data) {
    this.sfdcService.createLeadOnSFDC(data);
  }

  @Get('channel-partner-list')
  async getChannelPartnerList(@Query('search') searchname?: string) {
    return this.sfdcService.getChannelPartnerList(searchname);
  }
}
