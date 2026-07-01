import { Body, Controller, Post } from '@nestjs/common';
import { CountryMasterService } from './country_master.service';
import { ListCountryMasterDto } from './dto/list-countries.dto';

@Controller('country-master')
export class CountryMasterController {
  constructor(private readonly service: CountryMasterService) {}

  @Post()
  getAllCountries(@Body() dto: ListCountryMasterDto) {
    return this.service.getAllCountries(dto);
  }
}
