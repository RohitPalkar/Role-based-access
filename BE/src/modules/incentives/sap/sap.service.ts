import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class SapService {
  private readonly logger = new Logger(SapService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly customConfigService: CustomConfigService,
  ) {}

  async getSapData(from: string, to: string, userId: string): Promise<any> {
    try {
      // API URL from environment variables
      const apiURL = this.configService.get<string>('SAP_API_URL');

      // Fetch Basic Auth Credentials from env
      const username = this.configService.get<string>('SAP_USERNAME');
      const password = this.configService.get<string>('SAP_PASSWORD');

      if (!apiURL || !username || !password) {
        throw new InternalServerErrorException(
          'SAP API credentials are missing in environment variables.',
        );
      }

      // Request Payload
      const requestBody = {
        bookingDate: {
          from,
          to,
        },
        RM: userId,
      };

      // API Call
      const response = await firstValueFrom(
        this.httpService.post(apiURL, requestBody, {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: this.customConfigService.getDecrypted('SAP_USERNAME'),
            password: this.customConfigService.getDecrypted('SAP_PASSWORD'),
          },
        }),
      );

      // Return API Response
      return {
        statusCode: 200,
        message: 'SAP data fetched successfully.',
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to fetch SAP data:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to fetch SAP data: ${error?.message}`,
      );
    }
  }
}
