import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SiteVisitLogInService } from './site_visit_logIn.service';
import { CheckRequestDto, SendOtpDto, VerifyOtpDto } from './dto/login.dto';
import { logger } from 'src/logger/logger';
import { OtpThrottleGuard } from 'src/guards/otp-throttle.guard';

@Controller()
export class SiteVisitLogInController {
  constructor(private readonly service: SiteVisitLogInService) {}

  @Get('projects-by-brand')
  async getProjectsByBrand(
    @Query('brandName') brandName?: string,
    @Query('userId') userId?: string,
  ) {
    logger.info(`API projects-by-brand initiated`);
    if (userId && brandName)
      throw new BadRequestException('Provide either Brand Name or userid');

    return this.service.getProjectsByBrand(brandName, userId);
  }

  @Post('site-visit/customer/check')
  async check(@Body() dto: CheckRequestDto) {
    logger.info(`API site-visit/customer/check initiated`);
    return await this.service.checkOrStartFlow(dto);
  }

  @Post('site-visit/verify-otp')
  @UseGuards(OtpThrottleGuard)
  async verify(@Body() dto: VerifyOtpDto) {
    logger.info(`API site-visit/verify-otp initiated`);
    return await this.service.verifyOtp(dto);
  }

  @Put('site-visit/resend-otp')
  @UseGuards(OtpThrottleGuard)
  async resendOtp(@Body() dto: SendOtpDto) {
    logger.info(`API site-visit/resend-otp initiated`);
    const { mobile, projectInterested, brand } = dto;
    if (!mobile || !projectInterested)
      throw new BadRequestException('mobile & projectInterested required');
    await this.service.sendOtp(mobile, projectInterested, brand);
    return {
      statusCode: 200,
      message: 'OTP resent successfully',
    };
  }

  @Put('site-visit/send-otp')
  @UseGuards(OtpThrottleGuard)
  async sendOtp(@Body() dto: SendOtpDto) {
    logger.info(`API site-visit/send-otp initiated`);
    const { mobile, projectInterested, brand } = dto;
    await this.service.sendOtp(mobile, projectInterested, brand);
    return { statusCode: 200, message: 'OTP sent to mobile. Please verify.' };
  }
}
