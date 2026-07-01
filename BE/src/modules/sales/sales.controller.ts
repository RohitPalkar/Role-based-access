import {
  Controller,
  Param,
  Body,
  Post,
  Get,
  Render,
  Query,
  UseGuards,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { OfficeUseMainDto } from './dto/office-use.dto';
import { PostBookingDto } from './dto/post-booking.dto';
import { SkipResponseInterceptor } from 'src/interceptors/decorators/skip-response-interceptor.decorator';
import { SUCCESS } from 'src/config/constants';
import { SfdcService } from '../sfdc/sfdc.service';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { User } from '../sso/decorators/user.decorator';
import { OppAccessGuard } from '../sso/gaurds/opp-access.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { PreBookingDto } from './dto/pre-booking.dto';
import { RolesEnum } from 'src/enums/roles.enum';
import { ResetBookingDto } from '../bookings/dto/update-booking.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { SendFormEmailDto } from './dto/send-form-email.dto';
import { SalesService } from './sales.service';
import { UnitSwappingDto } from './dto/unit-swapping.dto';
import { logger } from 'src/logger/logger';
import { AssignedOpportunitiesDto } from './dto/assigned-opportunities.dto';
import {
  GetGroupDetailsDto,
  CreateUpdateGroupDto,
  GetGroupInfoDto,
} from './dto/multi-booking.dto';
import { ManageApplicantsDto } from './dto/manage-applicant.dto';
import { SendGroupLinkDto } from './dto/send-group-link.dto';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
@Controller('sales')
export class SalesController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly salesService: SalesService,
    private readonly sfdcService: SfdcService,
  ) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard, OppAccessGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_RSH, RolesEnum.SALES_TL)
  @Get('/get-booking/:oppId')
  getBookingByOppId(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getBookingByOppId(oppId, true);
  }

  @UseGuards(RmAdminAuthGuard, OppAccessGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('/office-use/:oppId')
  async getOfficeUseByOppId(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getOfficeUseByOppId(oppId);
  }

  @UseGuards(RmAdminAuthGuard, OppAccessGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'booking_office_use'),
  )
  @Post('/office-use/:oppId')
  async updateOfficeUse(
    @User() user: any,
    @Param('oppId') oppId: string,
    @Body() officeUseMainDto: OfficeUseMainDto,
  ): Promise<any> {
    try {
      const { referrerDetails, officeUse, saveForLater } = officeUseMainDto;
      let referrerResp = null;
      if (referrerDetails && Object.keys(referrerDetails).length > 0) {
        referrerResp = await this.bookingsService.updateReferrer(
          oppId,
          referrerDetails,
        );
      }
      if (saveForLater) officeUse.saveForLater = true;
      const officeUseResp = await this.salesService.updateOfficeUse(
        user,
        oppId,
        officeUse,
      );

      return {
        statusCode: SUCCESS,
        message: 'Office use data updated successfully.',
        data: {
          id: officeUseResp?.data?.id,
          officeUse: officeUseResp?.data,
          referrerDetails: referrerResp?.data,
        },
      };
    } catch (error) {
      logger.error(
        `Error updating office use for opportunity ${oppId}: ${error.message}`,
        {
          error,
          oppId,
        },
      );
      throw error;
    }
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'bookings'))
  @Post('/submit-pre-booking/:oppId')
  async submitPreBooking(
    @User() user: any,
    @Param('oppId') oppId: string,
    @Body() preBookingDto: PreBookingDto,
  ): Promise<any> {
    return this.salesService.submitPreBooking(user, oppId, preBookingDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_RSH, RolesEnum.SALES_TL)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'bookings'))
  @Post('/reset-booking-form/:oppId')
  async resetBookingForm(
    @Param('oppId') oppId: string,
    @Body() resetBookingDto: ResetBookingDto,
  ): Promise<any> {
    return this.bookingsService.resetBookingForm(oppId, resetBookingDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_RSH, RolesEnum.SALES_TL)
  @Post('/reset-referrer-form/:oppId')
  async resetReferrerForm(
    @Param('oppId') oppId: string,
    @Body() resetBookingDto: ResetBookingDto,
  ): Promise<any> {
    return this.bookingsService.resetReferrerForm(oppId, resetBookingDto);
  }

  @UseGuards(RmAdminAuthGuard, OppAccessGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('/upload-signed-pdf/:oppId')
  async uploadSignPdf(
    @Param('oppId') oppId: string,
    @Body('signedPdf') signedPdf: string,
  ): Promise<{ statusCode: number; message: string; data: any }> {
    return this.salesService.uploadSignPdf(oppId, signedPdf);
  }

  @UseGuards(RmAdminAuthGuard, OppAccessGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('/update-booking/:oppId')
  async updatePostBooking(
    @Param('oppId') oppId: string,
    @Body() postBookingDto: PostBookingDto,
  ): Promise<{ statusCode: number; message: string; data: any }> {
    return this.salesService.updatePostBooking(oppId, postBookingDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_RSH, RolesEnum.SALES_TL, RolesEnum.BIS)
  @Get('/assigned-opportunities')
  async getAssignedOpportunities(
    @User() user: any,
    @Query() queryDto: AssignedOpportunitiesDto,
  ): Promise<any> {
    return this.bookingsService.getAssignedOpportunities(user, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('/cancelled-opportunities')
  async getCancelledOpportunities(
    @User() user: any,
    @Query() queryDto: CommonFindAllQueryDto,
  ): Promise<any> {
    return this.salesService.getCancelledOpportunities(user, queryDto);
  }

  //This is to create pdf creation
  @Get('/post-booking-preview/:oppId')
  @SkipResponseInterceptor()
  @Render('bookings/post-booking-preview')
  async renderPostBookingPreview(
    @Param('oppId') oppId: string,
    @Query('isOfficeUse') isOfficeUse?: boolean,
  ) {
    return this.bookingsService.renderPostBookingPreview(oppId, isOfficeUse);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.CRM,
    RolesEnum.BIS,
    RolesEnum.PROJECT_HEAD,
  )
  @Get('/get-opportunity-details/:oppId')
  async refreshOpportunity(@Param('oppId') oppId: string): Promise<boolean> {
    return this.bookingsService.getOpportunityDetailById(oppId, true);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.SALES_RSH, RolesEnum.SALES_TL)
  @Post('/send-form-email')
  async sendFormEmail(
    @User() user: any,
    @Body() body: SendFormEmailDto,
  ): Promise<any> {
    const { oppId, formType, emailIds } = body;
    return this.bookingsService.sendFormEmail(user, oppId, formType, emailIds);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('/unit-swapping')
  async unitSwapping(
    @User() user: any,
    @Body() body: UnitSwappingDto,
  ): Promise<any> {
    const { sourceOppId, targetOppId } = body;
    return this.salesService.unitSwapping(user, sourceOppId, targetOppId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('get-multi-booking-group')
  async listGroups(@User() user: any, @Query() query: CommonFindAllQueryDto) {
    return this.salesService.listGroups(query, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('get-group-info')
  async getGroupInfo(
    @User() user: any,
    @Query() dto: GetGroupInfoDto,
  ): Promise<any> {
    const { id, page, limit, search } = dto;
    return this.bookingsService.getMultiBookingGroup(
      id,
      page,
      limit,
      search,
      user,
    );
  }

  @Get('get-group-details')
  async getMultiBookingGroup(@Query() dto: GetGroupDetailsDto): Promise<any> {
    const { id, page, limit, search } = dto;
    return this.bookingsService.getMultiBookingGroup(id, page, limit, search);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('create-booking-group')
  async createBookingGroup(
    @User() user: any,
    @Body() body: CreateUpdateGroupDto,
  ) {
    return await this.salesService.createBookingGroup(body, user);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Patch('update-booking-group/:groupId')
  async updateBookingGroup(
    @Body() body: CreateUpdateGroupDto,
    @Param('groupId') groupId: string,
  ) {
    return await this.salesService.updateBookingGroup(groupId, body);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get('booking-applicants/:oppId')
  async getBookingApplicants(@Param('oppId') oppId: string) {
    return await this.salesService.getBookingApplicants(oppId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'bookings'))
  @Patch('manage-applicants/:oppId')
  async bookingsApplicantSwapping(
    @Body() body: ManageApplicantsDto,
    @Param('oppId') oppId: string,
  ) {
    return await this.salesService.manageApplicants(oppId, body);
  }

  @Get('get-group-applicants')
  async getGroupApplicants(@Query() dto: GetGroupDetailsDto) {
    return await this.salesService.getGroupApplicants(dto.id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('send-group-link')
  async sendGroupLink(@Body() dto: SendGroupLinkDto) {
    const { id, emailIds } = dto;
    return await this.salesService.sendGroupLink(id, emailIds);
  }

  // Download applicant PDF by opportunity ID
  @UseGuards(RmAdminAuthGuard)
  @Get('/applicant-pdf/:oppId')
  async downloadApplicantPdf(@Param('oppId') oppId: string) {
    return this.bookingsService.downloadApplicantPDF(oppId);
  }
}
