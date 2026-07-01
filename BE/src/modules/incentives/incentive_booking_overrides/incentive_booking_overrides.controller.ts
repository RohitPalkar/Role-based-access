import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { IncentiveBookingOverridesService } from './incentive_booking_overrides.service';
import { BookingFileDto } from './dto/booking_file.dto';
import { User } from '../../sso/decorators/user.decorator';

@Controller('incentive-booking-overrides')
export class IncentiveBookingOverridesController {
  constructor(
    private readonly bookingOverrideService: IncentiveBookingOverridesService,
  ) {}

  @Get('sample-excel')
  async sampleExcel() {
    return this.bookingOverrideService.sampleExcel();
  }

  @Post('bulk-insert')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  async bulkInsert(@User() user: any, @Body() bookingFileDto: BookingFileDto) {
    return await this.bookingOverrideService.bulkInsert(user, bookingFileDto);
  }
}
