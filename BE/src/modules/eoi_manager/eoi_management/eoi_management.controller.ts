import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { EoiManagementService } from './eoi_management.service';
import { CreateVoucherFormDto } from './dto/create-voucher-form.dto';
import { UpdateVoucherDetailsDto } from './dto/update-voucher-details.dto';
import { UpdateSfdcIdsDto } from './dto/update-sfdc-ids.dto';
import { ListVouchersFilterDto } from './dto/list-vouchers-filter.dto';
import { ListTransactionsFilterDto } from './dto/list-transactions-filter.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../../sso/decorators/user.decorator';
import { CancelEoiDto } from './dto/cancel-eoi.dto';
import { SaveAgreementDetailsDto } from './dto/save-agreement-details.dto';
import { AssignClosingRmDto } from './dto/assign-closing-rm.dto';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { CheckerUpdatesDto } from './dto/checker-updates.dto';
import { RefundEOIPaymentDto } from './dto/refund-eoi-payment.dto';
import { ApproveCancelRequestDTO } from './dto/approve-cancel-request.dto';
import { RmDashboardFilterDto } from './dto/rm-dashboard-filter.dto';
import { DeleteRestoreVoucherDto } from './dto/delete-restore-voucher.dto';
import { InventoryWiseSplitQueryDto } from './dto/inventory-wise-split.dto';
import { DailyTrackerQueryDto } from './dto/daily-tracker-query.dto';
import { GetReferredVoucherDto } from './dto/get-referred-voucher.dto';
import { GetVoucherByEnquiryIdDto } from './dto/get-voucher-by-enquiry.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { EoiLeaderboardFilterDto } from './dto/eoi-leaderboard-filter.dto';
import {
  GetFloorDropdownDto,
  GetInventoryByFloorDto,
} from './dto/get-floor-dropdown.dto';
import { MapAndConvertDto } from './dto/map-and-converted.dto';
import { FetchVoucherForMappingDto } from './dto/fetch-voucher-for-mapping.dto';
import { CreateVoucherChangeRequestDto } from './dto/create-source-change-request.dto';
import { GetVoucherByPridDto } from './dto/get-voucher-by-prid.dto';
import { GetVoucherChangeRequestDto } from './dto/get-source-change-request.dto';
import { ApproveVoucherChangeRequestDto } from './dto/approve-source-change-request.dto';
import { BulkUpdateTransactionsDto } from './dto/bulk-update-transactions.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';

@Controller('eoi-management')
export class EoiManagementController {
  constructor(private readonly eoiManagementService: EoiManagementService) {}

