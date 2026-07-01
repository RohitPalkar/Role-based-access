import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsappNotifyEvent } from 'src/events/whatsapp.events';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppEventsEnum } from 'src/enums/event-messages.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappListener {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(WhatsAppEventsEnum.SEND_VOUCHER_LINK)
  async handleWhatsappNotify(event: WhatsappNotifyEvent) {
    const ENABLE_WHATSAPP =
      this.configService.get<string>('ENABLE_WHATSAPP') === 'true';
    if (!ENABLE_WHATSAPP) {
      return event.rmName;
    }
    await this.whatsappService.sendVoucherLink(
      event.mobileNumber,
      event.customerName,
      event.rmName,
      event.voucherLink,
    );
  }
}
