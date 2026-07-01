import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { AllocationService } from './allocation.service';
import { CreateUpdateBatchDto } from './dto/create-batch.dto';
import { ListBatchesDto } from './dto/list-batch.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { User } from 'src/modules/sso/decorators/user.decorator';
import { BatchStage } from 'src/enums/batch-manager.enums';
import { GetUnmappedCountDto } from './dto/unMapped-count.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Controller('batch-manager')
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly allocationService: AllocationService,
  ) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'eoi_batches'),
  )
  @Post('create')
  async createBatch(@Body() dto: CreateUpdateBatchDto): Promise<any> {
    return this.batchService.createBatch(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.BIS,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.SALES_RSH,
    RolesEnum.GRE,
  )
  @Get('list')
  async listBatches(@Query() queryDto: ListBatchesDto): Promise<any> {
    return this.batchService.listBatches(queryDto);
  }

  /** GET /batch/:id — batch info + slots grouped by date. */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.GRE)
  @Get('details/:id')
  async getBatchDetail(@Param('id') id: string): Promise<any> {
    return this.batchService.getBatchDetail(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'eoi_batches'),
  )
  @Patch('update/:id')
  async updateBatch(
    @Param('id') id: string,
    @Body() dto: CreateUpdateBatchDto,
  ): Promise<any> {
    return this.batchService.updateBatch(id, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.GRE)
  @Get('batch-stats/:campaignId')
  async getBatchStats(
    @Param('campaignId') campaignId: number,
    @Query('stage') stage: BatchStage = BatchStage.UNIT_ALLOTMENT,
  ) {
    return this.batchService.getBatchStats(campaignId, stage);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.MAP_VOUCHER, 'eoi_batches'),
  )
  @Post('map-vouchers/:batchId')
  async mapVouchers(
    @Param('batchId') batchId: string,
    @User() user: any,
    @Body() body: { notifyAt?: Date },
  ): Promise<any> {
    return this.allocationService.mapVouchersToSlots(
      batchId,
      user,
      body.notifyAt,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.GRE)
  @Get('slot-summary/:batchId')
  async getBatchSlotSummary(@Param('batchId') batchId: string): Promise<any> {
    return await this.batchService.getBatchSlotSummary(batchId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.DELETED, 'eoi_batches'),
  )
  @Delete('delete/:batchId')
  async deleteBatch(
    @User() user: any,
    @Param('batchId') batchId: string,
  ): Promise<any> {
    return await this.batchService.deleteBatch(user, batchId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('notify')
  async notifyBatchUsers(
    @User() user: any,
    @Body()
    body: {
      batchId?: string;
      mappedUserId?: string;
      notifyAt?: Date;
    },
  ) {
    return this.batchService.notifyBatchUsers(user, body);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('unmapped-count')
  async getUnmappedCount(@Body() body: GetUnmappedCountDto) {
    return this.batchService.getUnmappedCount(body);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('dashboard-summary')
  async getDashboardSummary(@Body() body: DashboardSummaryDto) {
    return this.batchService.getDashboardSummary(body);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('dashboard-chart')
  async getDashboardChart(@Body() body: DashboardSummaryDto) {
    return this.batchService.getDashboardChart(body);
  }
}