  @Get('/get-voucher-form/:id')
  @ExposeFields('createdAt')
  getVoucherFormById(
    @Param('id') id: number,
    @Query('maskEmailMobile') maskEmailMobile?: boolean,
  ): Promise<any> {
    return this.eoiManagementService.getVoucherFormById(id, maskEmailMobile);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('/get-referred-voucher')
  getVoucherApplicantDetails(
    @Query() dto: GetReferredVoucherDto,
  ): Promise<any> {
    return this.eoiManagementService.getReferredVoucher(
      dto.campaignId,
      dto.uniqueRefId,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @Post('rm-dashboard')
  async getDashboard(
    @User() user: any,
    @Body() dto: RmDashboardFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.getDashboardData(dto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.CREATED, 'vouchers'))
  @Roles(RolesEnum.RM)
  @Post('/create-voucher-form')
  createVoucherForm(
    @Body() createVoucherFormDto: CreateVoucherFormDto,
    @User() user: any,
  ): Promise<any> {
    return this.eoiManagementService.createVoucherForm(
      createVoucherFormDto,
      user,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Roles(RolesEnum.RM, RolesEnum.PROJECT_HEAD, RolesEnum.SALES_TL)
  @Patch('/update-voucher-details/:voucherId')
  updateVoucherDetails(
    @Param('voucherId') voucherId: number,
    @Body() updateVoucherDetailsDto: UpdateVoucherDetailsDto,
  ): Promise<any> {
    return this.eoiManagementService.updateVoucherDetails(
      voucherId,
      updateVoucherDetailsDto,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Roles(RolesEnum.MIS, RolesEnum.CRM)
  @Patch('/update-checker-status')
  updateBackendCheckerStatus(
    @User() user: any,
    @Body() checkerUpdates: CheckerUpdatesDto,
  ): Promise<any> {
    return this.eoiManagementService.updateBackendCheckerStatus(
      user,
      checkerUpdates,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.REFUNDED, 'vouchers'),
  )
  @Roles(RolesEnum.FINANCE_ADMIN)
  @Patch('/refund-payment')
  refundEOIPayment(
    @User() user: any,
    @Body() refundDetails: RefundEOIPaymentDto,
  ): Promise<any> {
    return this.eoiManagementService.refundEOIPayment(user, refundDetails);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_TL, RolesEnum.PROJECT_HEAD)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Patch('/agreement-details')
  saveAgreementValues(
    @Body() saveAgreementValuesDto: SaveAgreementDetailsDto,
    @User() user: any,
  ): Promise<any> {
    return this.eoiManagementService.saveAgreementDetails(
      saveAgreementValuesDto,
      user,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_TL, RolesEnum.PROJECT_HEAD)
  @Get('/agreement-details/:opportunityId')
  getAgreementDetails(
    @Param('opportunityId') opportunityId: string,
  ): Promise<any> {
    return this.eoiManagementService.getAgreementDetails(opportunityId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CANCELLED, 'vouchers'),
  )
  @Post('/cancel-eoi')
  cancelEOI(
    @User() user: any,
    @Body() cancelEoiDto: CancelEoiDto,
  ): Promise<any> {
    return this.eoiManagementService.cancelEOI(user, cancelEoiDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Post('/delete-restore-voucher')
  deleteRestoreVoucher(
    @User() user: any,
    @Body() dto: DeleteRestoreVoucherDto,
  ): Promise<any> {
    return this.eoiManagementService.deleteRestoreVoucher(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.SALES_BH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @ExposeFields('createdAt', 'updatedAt', 'isDeleted')
  @Get('/list-vouchers')
  listVouchers(
    @User() user: any,
    @Query() filterDto: ListVouchersFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.listVouchers(user, filterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.SALES_BH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @Get('/sources/primary')
  getPrimarySourcesForDropdown(): Promise<any> {
    return this.eoiManagementService.getPrimarySourcesForDropdown();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
  )
  @Get('/send-form-link/:id')
  sendFormEmail(@Param('id') id: number): Promise<any> {
    return this.eoiManagementService.sendFormLink(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Post('/assign-closing-rm')
  assignClosingRm(
    @Body() assignClosingRmDto: AssignClosingRmDto,
  ): Promise<any> {
    return this.eoiManagementService.assignClosingRm(assignClosingRmDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_BH,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @Get('/export-vouchers')
  exportVouchers(
    @User() user: any,
    @Query() filterDto: ListVouchersFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.exportVouchers(user, filterDto);
  }

  //sample excel for voucher transaction
  @Get('sample-excel')
  async sampleExcel() {
    return this.eoiManagementService.sampleExcel();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_BH,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
  )
  @Get('/export-transactions')
  exportTransactions(
    @User() user: any,
    @Query() filterDto: ListVouchersFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.exportTransactions(user, filterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.FINANCE_ADMIN, RolesEnum.BIS, RolesEnum.CRM)
  @Get('/list-transactions/:id')
  @ExposeFields('createdAt', 'updatedAt')
  listTransactions(
    @Param('id') id: number,
    @Query() filterDto: ListTransactionsFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.listTransactions(id, filterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.FINANCE_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'transactions'),
  )
  @Patch('/update-transaction/:id')
  updateTransaction(
    @Param('id') id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @User('dbId') userId: number,
  ): Promise<any> {
    return this.eoiManagementService.updateTransaction(
      id,
      updateTransactionDto,
      userId,
    );
  }

  /**
   * PE-483: Enqueue bulk reconciliation for an uploaded **Transactions** `.xlsx` on S3 (`key` + `fileName`).
   * Returns 202 + `jobId`; processing is async (BullMQ). Full call chain: `docs/PE-483-bulk-transaction-api-flow.md`.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.FINANCE_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'transactions'),
  )
  @Post('/bulk-update-transactions')
  @HttpCode(HttpStatus.ACCEPTED)
  bulkUpdateTransactions(
    @User() _user: any,
    @User('dbId') userId: number,
    @Body() dto: BulkUpdateTransactionsDto,
  ): Promise<any> {
    return this.eoiManagementService.bulkUpdateTransactions(userId, dto);
  }

  /**
   * PE-483: Poll bulk job — Bull `state`, `progress`, `returnvalue` / `failedReason`, DB `auditTimeline`.
   * Access: same `FINANCE_ADMIN` who enqueued (`job.data.userId`). See `docs/PE-483-bulk-transaction-api-flow.md`.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.FINANCE_ADMIN)
  @Get('/bulk-update-transactions/jobs/:jobId')
  getBulkTransactionJobStatus(
    @User('dbId') userId: number,
    @Param('jobId') jobId: string,
  ): Promise<any> {
    return this.eoiManagementService.getBulkTransactionJobStatus(userId, jobId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Post('/approve-cancel-request')
  approveCancelRequest(
    @User() user: any,
    @Body() cancelDto: ApproveCancelRequestDTO,
  ): Promise<any> {
    return this.eoiManagementService.approveCancelRequest(user, cancelDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_BH,
    RolesEnum.BIS,
  )
  @Get('tab-counts')
  getTabCounts(@User() user: any): Promise<{
    cancellationRequestCount: number;
    changeRequestCount: number;
  }> {
    return this.eoiManagementService.getTabCounts(user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
  )
  @Post('export-eoi-dashboard')
  exportRmDashboard(
    @User('dbId') userId: any,
    @Body() dto: RmDashboardFilterDto,
  ): Promise<any> {
    return this.eoiManagementService.exportRmDashboard(userId, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
  )
  @Get('campaign-inventory-dropdown/:campaignId')
  async campaignInventoryDropdown(
    @Param('campaignId') campaignId: number,
  ): Promise<any> {
    return this.eoiManagementService.campaignInventoryDropdown(campaignId);
  }

  @Post('send-daily-dashboard-report')
  async sendDailyDashboardReport(
    @Body('recipientEmail') recipientEmail?: string[],
  ): Promise<any> {
    return this.eoiManagementService.sendDailyDashboardReport(recipientEmail);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @Get('inventory-wise-split')
  inventoryWiseSplit(@Query() query: InventoryWiseSplitQueryDto): Promise<any> {
    return this.eoiManagementService.getInventoryWiseSplit(query);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
    RolesEnum.SALES_RSH,
    RolesEnum.BIS,
  )
  @Get('daily-tracker')
  dailyTracker(@Query() query: DailyTrackerQueryDto): Promise<any> {
    return this.eoiManagementService.getDailyTracker(query);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('get-voucher-by-enquiry')
  getVoucherByEnquiryId(
    @Query() query: GetVoucherByEnquiryIdDto,
  ): Promise<any> {
    return this.eoiManagementService.getVoucherByEnquiryId(query);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.MIS,
    RolesEnum.BIS,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('primary-source-projects')
  getPrimarySourceProjects(
    @Query() query: CommonFindAllQueryDto,
  ): Promise<any> {
    const { search } = query;
    return this.eoiManagementService.getPrimarySourceProjects(search);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('get-eoi-to-convert/:id')
  getEoiToConvert(@Param('id') id: number): Promise<any> {
    return this.eoiManagementService.getEoiToConvert(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('get-floor-dropdown')
  getFloorDropdown(@Query() dto: GetFloorDropdownDto): Promise<any> {
    return this.eoiManagementService.getFloorDropdown(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @Get('get-inventory-by-floor')
  getInventoryByFloor(@Query() dto: GetInventoryByFloorDto): Promise<any> {
    return this.eoiManagementService.getInventoryByFloor(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.RM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('fetch-voucher-for-mapping')
  fetchVoucherForMapping(
    @Query() dto: FetchVoucherForMappingDto,
  ): Promise<any> {
    return this.eoiManagementService.fetchVoucherForMapping(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.MAP_AND_CONVERT, 'vouchers'),
  )
  @Post('map-and-convert')
  mapAndConvert(
    @User() user: any,
    @Body() dto: MapAndConvertDto,
  ): Promise<any> {
    return this.eoiManagementService.mapAndConvert(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.REVERT_EOI, 'vouchers'),
  )
  @Post('revert-to-eoi')
  revertToEOI(
    @User() user: any,
    @Body() dto: { voucherId: number },
  ): Promise<any> {
    return this.eoiManagementService.revertToEOI(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get('eoi-leaderboard')
  getEoiLeaderboard(@Query() dto: EoiLeaderboardFilterDto): Promise<any> {
    return this.eoiManagementService.getEoiLeaderboard(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('export-eoi-leaderboard')
  exportEoiLeaderboard(@Body() dto: EoiLeaderboardFilterDto): Promise<any> {
    return this.eoiManagementService.exportEoiLeaderboard(dto);
  }

  @UseGuards(RmAdminAuthGuard)
  @Get('/download-pdf/:voucherId')
  async downloadPdf(@Param('voucherId') voucherId: string) {
    return this.eoiManagementService.downloadEoiFormPDF(voucherId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.EOI_LEAD_PUSH, 'eoi_campaigns'),
  )
  @Post('/create-eois-leads')
  async pushVouchersToSfdc(
    @User() user: any,
    @Body()
    dto: { campaignId: number; voucherId?: number; pushConverted?: boolean },
  ) {
    return this.eoiManagementService.pushVouchersToSfdc(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post('/create-source-change-request')
  createVoucherChangeRequest(
    @User() user: any,
    @Body() dto: CreateVoucherChangeRequestDto,
  ): Promise<any> {
    return this.eoiManagementService.createVoucherChangeRequest(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get('/get-voucher-by-prid')
  getVoucherByPrid(@Query() query: GetVoucherByPridDto): Promise<any> {
    return this.eoiManagementService.getVoucherByPrid(query);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
  )
  @ExposeFields('createdAt')
  @Get('/get-source-change-request')
  getVoucherChangeRequest(
    @Query() dto: GetVoucherChangeRequestDto,
  ): Promise<any> {
    return this.eoiManagementService.getVoucherChangeRequest(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
  )
  @Get('/list-source-change-requests')
  listVoucherChangeRequests(@Query() dto: CommonFindAllQueryDto): Promise<any> {
    return this.eoiManagementService.listVoucherChangeRequests(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.MIS, RolesEnum.BIS)
  @Patch('/approve-change-source-request')
  approveVoucherChangeRequest(
    @User() user: any,
    @Body() dto: ApproveVoucherChangeRequestDto,
  ): Promise<any> {
    return this.eoiManagementService.approveVoucherChangeRequest(user, dto);
  }

  @UseGuards(RmAdminAuthGuard)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'vouchers'))
  @Post('/update-sfdc-ids')
  updateSfdcIds(
    @User() user: any,
    @Body() updateSfdcIdsDto: UpdateSfdcIdsDto,
  ): Promise<any> {
    return this.eoiManagementService.updateSfdcIds(user, updateSfdcIdsDto);
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Post('/upload-receipt/:paymentId')
  async uploadReceipt(
    @Param('paymentId') paymentId: number,
    @Body() uploadReceiptDto: UploadReceiptDto,
  ): Promise<any> {
    return this.eoiManagementService.uploadReceipt(paymentId, uploadReceiptDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('/mapped-transactions/:voucherId')
  async getMappedTransactions(@Param('voucherId') voucherId: number) {
    return this.eoiManagementService.getMappedTransactionsByVoucher(voucherId);
  }
}
