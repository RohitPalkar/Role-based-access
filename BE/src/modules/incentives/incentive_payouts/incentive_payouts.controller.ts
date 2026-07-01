import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IncentivePayoutsService } from './incentive_payouts.service';
import { PayableBookingsQueryDto } from './dto/get-payable-bookings.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../../sso/decorators/roles.decorator';
import { User } from '../../sso/decorators/user.decorator';
import { PayoutFileDto } from './dto/payout-file.dto';

@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
@Controller('incentive-payouts')
export class IncentivePayoutsController {
  constructor(private readonly payoutService: IncentivePayoutsService) {}

  @Get('payable-bookings')
  async getPayableBookings(@Query() queryDto: PayableBookingsQueryDto) {
    const {
      page,
      limit,
      search,
      startDate,
      endDate,
      brandIds,
      projectIds,
      rmIds,
      sortBy,
    } = queryDto;
    return this.payoutService.getPayableBookings({
      page,
      limit,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      brandIds,
      projectIds,
      rmIds,
      sortBy,
    });
  }

  @Get('export-payable-bookings')
  async exportPayableBookings(@Query() queryDto: PayableBookingsQueryDto) {
    const {
      page,
      limit,
      search,
      startDate,
      endDate,
      brandIds,
      projectIds,
      rmIds,
      sortBy,
    } = queryDto;
    return this.payoutService.exportPayableBookings({
      page,
      limit,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      brandIds,
      projectIds,
      rmIds,
      sortBy,
    });
  }

  @Post('bulk-payout')
  async bulkPayout(@User() user: any, @Body() payoutFileDto: PayoutFileDto) {
    return await this.payoutService.bulkPayout(user, payoutFileDto);
  }
}
