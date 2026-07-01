import {
  Body,
  Controller,
  Patch,
  Param,
  Post,
  Get,
  BadRequestException,
  Render,
  Query,
} from '@nestjs/common';
import { VoucherFormsService } from './voucher_form.service';
import { EoiManagementService } from '../../eoi_manager/eoi_management/eoi_management.service';
import {
  ApplicantDto,
  EoiDetailsDto,
  PaymentDetailsDto,
  ThirdFourthApplicantDto,
  EnableEditFormDto,
  SendOtpDto,
  VerifyOtpDto,
  DeletePaymentsDto,
} from './dto/update-voucher-form.dto';
import { CreateCpVoucherFormDto } from './dto/create-cp-voucher-form.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { SkipResponseInterceptor } from 'src/interceptors/decorators/skip-response-interceptor.decorator';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';

@Controller('vouchers')
export class VoucherFormsController {
  constructor(
    private readonly voucherFormsService: VoucherFormsService,
    private readonly eoiManagementService: EoiManagementService,
  ) {}

  @Get('/get-voucher-form/:voucherId')
  @ExposeFields('createdAt')
  getVoucherFormById(@Param('voucherId') voucherId: string): Promise<any> {
    return this.voucherFormsService.getVoucherFormByVoucherId(voucherId);
  }

  @Patch('/update-applicant/:voucherId')
  updateApplicant(
    @Param('voucherId') voucherId: string,
    @Body() applicantDto: ApplicantDto | ThirdFourthApplicantDto,
  ): Promise<any> {
    return this.voucherFormsService.updateVoucherFormApplicant(
      voucherId,
      applicantDto,
    );
  }

  @Patch('/update-eoi-details/:voucherId')
  updateEoiDetails(
    @Param('voucherId') voucherId: string,
    @Body() eoiDetailsDto: EoiDetailsDto,
  ): Promise<any> {
    return this.voucherFormsService.updateEoiDetails(voucherId, eoiDetailsDto);
  }

  @Patch('/update-payment-details/:voucherId')
  updatePaymentDetails(
    @Param('voucherId') voucherId: string,
    @Body() paymentDetailsDto: PaymentDetailsDto,
  ): Promise<any> {
    return this.voucherFormsService.updatePaymentDetails(
      voucherId,
      paymentDetailsDto,
    );
  }

  @Post('/delete-payment-details')
  deletePaymentDetails(
    @Body() deletePaymentsDto: DeletePaymentsDto,
  ): Promise<any> {
    return this.voucherFormsService.deletePaymentDetails(deletePaymentsDto);
  }

  @Post('/reset-voucher-form/:voucherId')
  resetVoucherForm(@Param('voucherId') voucherId: string): Promise<any> {
    return this.voucherFormsService.resetVoucherForm(voucherId);
  }

  @Patch('/delete-applicant-details/:voucherId')
  deleteApplicantDetails(
    @Param('voucherId') voucherId: string,
    @Body('applicantNumber') applicantNumber: number,
  ): Promise<any> {
    return this.voucherFormsService.deleteApplicantDetails(
      voucherId,
      applicantNumber,
    );
  }

  @Post('/create-cp-voucher-form')
  createCpVoucherForm(
    @Body() createVoucherFormDto: CreateCpVoucherFormDto,
  ): Promise<any> {
    return this.eoiManagementService.createVoucherForm(createVoucherFormDto);
  }

  @Post('/buy-new-voucher')
  buyNewVoucher(@Body('voucherId') voucherId: number): Promise<any> {
    if (!voucherId || voucherId <= 0) {
      throw new BadRequestException('Invalid voucher ID');
    }
    return this.eoiManagementService.buyNewVoucher(voucherId);
  }

  @Patch('/enable-edit-form/:voucherId')
  enableEditForm(
    @Param('voucherId') voucherId: string,
    @Body() enableEditFormDto: EnableEditFormDto,
  ): Promise<any> {
    return this.voucherFormsService.enableEditForm(
      voucherId,
      enableEditFormDto.voucherStatus,
      enableEditFormDto.lastStep,
    );
  }

  @Post('/send-otp')
  sendOtp(@Body() sendOtpDto: SendOtpDto): Promise<any> {
    return this.voucherFormsService.sendOtp(sendOtpDto.voucherId);
  }

  @Post('/verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<any> {
    return this.voucherFormsService.verifyOtp(
      verifyOtpDto.voucherId,
      verifyOtpDto.otp,
    );
  }

  @Post('/resend-otp')
  resendOtp(@Body() sendOtpDto: SendOtpDto): Promise<any> {
    return this.voucherFormsService.resendOtp(sendOtpDto.voucherId);
  }

  @Post('/request-cancellation')
  requestCancellation(
    @Body() requestCancellationDto: RequestCancellationDto,
  ): Promise<any> {
    return this.voucherFormsService.requestCancellation(requestCancellationDto);
  }

  @Get('my-voucher-list/:voucherId')
  async getRelatedVouchers(
    @Param('voucherId') voucherId: string,
  ): Promise<any> {
    return await this.voucherFormsService.myVoucherslisting(voucherId);
  }

  @Get('/voucher-preview/:voucherId')
  @SkipResponseInterceptor()
  @Render('vouchers/voucher-form-preview')
  async renderBookingPreview(
    @Param('voucherId') voucherId: string,
    @Query('hideEmailMobile') hideEmailMobile?: boolean,
    @Query('skipMasking') skipMasking?: boolean, //skip masking for RM
    @Query('maskApplicantEmailMobile') maskApplicantEmailMobile?: boolean, //skip masking for RM
  ) {
    return this.voucherFormsService.renderVoucherPreview(
      voucherId,
      hideEmailMobile,
      skipMasking,
      maskApplicantEmailMobile,
    );
  }

  @Get('/download-pdf/:voucherId')
  async downloadPdf(@Param('voucherId') voucherId: string) {
    return this.voucherFormsService.downloadVoucherFormPDF(voucherId);
  }

  @Get('/get-voucher-applicants/:opportunityId')
  async getVoucherApplicants(@Param('opportunityId') opportunityId: string) {
    return this.voucherFormsService.getVoucherApplicants(opportunityId);
  }
}
