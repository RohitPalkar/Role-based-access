import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BookingDocumentsDto } from './dto/booking_documents.dto';
import { BookingDocumentsService } from './booking_documents.service';

import { BookingStageEnum } from '../../enums/booking-documents.enum';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { OppAccessGuard } from '../sso/gaurds/opp-access.gaurd';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { User } from '../sso/decorators/user.decorator';

@Controller('booking-documents')
export class BookingDocumentsController {
  constructor(
    private readonly bookingDocumentsService: BookingDocumentsService,
  ) {}

  @UseInterceptors(UserActivityInterceptor('CREATE', 'booking_document'))
  @UseGuards(RmAdminAuthGuard)
  @Post('/create')
  async createDocument(
    @Body() bookingDocumentsDto: BookingDocumentsDto,
    @User() user: any,
  ): Promise<any> {
    return this.bookingDocumentsService.createDocument(
      bookingDocumentsDto,
      user,
    );
  }

  @UseInterceptors(UserActivityInterceptor('DELETE', 'booking_document'))
  @UseGuards(RmAdminAuthGuard)
  @Post('/delete')
  async deleteDocument(@Body('documentId') documentId: number): Promise<any> {
    return this.bookingDocumentsService.deleteDocument(documentId);
  }

  @UseGuards(RmAdminAuthGuard, OppAccessGuard)
  @Get('/list/:oppId')
  async getDocuments(
    @Param('oppId') oppId: string,
    @Query('type') type: string,
    @Query('stage') stage: string,
  ): Promise<any> {
    return this.bookingDocumentsService.getDocuments(oppId, type, stage);
  }

  @UseGuards(RmAdminAuthGuard)
  @Get('voucher/list/:voucherId')
  async getVoucherDocuments(
    @Param('voucherId') voucherId: number,
    @Query('type') type: string,
    @Query('stage') stage: string,
  ): Promise<any> {
    return this.bookingDocumentsService.getDocuments(voucherId, type, stage);
  }

  @Get('/pre-booking/:oppId')
  async bookingDocuments(@Param('oppId') oppId: string): Promise<any> {
    const type = BookingStageEnum.PRE_BOOKING;
    return this.bookingDocumentsService.getDocuments(oppId, type, type);
  }
}
