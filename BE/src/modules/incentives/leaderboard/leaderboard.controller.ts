import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderBoardService } from './leaderboard.service';
import {
  LeaderBoardQueryDto,
  TopTenRmQueryDto,
  RmSummaryQueryDto,
} from './dto/common.dto';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';

/**
 * Controller: LeaderBoardController
 *
 * Exposes endpoints to fetch leaderboard analytics and RM performance:rm-s
 * - GET /leaderboard/highest-units-sold
 * - GET /leaderboard/most-efficient-rms
 * - GET /leaderboard/highest-revenue
 * - GET /leaderboard/rm-summary (supports export)
 * - GET /leaderboard/top-performers
 * - GET /leaderboard/top-rms
 * - GET /leaderboard/cancellations
 */
@Controller('leaderboard')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
export class LeaderBoardController {
  constructor(private readonly leaderBoardService: LeaderBoardService) {}

  /**
   * Returns RMs with the highest units sold in a financial year.
   * @param financialYear Optional query param (YYYY-YYYY), defaults to current FY.
   */
  @Get('highest-units-sold')
  async getHighestUnitsSold(@Query('financialYear') financialYear?: string) {
    return await this.leaderBoardService.getHighestUnitsSold(financialYear);
  }

  /**
   * Returns RMs with best booking-to-qualified efficiency in a financial year.
   * @param financialYear Optional query param (YYYY-YYYY), defaults to current FY.
   */
  @Get('most-efficient-rms')
  async getMostEfficientRMs(@Query('financialYear') financialYear?: string) {
    return await this.leaderBoardService.getMostEfficientRMs(financialYear);
  }

  /**
   * Returns highest revenue earned RMs across YTD/QTD/MTD.
   * @param financialYear Optional query param (YYYY-YYYY), defaults to current FY.
   */
  @Get('/highest-revenue')
  async getHighestRevenue(@Query('financialYear') financialYear?: string) {
    return await this.leaderBoardService.getHighestRevenue(financialYear);
  }

  /**
   * Returns RM summary with filters and pagination, or triggers export when isExcel=true.
   * Query DTO supports brandId, cityIds, projectIds, date range, search, unitStatus, pagination and isExcel.
   */
  @Get('/rm-summary')
  async getRmSummary(@Query() query: RmSummaryQueryDto): Promise<any> {
    const {
      page,
      limit,
      unitStatus,
      brandId,
      cityIds,
      projectIds,
      startDate,
      endDate,
      search,
      isExcel,
    } = query;

    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    return isExcel
      ? await this.leaderBoardService.exportRmSummary({
          unitStatus,
          brandId,
          cityIds,
          projectIds,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          search,
          isExcel,
        })
      : await this.leaderBoardService.getRmSummary({
          unitStatus,
          brandId,
          cityIds,
          projectIds,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          search,
          isExcel,
          page,
          limit,
        });
  }

  /**
   * Returns top performers filtered by brand/project/city.
   * Uses LeaderBoardQueryDto (type, id, pagination, financialYear).
   */
  @Get('/top-performers')
  async getTopPerformers(@Query() query: LeaderBoardQueryDto): Promise<any> {
    return await this.leaderBoardService.getTopPerformers(
      query.type,
      query.id,
      query.page,
      query.limit,
      query.financialYear,
    );
  }

  /**
   * Returns the Top 10 RMs by sales.
   * Uses TopTenRmQueryDto (page, limit, financialYear).
   */
  @Get('/top-rms')
  async getTopTenRm(@Query() queryDto: TopTenRmQueryDto): Promise<any> {
    const { page, limit, financialYear } = queryDto;
    return await this.leaderBoardService.getTopTenRm(
      page,
      limit,
      financialYear,
    );
  }

  /**
   * Returns cancellations data filtered by brand/project/city.
   * Uses LeaderBoardQueryDto (type, id, financialYear).
   */
  @Get('/cancellations')
  async getCancellationsData(
    @Query() query: LeaderBoardQueryDto,
  ): Promise<any> {
    return await this.leaderBoardService.getCancellationsData(
      query.type,
      query.id,
      query.financialYear,
    );
  }
}
