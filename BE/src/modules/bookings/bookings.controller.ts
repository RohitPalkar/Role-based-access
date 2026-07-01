import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Render,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';
import {
  AgreedOnTermsDto,
  BookingApplicantDto,
  DeleteBookingPaymentsDto,
  DocumentReviewDto,
  OtherDetailsDto,
  PaymentDetailsDto,
  ResendNotificationsDto,
  SubmitApplicationDto,
  UnitDetailsDto,
} from './dto/update-booking.dto';
import { AxiosResponse } from 'axios';
import { LeegalityService } from '../leegality/leegality.service';
import { UpdateBookingImagesDto } from './dto/update-booking-images.dto';
import { RatingFeedbackDto } from './dto/rating-feedback.dto';
import { SkipResponseInterceptor } from 'src/interceptors/decorators/skip-response-interceptor.decorator';
import { ReferrerDto } from './dto/update-referrer.dto';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { UpdateCompanyDocumentsDto } from './dto/update-company-documents.dto';
import {
  UpdateSignatoryDto,
  DeleteAuthorisedSignatoryDto,
} from './dto/update-corporate-applicant.dto';
import { UpdateCompanyDetailsDto } from './dto/update-company-details.dto';
import { OpportunityIdDto } from './dto/opportunity-id.dto';
import { ApplicantMappingDto } from './dto/applicant-mapping.dto';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from 'src/interceptors/decorators/skip-encryption.decorator';
import { MapVoucherApplicantsDto } from './dto/map-voucher-applicants.dto';
import { PushApplicantDataDto } from './dto/push-applicant-data.dto';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly leegalityService: LeegalityService,
  ) {}

  @Get('/get-masters')
  getBookingFormMasters(): Promise<AxiosResponse<any>> {
    return this.bookingsService.getBookingFormMasters();
  }

  @Get('/get-booking/:oppId')
  @ExposeFields('createdAt')
  getBookingByOppId(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getBookingByOppId(oppId, true);
  }

  @Get('/get-booking-pdf/:oppId')
  getBookingPDF(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getBookingPDF(oppId);
  }

  //TO get opportunity details from sfdc API
  @Get('/get-opportunity-details/:oppId')
  getOppDetailById(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getOpportunityDetailById(oppId);
  }

  /**
   * Creates a new booking.
   * Supports both Individual and Corporate/Partnership flows.
   */
  @Post('create-booking')
  createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }

  @Patch('/update-applicant')
  updateApplicant(@Body() dto: BookingApplicantDto) {
    return this.bookingsService.updateBookingApplicant(dto.opportunityId, dto);
  }

  @Patch('/update-other-details/:oppId')
  updateOtherDetails(
    @Param('oppId') oppId: string,
    @Body() otherDetails: OtherDetailsDto,
  ): Promise<Booking> {
    return this.bookingsService.updateOtherDetails(oppId, otherDetails);
  }

  @Patch('/update-unit-details')
  updateUnitDetails(@Body() unitDetails: UnitDetailsDto): Promise<Booking> {
    return this.bookingsService.updateUnitDetails(unitDetails);
  }

  @Patch('/update-payment-details')
  updatePaymentDetails(
    @Body() paymentDetails: PaymentDetailsDto,
  ): Promise<Booking> {
    return this.bookingsService.updatePaymentDetails(paymentDetails);
  }

  @Patch('/update-document-comment')
  updateDocumentComment(
    @Body() documentReview: DocumentReviewDto,
  ): Promise<Booking> {
    return this.bookingsService.updateDocumentComment(documentReview);
  }

  @Patch('/agreed-on-terms')
  agreedOnTerms(@Body() termsDetails: AgreedOnTermsDto): Promise<Booking> {
    return this.bookingsService.agreedOnTerms(termsDetails);
  }

  @Patch('/submit-for-signature')
  submitForSignature(
    @Body() submitDetails: SubmitApplicationDto,
  ): Promise<Booking> {
    return this.bookingsService.submitForSignature(submitDetails);
  }

  @Patch('/update-referrer-data/:oppId')
  updateReferrerData(
    @Param('oppId') oppId: string,
    @Body() referrerDetails: ReferrerDto,
  ): Promise<Booking> {
    return this.bookingsService.updateReferrerData(oppId, referrerDetails);
  }

  @Post('/activate-invitation')
  async activateInvitation(@Body('signUrl') signUrl: string): Promise<any> {
    const res = await this.leegalityService.activateInvitation(signUrl);
    return res;
  }

  @Post('/resend-notification')
  async resendNotifications(
    @Body() resendNotificationsDetails: ResendNotificationsDto,
  ): Promise<any> {
    const { opportunityId, signUrls, bookingAs } = resendNotificationsDetails;
    const isRedirectable = await this.bookingsService.updateSignLaterStatus(
      opportunityId,
      signUrls,
      bookingAs,
    );
    const res = await this.leegalityService.resendNotifications(signUrls);
    res.data.isRedirectable = isRedirectable;
    return res;
  }

  @Post('/update-images')
  async updateBookingImages(
    @Body() updateBookingImagesDto: UpdateBookingImagesDto,
  ): Promise<any> {
    const { opportunityId, path, images } = updateBookingImagesDto;
    const res = await this.bookingsService.updateBookingImages(
      opportunityId,
      path,
      images,
    );
    return res;
  }

  @Post('/booking-status-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleWebhook(@Body() webhookData: any): Promise<void> {
    return this.bookingsService.handleWebhook(webhookData);
  }
  @Post('/referrer-sign-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async referrerWebhook(@Body() webhookData: any): Promise<void> {
    return this.bookingsService.referrerWebhook(webhookData);
  }

  @Post('/save-rating-feedback')
  async saveBookingFeedback(
    @Body() ratingFeedbackDto: RatingFeedbackDto,
  ): Promise<string> {
    return this.bookingsService.saveBookingFeedback(ratingFeedbackDto);
  }

  @Post('/delete-booking')
  async deleteBooking(
    @Body() opportunityIdDto: OpportunityIdDto,
  ): Promise<void> {
    return this.bookingsService.deleteBooking(opportunityIdDto.opportunityId);
  }

  @Post('/update-referrer-details/:oppId')
  async updateReferrer(
    @Param('oppId') oppId: string,
    @Body() referrerDto: ReferrerDto,
  ): Promise<ReferrerDto> {
    return this.bookingsService.updateReferrer(oppId, referrerDto, true);
  }

  //This is to create pdf creation
  @Get('/booking-preview/:oppId')
  @SkipResponseInterceptor()
  @Render('bookings/booking-preview')
  async renderBookingPreview(
    @Param('oppId') oppId: string,
    @Query('applicantOnly') applicantOnly?: string,
  ) {
    return this.bookingsService.renderBookingPreview(
      oppId,
      applicantOnly === 'true',
    );
  }

  //This is to create pdf creation
  @Get('/referrer-preview/:oppId')
  @SkipResponseInterceptor()
  @Render('bookings/referrer-preview')
  async renderReferrerPreview(@Param('oppId') oppId: string) {
    return this.bookingsService.renderReferrerPreview(oppId);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('/download-pdf/:oppId/:isOffline?')
  async downloadPdf(
    @Param('oppId') oppId: string,
    @Param('isOffline') isOffline: boolean = false,
  ) {
    return this.bookingsService.downloadBookingPDF(oppId, isOffline);
  }

  @OnEvent(EventMessagesEnum.OPP_PUSH_TO_SFDC)
  async handleLogsCreatedEvent(data) {
    this.bookingsService.sendBookingToSFDCApi(
      data?.opportunityId,
      data?.isReset,
    );
  }

  // Updates company documents
  @Patch('company-documents')
  async updateCompanyDocuments(@Body() dto: UpdateCompanyDocumentsDto) {
    const { opportunityId } = dto;
    return await this.bookingsService.updateCompanyDocuments(
      opportunityId,
      dto,
    );
  }

  @Patch('update-company-details')
  updateCompanyDetails(@Body() dto: UpdateCompanyDetailsDto) {
    return this.bookingsService.updateCompanyDetails(dto);
  }

  // update Authorised Signatory details
  @Patch('update-signatory')
  updateAuthorisedSignatory(@Body() signatoryDto: UpdateSignatoryDto) {
    return this.bookingsService.updateAuthorisedSignatory(signatoryDto);
  }

  // delete applicant's signatory
  @Patch('delete-applicant')
  async deleteAuthorisedSignatory(
    @Body() dto: DeleteAuthorisedSignatoryDto,
  ): Promise<any> {
    const { opportunityId, applicantId } = dto;
    return this.bookingsService.deleteAuthorisedSignatory(
      opportunityId,
      applicantId,
    );
  }

  @Post('delete-payment-details')
  deletePaymentDetails(
    @Body() deletePaymentsDto: DeleteBookingPaymentsDto,
  ): Promise<any> {
    return this.bookingsService.deletePaymentDetails(deletePaymentsDto);
  }

  @Put('map-applicants')
  mapApplicants(@Body() mapApplicantsDto: ApplicantMappingDto): Promise<any> {
    return this.bookingsService.mapApplicants(mapApplicantsDto);
  }

  @Get('/get-booking-docs/:oppId')
  async getBookingDocs(@Param('oppId') oppId: string): Promise<any> {
    return this.bookingsService.getBookingDocs(oppId);
  }

  @Post('/map-voucher-applicants')
  async mapVoucherApplicants(@Body() dto: MapVoucherApplicantsDto) {
    return this.bookingsService.mapVoucherApplicants(dto);
  }

  //push applicant data to sfdc
  @Post('/push-applicant-data')
  async pushApplicantData(@Body() dto: PushApplicantDataDto) {
    return this.bookingsService.pushApplicantData(dto);
  }
}
