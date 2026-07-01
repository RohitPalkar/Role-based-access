import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminReportsService } from './admin_reports.service';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { UserBookingsQueryDto } from './dto/user_booking.dto';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { PaymentStatusEnum } from 'src/enums/booking-list.enums';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

@Controller('admin-reports')
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('dashboard-users')
  getDashboardUsers(@Query() queryDto: CommonFindAllQueryDto) {
    const { page, limit, search, sortBy } = queryDto;
    return this.adminReportsService.getDashboardUsers(
      page,
      limit,
      search,
      sortBy,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('user-export')
  async exportDashboardUsers(@Query() queryDto: CommonFindAllQueryDto) {
    const { page, limit, search, sortBy } = queryDto;
    return await this.adminReportsService.exportDashboardUsers(
      page,
      limit,
      search,
      sortBy,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('user-bookings')
  async userBookings(@Query() query: UserBookingsQueryDto) {
    const {
      userId,
      page,
      limit,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      startDate,
      endDate,
      rmIds,
      sortBy,
    } = query;

    if ((startDate && !endDate) || (!startDate && endDate))
      throw new BadRequestException('Start Date & End Date both required');
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
    if (userId && rmIds)
      throw new BadRequestException(`select any one of both RM Id's or userId`);

    return this.adminReportsService.userBookings({
      userId,
      page,
      limit,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      rmIds,
      sortBy,
    });
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('bookings-export')
  async exportUserBookings(@Query() query: UserBookingsQueryDto) {
    const {
      userId,
      page,
      limit,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      startDate,
      endDate,
      rmIds,
      sortBy,
    } = query;

    if ((startDate && !endDate) || (!startDate && endDate))
      throw new BadRequestException('Start Date & End Date both required');

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Start Date cannot be after End Date');
    }

    return this.adminReportsService.exportUserBookings({
      userId,
      page,
      limit,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      rmIds,
      sortBy,
    });
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Patch('update-status')
  async updatePaymentStatus(
    @Query('ids') ids: string,
    @Query('paymentStatus') paymentStatus: string,
  ) {
    const idArray = ids
      ?.split(',')
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    if (!Array.isArray(idArray) || !idArray.length) {
      throw new BadRequestException('Invalid or missing "ids" array.');
    }

    if (
      !Object.values(PaymentStatusEnum).includes(
        paymentStatus as PaymentStatusEnum,
      )
    ) {
      const validStatuses = Object.values(PaymentStatusEnum).join(', ');
      throw new BadRequestException(
        `Invalid "paymentStatus". Must be one of: ${validStatuses}`,
      );
    }

    return this.adminReportsService.updatePaymentStatus(
      idArray,
      paymentStatus as PaymentStatusEnum,
    );
  }
}
