import { Controller, Get, Param } from '@nestjs/common';
import { FormAmendmentRequestService } from './form_amendment_requests.service';
import { CreateFormAmendmentRequestDto } from './dto/create-logs.dto';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { OnEvent } from '@nestjs/event-emitter';

@Controller('form-amendment-requests')
export class FormAmendmentRequestsController {
  constructor(
    private readonly amendmentRequestsService: FormAmendmentRequestService,
  ) {}

  @Get(':oppId')
  async getAmendmentRequest(@Param('oppId') oppId: string): Promise<any> {
    return this.amendmentRequestsService.getAmendmentRequest(oppId);
  }

  @Get('/get-details/:requestId')
  async getAmendmentRequestById(
    @Param('requestId') requestId: number,
  ): Promise<any> {
    return this.amendmentRequestsService.getAmendmentRequestById(requestId);
  }

  @OnEvent(EventMessagesEnum.FORM_AMENDMENT_REQUEST)
  async createRequestLogs(data: CreateFormAmendmentRequestDto) {
    this.amendmentRequestsService.createRequestLogs(data);
  }
}
