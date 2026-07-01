import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { SiteVisitCrudService } from './site_visit.service';
import { CreateSiteVisitFormDto } from './dto/create-site-visit.dto';
import { UpdateSiteVisitFormDto } from './dto/update-site-visit.dto';
import { GRESiteVisitFormDto } from './dto/GRE-visit.dto';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { User } from '../sso/decorators/user.decorator';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { FilterVisitListDto } from './dto/filter-visit-list.dto';
import { CustomerDetailsDto } from './dto/customer-details.dto';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
@Controller('site-visit-form')
export class SiteVisitCrudController {
  constructor(
    private readonly siteVisitFormService: SiteVisitCrudService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'site_visit_form'),
  )
  async createForm(
    @Body() dto: CreateSiteVisitFormDto,
    @Req() req: Request,
  ): Promise<object> {
    const fullUrl = `${req.get('origin')}/${dto?.projectName?.trim()?.toLowerCase()?.replaceAll(/\s+/g, '-')}`;

    await this.siteVisitFormService.create(dto, fullUrl);
    return { message: 'Visit created And mapped successfully.' };
  }

  @Patch('update')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'site_visit_form'),
  )
  async updateForm(
    @Query('id') id: number,
    @Body() dto: Partial<CreateSiteVisitFormDto>,
  ): Promise<object> {
    await this.siteVisitFormService.update(id, dto);
    return { message: 'Visit details updated successfully.' };
  }

  @Patch('updateVisitCount')
  async updateVisitCount(
    @Query('id') id: number,
    @Body() dto: Partial<UpdateSiteVisitFormDto>,
  ): Promise<object> {
    await this.siteVisitFormService.updateVisitCount(id, dto);
    return { message: 'Visit details updated successfully.' };
  }

  @Get('list')
  async listForms(
    @Query('mobile') mobile: string,
    @Query('ProjectName') ProjectName: string,
    @Query('sourcingRmName') sourcingRmName: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ): Promise<object> {
    const forms = await this.siteVisitFormService.findAll({
      mobile,
      ProjectName,
      sourcingRmName,
      fromDate,
      toDate,
    });
    return forms;
  }

  @Get('get')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.GRE)
  @ExposeFields('createdAt')
  async getVisitId(@Query('id') id: number): Promise<object> {
    return await this.siteVisitFormService.findOne(id);
  }

  @Get('get-site-form-dropdown')
  async getFormDropdown(
    @Query('name') name: string,
    @Req() req: Request,
  ): Promise<object> {
    const isGreOrigin = req
      .get('origin')
      .includes(this.configService.get<string>('SV_PORTAL_URL'));
    return await this.siteVisitFormService.getDropDown(name, isGreOrigin);
  }

  @Patch('updateForm')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.GRE)
  async updateGREForm(
    @Query('id') id: number,
    @Body() dto: Partial<GRESiteVisitFormDto>,
  ): Promise<object> {
    await this.siteVisitFormService.updateGREVisit(id, dto);
    return { message: 'Enquiry details updated successfully.' };
  }

  @Patch('updateForm/customer-details')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.GRE)
  async updateCustomerDetails(
    @Query('id') id: number,
    @Body() dto: CustomerDetailsDto,
  ): Promise<object> {
    await this.siteVisitFormService.updateCustomerDetails(id, dto);
    return { message: 'Enquiry details updated successfully.' };
  }

  @Get('visit-list')
  @ExposeFields('createdAt')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.GRE)
  async GREVisitList(
    @User() user: { dbId: number; email: string },
    @Query() filters?: FilterVisitListDto,
  ): Promise<object> {
    return await this.siteVisitFormService.getGREVisitList(
      user.dbId,
      user.email,
      filters,
    );
  }

  @Get('is-mark-revisit')
  async getIsMarkRevisitByEnquiry(
    @Query('enquiryId') enquiryId: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: { enquiryId: number; isMarkRevisit: 0 | 1 };
  }> {
    const isMarkRevisit =
      await this.siteVisitFormService.computeIsMarkRevisitByEnquiry(enquiryId);
    return {
      statusCode: 200,
      message: 'isMarkRevisit computed',
      data: { enquiryId: enquiryId, isMarkRevisit },
    };
  }
}
