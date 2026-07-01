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
import { EoiCampaignService } from './eoi_campaign.service';
import { CreateEoiCampaignDto } from './dto/create-eoi-campaign.dto';
import {
  CampaignDetailsDto,
  ListCampaignBankDetailsDto,
  ListCampaignsQueryDto,
} from './dto/campaign-list.dto';
import { GetEoiCampaignsMasterDto } from './dto/get-eoi-campaigns-master.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { User } from '../../sso/decorators/user.decorator';
import { SendEOIBankDetailEmailDto } from './dto/sendEOIBankDetailsEmail.dto';
import { UserActionsEnum } from 'src/enums/event-messages.enum';

@Controller('eoi-campaign')
export class EoiCampaignController {
  constructor(private readonly eoiCampaignService: EoiCampaignService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'eoi_campaign'),
  )
  @Post('/create')
  createEoiCampaign(
    @Body() createEoiCampaignDto: CreateEoiCampaignDto,
  ): Promise<any> {
    return this.eoiCampaignService.createEoiCampaign(createEoiCampaignDto);
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
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.BIS,
  )
  @Get('/master')
  getEoiCampaignsMaster(
    @Query() dto: GetEoiCampaignsMasterDto,
    @User() user: any,
  ): Promise<any> {
    return this.eoiCampaignService.getEoiCampaignsMaster(
      user,
      dto.showAll ?? false,
      dto.showBuddyCampaigns ?? false,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  @Post('/list')
  async list(@Body() dto: ListCampaignsQueryDto) {
    return this.eoiCampaignService.listCampaigns(dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  @Get('eoi-development-types')
  async getAllDevelopmentTypes() {
    return this.eoiCampaignService.getAllDevelopmentTypes();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  @Get('eoi-inventory-types')
  async getInventories(@Query('departmentIds') departmentIds?: string) {
    return this.eoiCampaignService.getInventories(departmentIds);
  }

  @Get('campaign-details/:id')
  async getById(
    @Param('id') id: number,
  ): Promise<{ data: CampaignDetailsDto }> {
    return this.eoiCampaignService.getById(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'eoi_campaign'),
  )
  @Patch('/update')
  updateEoiCampaign(
    @Query('id') id: number,
    @Body() createEoiCampaignDto: CreateEoiCampaignDto,
  ): Promise<any> {
    return this.eoiCampaignService.updateEoiCampaign(id, createEoiCampaignDto);
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @Get('bank-details/list')
  async getCampaignBankDetails(@Query() dto: ListCampaignBankDetailsDto) {
    return this.eoiCampaignService.listCampaignBankDetails(dto);
  }
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.BANK_DETAIL_EMAIL, 'eoi_campaign'),
  )
  @Post('/send-bank-detail-email')
  async sendFormEmail(
    @User() user: any,
    @Body() body: SendEOIBankDetailEmailDto,
  ): Promise<any> {
    const { campaignId, emailIds } = body;
    return this.eoiCampaignService.sendEOIBankDetailEmail(
      user,
      campaignId,
      emailIds,
    );
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.DELETED, 'eoi_campaign'),
  )
  @Delete('/:id')
  async deleteEoiCampaign(
    @Param('id') id: number,
    @User() user: any,
  ): Promise<any> {
    return this.eoiCampaignService.deleteEoiCampaign(id, user);
  }
}
