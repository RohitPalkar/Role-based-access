import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncentiveDashboardService } from './incentive_dashboard.service';
import { ProjectStage } from 'src/enums/project-stage.enum';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../../sso/decorators/roles.decorator';
import { User } from '../../sso/decorators/user.decorator';
import { getMonthNumber } from 'src/helpers/monthParser';

@Controller('incentive-dashboard')
@UseGuards(RmAdminAuthGuard, RolesGuard)
export class IncentiveDashboardController {
  constructor(
    private readonly incentiveDashboardService: IncentiveDashboardService,
  ) {}

  @Get('cards')
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async incentiveDashboardData(
    @User() user: any,
    @Query('projectIds') ids: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('rmId') rmId?: string,
  ) {
    const monthInt = getMonthNumber(month);

    if (year && isNaN(Number(year))) {
      throw new BadRequestException('Invalid year. It must be a valid number.');
    }

    const rmUserId = user?.role == RolesEnum.RM ? user?.dbId : rmId;
    let projectIds = [];
    if (ids) {
      projectIds = ids.split(',').map((id) => id.trim());
      const allValid = projectIds.every((id) => !isNaN(Number(id)));
      if (!allValid) {
        throw new BadRequestException(
          'Invalid projectIds. All IDs must be numbers.',
        );
      }
    }
    return await this.incentiveDashboardService.getIncentiveCardsData(
      rmUserId,
      projectIds,
      monthInt,
      year,
    );
  }

  @Get('user-targets')
  @Roles(RolesEnum.RM)
  async getUserPerformance(
    @User() user: any,
    @Query('type') type: 'monthly' | 'yearly',
  ) {
    // Validate that type is one of the allowed values.
    if (!['monthly', 'yearly'].includes(type)) {
      throw new BadRequestException(
        'Invalid type. Allowed values: "monthly", "yearly".',
      );
    }
    return this.incentiveDashboardService.getUserPerformance(user?.dbId, type);
  }

  @Get('/booster-prize')
  @Roles(RolesEnum.RM)
  async getPrize(@User() user: any) {
    return await this.incentiveDashboardService.getPrizeData(user?.dbId);
  }

  @Get('/sales')
  @Roles(RolesEnum.RM)
  async getSalesData(
    @User() user: any,
    @Query('phaseType')
    phaseType: string,
  ) {
    // Validate phaseType query parameter.
    if (!phaseType) {
      throw new BadRequestException('phaseType parameter is required.');
    }
    const formattedPhaseType =
      phaseType.charAt(0).toUpperCase() + phaseType.slice(1).toLowerCase();

    if (
      ![ProjectStage.NEW_LAUNCH, ProjectStage.SUSTENANCE].includes(
        formattedPhaseType as ProjectStage,
      )
    ) {
      throw new BadRequestException(
        `Invalid phaseType. Allowed values: ${ProjectStage.NEW_LAUNCH}, ${ProjectStage.SUSTENANCE}`,
      );
    }
    return this.incentiveDashboardService.getSalesData(
      user?.dbId,
      formattedPhaseType,
    );
  }
}
