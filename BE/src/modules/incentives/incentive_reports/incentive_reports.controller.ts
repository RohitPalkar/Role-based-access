import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncentiveReportsService } from './incentive_reports.service';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { User } from '../../sso/decorators/user.decorator';
import { reportFormat } from 'src/enums/report-format.enum';

@Controller('incentive-reports')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
export class IncentiveReportsController {
  constructor(
    private readonly incentiveReportsService: IncentiveReportsService,
  ) {}

  @Get()
  async generateCustomReport(
    @User() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('rmId') rmId: string,
    @Query('format') format: string = reportFormat.PDF,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }

    const getFinancialYear = (date: Date): number => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // Month is 0-based
      return month < 4 ? year - 1 : year;
    };

    const startFY = getFinancialYear(start);
    const endFY = getFinancialYear(end);

    if (startFY !== endFY) {
      throw new BadRequestException(
        'Start and End date must be in the same financial year (April–March).',
      );
    }
    const rmUserId = user?.role == RolesEnum.RM ? user?.dbId : rmId;
    const result = await this.incentiveReportsService.generateCustomReport(
      Number(rmUserId),
      start,
      end,
      format,
    );

    return result;
  }
}
