import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from 'src/interceptors/decorators/skip-encryption.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async createOrder(@Body() createOrderDto: CreatePaymentOrderDto) {
    return await this.paymentsService.createOrder(createOrderDto);
  }

  @Post('create-rm-order')
  @UseGuards(RmAdminAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.PROJECT_HEAD,
    RolesEnum.SALES_TL,
  )
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'payment_transactions'),
  )
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async createRmOrder(@Body() createOrderDto: CreatePaymentOrderDto) {
    return await this.paymentsService.createOrder(createOrderDto);
  }

  @Post('webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }

  @Post('easebuzz-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleEaseBuzzWebhook(@Body() webhookData: any) {
    return this.paymentsService.handleEaseBuzzWebhook(webhookData);
  }

  @Post('verify')
  async verifyPayment(
    @Body()
    body: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPaymentDetails(body);
  }
}
