import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { InventoryUnitService } from './inventory-unit.service';
import { InventoryListDto } from './dto/list-inventory.dto';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../sso/decorators/roles.decorator';
import { UpdateInventoryUnitDto } from './dto/update-inventory.dto';
import { InventoryDropdownsDto } from './dto/inventory-dropdowns.dto';
import { User } from '../sso/decorators/user.decorator';
import { InventoryUnitFileDto } from './dto/inventory_unit_file.dto';
import { BlockInventoryUnitDto } from './dto/block-inventory-unit.dto';
import {
  ApprovalRequestListDto,
  RejectBlockingDto,
  ApproveBlockingDto,
} from './dto/approval-request.dto';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { UpdateMappingPaymentDto } from './dto/update-payment.dto';
import { EmailActionsEnum } from 'src/enums/eoi-form.enums';

@Controller('inventory-unit')
export class InventoryUnitController {
  constructor(private readonly inventoryUnitService: InventoryUnitService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.RM,
    RolesEnum.BIS,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @Get('list')
  async getInventoryList(
    @User() user: any,
    @Query() queryDto: InventoryListDto,
  ): Promise<any> {
    return this.inventoryUnitService.getInventoryList(user, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.MIS,
    RolesEnum.RM,
    RolesEnum.BIS,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Get('dropdowns')
  async getInventoryDropdowns(
    @Query() queryDto: InventoryDropdownsDto,
  ): Promise<any> {
    return this.inventoryUnitService.getInventoryDropdowns(queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS, RolesEnum.BIS)
  @Patch(':id')
  async updateInventoryUnit(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryUnitDto,
  ): Promise<any> {
    return this.inventoryUnitService.updateInventoryUnit(id, updateDto);
  }

  @Get('sample-excel')
  async sampleExcel() {
    return this.inventoryUnitService.sampleExcel();
  }

  @Post('bulk-insert')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.MIS, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  async bulkInsert(
    @User() user: any,
    @Body() inventoryUnitDto: InventoryUnitFileDto,
  ) {
    return await this.inventoryUnitService.bulkInsert(user, inventoryUnitDto);
  }

  @Get('approval-requests')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN,
    RolesEnum.SALES_BH,
    RolesEnum.SALES_RSH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.MIS,
    RolesEnum.RM,
  )
  async getApprovalRequests(
    @Query() queryDto: ApprovalRequestListDto,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.getApprovalRequests(queryDto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN,
    RolesEnum.SALES_BH,
    RolesEnum.SALES_RSH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.MIS,
  )
  @UseInterceptors(
    UserActivityInterceptor(
      UserActionsEnum.UNIT_APPROVED,
      'voucher_unit_blockings',
    ),
  )
  @Patch('approve-blocking/:id')
  async approveBlockingRequest(
    @Param('id') id: string,
    @Body() dto: ApproveBlockingDto,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.approveBlockingRequest(id, dto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN,
    RolesEnum.SALES_BH,
    RolesEnum.SALES_RSH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.MIS,
  )
  @UseInterceptors(
    UserActivityInterceptor(
      UserActionsEnum.UNIT_REJECTED,
      'voucher_unit_blockings',
    ),
  )
  @Patch('reject-blocking/:id')
  async rejectBlockingRequest(
    @Param('id') id: string,
    @Body() dto: RejectBlockingDto,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.rejectBlockingRequest(id, dto, user);
  }

  /**
   * `GET /inventory-unit/:id`
   *
   * Single-row detail from `project_inventory_units` (with campaign name).
   * Registered after static GET paths so literals like `sample-excel` are not captured as ids.
   */
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN,
    RolesEnum.MIS,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_BH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @ExposeFields('createdAt')
  @Get('/details/:id')
  async getInventoryUnitById(@Param('id') id: string): Promise<any> {
    return this.inventoryUnitService.getInventoryUnitById(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.MIS, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('/export/inventory-list')
  async exportAgreementListing(
    @User() user: any,
    @Query() queryDto: InventoryListDto,
  ): Promise<any> {
    return this.inventoryUnitService.exportInventory(user, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(
    UserActivityInterceptor(
      UserActionsEnum.UNIT_BLOCKED,
      'voucher_unit_blockings',
    ),
  )
  @Post('block-inventory-unit')
  async voucherUnitBlocking(
    @Body() dto: BlockInventoryUnitDto,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.blockInventoryUnit(dto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @Post('update-mapping-payment')
  async updatePaymentForUnitMapping(
    @Body() dto: UpdateMappingPaymentDto,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.updatePaymentForUnitMapping(dto, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.SUPER_ADMIN,
    RolesEnum.ADMIN,
    RolesEnum.SALES_BH,
    RolesEnum.SALES_RSH,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.MIS,
    RolesEnum.RM,
  )
  @Patch('release-unit/:id')
  @UseInterceptors(
    UserActivityInterceptor(
      UserActionsEnum.UNIT_RELEASED,
      'voucher_unit_blockings',
    ),
  )
  async releaseBlockingRequest(
    @Param('id') id: string,
    @User() user: any,
  ): Promise<any> {
    return this.inventoryUnitService.releaseBlockingRequest(id, user);
  }

  @Get('blocking-action')
  async handleEmailLinkAction(@Query('token') token: string, @Res() res: any) {
    const baseUrl = `${process.env.PURAVANKARA_BASE_URL}/unit-approval`;
    try {
      if (!token) {
        return res.redirect(`${baseUrl}?status=error`);
      }
      const result =
        await this.inventoryUnitService.verifyTokenAndProcessAction(token);
      const action = result?.data?.action;
      const redirectUrl = `${baseUrl}?status=${action === EmailActionsEnum.APPROVE ? EmailActionsEnum.APPROVE : EmailActionsEnum.REJECT}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      return res.redirect(`${baseUrl}?status=error`);
    }
  }
}
