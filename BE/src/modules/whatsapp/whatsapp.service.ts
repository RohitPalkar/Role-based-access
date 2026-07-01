import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { BRAND_PURAVANKARA } from 'src/config/constants';
import { CustomConfigService } from 'src/config/custom-config.service';
import { logger } from 'src/logger/logger';
import { httpPost } from 'src/utils/http.utils';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly configService: CustomConfigService,
    private readonly httpService: HttpService,
  ) {}

  async sendVoucherLink(
    mobileNumber: string,
    customerName: string,
    rmName: string,
    voucherLink: string,
  ) {
    const payload = {
      apiKey: this.configService.getDecrypted('WHATSAPP_API_KEY'),
      campaignName: 'purva_voucher_form',
      destination: mobileNumber,
      userName: BRAND_PURAVANKARA,
      templateParams: [customerName, rmName, voucherLink],
      source: 'new-landing-page form',
      media: {
        url: 'https://d3jt6ku4g6z5l8.cloudfront.net/IMAGE/68b010c72bf2590e4c211446/2247135_purvankara.jpg',
        filename: 'purvankaa',
      },
      buttons: [],
      carouselCards: [],
      location: {},
      paramsFallbackValue: {
        FirstName: 'user',
      },
      attributes: {
        managername: '',
        link: '',
      },
    };

    try {
      const { data } = await httpPost<{
        data: any;
      }>(this.httpService, this.configService.get('WHATSAPP_API_URL'), payload);
      return data;
    } catch (error) {
      logger.error(
        'WhatsApp send failed:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
