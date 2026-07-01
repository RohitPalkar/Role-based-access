import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CityMasterService } from './citymaster.service';

@Controller('cities')
export class CityMasterController {
  constructor(private readonly cityMasterService: CityMasterService) {}

  @Get()
  async getCities(@Query('brandId') brandId?: string) {
    let brandIds: number[] | undefined;

    if (brandId) {
      brandIds = brandId
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '') // remove empty strings first
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));

      if (brandIds.length === 0) {
        throw new BadRequestException('Invalid brandId(s) provided.');
      }
    }

    return this.cityMasterService.findAll(brandIds);
  }
}
