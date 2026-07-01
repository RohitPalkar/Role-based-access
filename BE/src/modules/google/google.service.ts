import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { SUCCESS } from 'src/config/constants';
import { CustomConfigService } from 'src/config/custom-config.service';
import { logger } from 'src/logger/logger';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';

@Injectable()
export class GoogleService {
  private readonly googleApiKey: string;
  private readonly googleUrl =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json';

  private readonly detailsUrl =
    'https://maps.googleapis.com/maps/api/place/details/json';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: CustomConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {
    this.googleApiKey = this.configService.get('GOOGLE_API_KEY');
  }

  /**
   * Get address autocomplete suggestions from Google Places API
   * @param input string
   * @returns list of address suggestions
   */
  async getAutocomplete(input: string): Promise<any> {
    try {
      if (!input || input.trim().length < 3) {
        return []; // avoid unnecessary API calls for short queries
      }

      const finalResponse = {
        statusCode: SUCCESS,
        data: null,
        message: 'Address suggestions fetched successfully',
      };
      const cacheKey = `autocomplete:${input.toLowerCase()}`;

      // Check cache first
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        finalResponse.data = cachedData;
        return finalResponse;
      }

      logger.info('Fetching autocomplete from Google API for input:', input);
      // Fetch from Google API
      const response = await firstValueFrom(
        this.httpService.get(this.googleUrl, {
          params: {
            input,
            key: this.googleApiKey,
          },
        }),
      );

      const predictions = response.data?.predictions || [];

      // Simplify data
      const results = predictions.map((p) => ({
        description: p.description,
        placeId: p.place_id,
      }));

      // Cache result (TTL: 30 mins)
      if (results.length > 0)
        await this.cacheService.set(cacheKey, results, 300 * 1000);
      finalResponse.data = results;
      return finalResponse;
    } catch (error) {
      logger.error('Google Autocomplete error:', error.message);
      logsAndErrorHandling('GoogleService - getAutocomplete', error);
    }
  }

  /**
   * Get full address details using placeId
   * @param placeId string
   * @returns address details
   */
  async getAddressDetails(placeId: string): Promise<any> {
    try {
      if (!placeId) {
        throw new HttpException('placeId is required', HttpStatus.BAD_REQUEST);
      }

      const finalResponse = {
        statusCode: SUCCESS,
        data: null,
        message: 'Address details fetched successfully',
      };
      const cacheKey = `address-details:${placeId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        finalResponse.data = cached;
        return finalResponse;
      }
      logger.info(
        'Fetching address details from Google API for placeId:',
        placeId,
      );

      const response = await firstValueFrom(
        this.httpService.get(this.detailsUrl, {
          params: {
            place_id: placeId,
            key: this.googleApiKey,
          },
        }),
      );

      const result = response.data?.result;
      if (!result) {
        throw new HttpException('No details found', HttpStatus.NOT_FOUND);
      }

      const components = result.address_components || [];
      const formattedAddress = result.formatted_address;

      // Extract specific fields
      const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name || null;

      const address = {
        areaName: formattedAddress,
        city: get('locality'),
        state: get('administrative_area_level_1'),
        country: get('country'),
        pinCode: get('postal_code'),
        mapLink: result?.url ?? null,
      };

      if (address) await this.cacheService.set(cacheKey, address, 1800 * 1000); // cache 30 mins
      finalResponse.data = address;
      return finalResponse;
    } catch (error) {
      logger.error('Google Place Details error:', error.message);
      throw new HttpException(
        'Failed to fetch address details',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
