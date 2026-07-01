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
import { SlotService } from './slot.service';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import {
  ListSlotsDto,
  MoveVoucherToSlotDto,
  SlotDropdownDto,
  UpdateSlotStatusDto,
} from './dto/list-slot.dto';
import { AddBatchSlotsDto, UpdateBatchSlotDto } from './dto/add-slot.dto';
import { User } from 'src/modules/sso/decorators/user.decorator';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { AllocationService } from './allocation.service';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import {
  ListViewRecordsDto,
  ReceptionCheckInDto,
  ReceptionOtpDto,
} from './dto/reception-desk.dto';

@Controller('batch-slots')
export class SlotController {
  constructor(
    private readonly slotService: SlotService,
    private readonly allocationService: AllocationService,
  ) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
    RolesEnum.SALES_RSH,
    RolesEnum.CRM,
    RolesEnum.GRE,
  )
  @Get('list')
  async listBatches(@Query() queryDto: ListSlotsDto): Promise<any> {
    return this.slotService.listSlots(queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'eoi_batch_slots'),
  )
  @Post('add')
  async addSlot(
    @User() user: any,
    @Body() dto: AddBatchSlotsDto,
  ): Promise<any> {
    return this.slotService.addSlots(user, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'eoi_batch_slots'),
  )
  @Patch('update/:slotId')
  async updateSlotEndTime(
    @Param('slotId') slotId: string,
    @Body() dto: UpdateBatchSlotDto,
  ): Promise<any> {
    return this.slotService.updateSlot(slotId, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.DELETED, 'eoi_batch_slots'),
  )
  @Delete('delete/:slotId')
  async deleteBatch(
    @User() user: any,
    @Param('slotId') slotId: string,
  ): Promise<any> {
    return await this.slotService.deleteSlot(user, slotId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get('dropdown/:batchId')
  async getSlotDropdown(
    @Param('batchId') batchId: string,
    @Query() queryDto: SlotDropdownDto,
  ) {
    return this.slotService.getSlotDropdown(batchId, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'eoi_batch_slots'),
  )
  @Patch('update-status/:slotId')
  async updateSlotStatus(
    @Param('slotId') slotId: string,

    @Body() body: UpdateSlotStatusDto,
    @User() user: any,
  ) {
    return this.slotService.updateSlotStatus(slotId, body, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
    RolesEnum.SALES_RSH,
    RolesEnum.CRM,
    RolesEnum.GRE,
  )
  @Get('statistics/:batchId')
  async getSlotStatistics(@Param('batchId') batchId: string): Promise<any> {
    return this.slotService.getSlotStatistics(batchId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'eoi_batch_vouchers'),
  )
  @Patch('move-user/:MappedvoucherId')
  async moveVoucherToAnotherSlot(
    @Param('MappedvoucherId') MappedvoucherId: string,
    @Body() dto: MoveVoucherToSlotDto,
    @User() user: any,
  ) {
    return this.allocationService.moveVoucherToAnotherSlot(
      MappedvoucherId,
      dto,
      user,
    );
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
    RolesEnum.SALES_RSH,
    RolesEnum.CRM,
    RolesEnum.GRE,
  )
  @Get('vouchers/:slotId')
  async getBatchVouchers(
    @Param('slotId') slotId: string,
    @Query() query: CommonFindAllQueryDto,
  ) {
    return await this.allocationService.getBatchVouchers(slotId, query);
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.BIS,
    RolesEnum.SALES_RSH,
    RolesEnum.CRM,
    RolesEnum.GRE,
  )
  @Get('export')
  async exportSlotsExcel(@Query() queryDto: ListSlotsDto) {
    return this.slotService.exportSlotsExcel(queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @Get('reception-desk-records')
  async listViewRecords(@Query() queryDto: ListViewRecordsDto) {
    return this.slotService.listViewRecords(queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @Get('reception-desk-dashboard/:batchId')
  async getReceptionDashboard(@Param('batchId') batchId: string) {
    return this.slotService.getReceptionDashboard(batchId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @Post('send-checkin-otp')
  async sendReceptionOtp(@Body() dto: ReceptionOtpDto, @User() user: any) {
    return this.slotService.sendReceptionOtp(dto.batchVoucherId, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @Post('resend-checkin-otp')
  async resendReceptionOtp(@Body() dto: ReceptionOtpDto, @User() user: any) {
    return this.slotService.resendReceptionOtp(dto.batchVoucherId, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @UseInterceptors(
    UserActivityInterceptor(
      UserActionsEnum.RECEPTION_CHECK_IN,
      'eoi_batch_vouchers',
    ),
  )
  @Post('attendance-check-in')
  async markAttendance(@Body() dto: ReceptionCheckInDto, @User() user: any) {
    return this.slotService.markAttendance(dto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.GRE)
  @Get('reception-desk/attendance/:batchVoucherId')
  async getAttendanceDetail(@Param('batchVoucherId') batchVoucherId: string) {
    return this.slotService.getAttendanceDetail(batchVoucherId);
  }
}
