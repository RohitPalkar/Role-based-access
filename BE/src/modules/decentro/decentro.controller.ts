import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { DecentroService } from './decentro.service';
import { GenerateDigiLockerUrlDto } from './dto/generate-digilocker-url.dto';
import { GetGstDetailsDto } from './dto/get-gst-details.dto';
import {
  DigiLockerSessionResponse,
  GstValidationResponse,
  DigiLockerWebhookResponse,
} from './interfaces/decentro.interface';
import { ImageValidationDto } from './dto/image-validation.dto';
import { OpportunityIdDto } from './dto/opportunity-id.dto';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from 'src/interceptors/decorators/skip-encryption.decorator';

@Controller('decentro')
export class DecentroController {
  constructor(private readonly decentroService: DecentroService) {}

  @Post('generate-digilocker-url')
  async generateDigiLockerUrl(
    @Body() body: GenerateDigiLockerUrlDto,
  ): Promise<DigiLockerSessionResponse> {
    return await this.decentroService.generateDigiLockerUrl(body);
  }

  @Post('get-gst-details')
  async getGstDetails(
    @Body() body: GetGstDetailsDto,
  ): Promise<GstValidationResponse> {
    return await this.decentroService.getGstDetails(body);
  }

  @Post('digilocker-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleDigiLockerWebhook(
    @Body() body: any,
  ): Promise<DigiLockerWebhookResponse> {
    return await this.decentroService.handleDigiLockerWebhook(body);
  }

  @Post('get-image-details')
  async getimageDetails(@Body() request: ImageValidationDto): Promise<any> {
    return await this.decentroService.getImageDetails(request);
  }

  @Get('verify-digilocker-status/:opportunityId')
  async verifyDigilockerStatus(@Param() param: OpportunityIdDto): Promise<any> {
    const { opportunityId } = param;
    return await this.decentroService.verifyDigilockerStatus(opportunityId);
  }
}
