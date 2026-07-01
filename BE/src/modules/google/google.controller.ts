import { Controller, Get, Param, Query } from '@nestjs/common';
import { GoogleService } from './google.service';

@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Get('autocomplete')
  async autocomplete(@Query('input') input: string) {
    return this.googleService.getAutocomplete(input);
  }

  @Get('address-details/:placeId')
  async getAddressDetails(@Param('placeId') placeId: string) {
    return this.googleService.getAddressDetails(placeId);
  }
}
