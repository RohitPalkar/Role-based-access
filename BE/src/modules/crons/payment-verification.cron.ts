import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PaymentTransaction } from 'src/entities';
import { logger } from 'src/logger/logger';
import {
  EasebuzzEventEnum,
  PaymentGatewayEnum,
  RazorpayTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { CustomConfigService } from 'src/config/custom-config.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class PaymentVerificationCron {
  private readonly enabled: boolean;
  private readonly batchSize: number;
  private readonly concurrency: number;

  constructor(
    private readonly config: CustomConfigService,
    private readonly http: HttpService,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    private readonly paymentsService: PaymentsService,
  ) {
    this.enabled = this.config.get<string>('PAYMENT_CRONS_ENABLED') === 'true';
    this.batchSize = Number(this.config.get('PAYMENT_BATCH_SIZE') || 20);
    this.concurrency = Number(this.config.get('PAYMENT_CONCURRENCY') || 5);
  }

  @Cron('0 * * * *')
  async runVerificationCron() {
    if (!this.enabled) {
      logger.info('Payment verification cron disabled.');
      return;
    }

    logger.info(
      `Payment verification started (batch=${this.batchSize}, concurrency=${this.concurrency})`,
    );

    const totalPending = await this.paymentRepo.count({
      where: {
        status: RazorpayTxStatusEnum.PENDING,
      },
    });

    if (totalPending === 0) {
      logger.info('No pending payments found.');
      return;
    }

    logger.info(`Found ${totalPending} pending payments.`);

    for (let offset = 0; offset < totalPending; offset += this.batchSize) {
      const batch = await this.paymentRepo.find({
        where: {
          status: RazorpayTxStatusEnum.PENDING,
        },
        order: { createdAt: 'ASC' },
        skip: offset,
        take: this.batchSize,
      });
      if (!batch.length) break;

      await this.processBatch(batch);
    }

    logger.info('Payment verification completed.');
  }

  private async processBatch(batch: PaymentTransaction[]) {
    const groups = this.chunk(batch, this.concurrency);

    for (const group of groups) {
      const results = await Promise.allSettled(
        group.map((p) => this.verifySingle(p)),
      );
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          logger.warn(
            `Verification failed txn=${group[idx].orderId}: ${r.reason}`,
          );
        }
      });
    }
  }

  private async verifySingle(payment: PaymentTransaction) {
    const fresh = await this.paymentRepo.findOne({
      where: { id: payment.id },
    });

    if (!fresh || fresh.status !== RazorpayTxStatusEnum.PENDING) return;

    try {
      const paymentDetails = await this.verifyWithGateway(fresh);
      switch (paymentDetails?.status) {
        case RazorpayTxStatusEnum.SUCCESS:
          this.paymentsService.markPaymentSuccess(
            paymentDetails.gateway,
            paymentDetails?.orderId,
            paymentDetails?.gatewayId,
            paymentDetails?.signature,
            paymentDetails?.raw,
          );
          break;
        case RazorpayTxStatusEnum.FAILED:
          this.paymentsService.markPaymentFailed(
            paymentDetails?.orderId,
            paymentDetails?.raw,
          );
          break;
      }
    } catch (err) {
      logger.error(`Error verifying txn=${fresh.orderId}: ${err.message}`);
    }
  }

  private async verifyWithGateway(payment: PaymentTransaction) {
    switch (payment.gatewayName) {
      case PaymentGatewayEnum.RAZORPAY:
        return this.verifyRazorpay(payment);
      case PaymentGatewayEnum.EASEBUZZ:
        return this.verifyEasebuzz(payment);
      default:
        throw new Error(`Unsupported gateway ${payment.gatewayName}`);
    }
  }

  // ---------------- RAZORPAY ------------------
  private async verifyRazorpay(payment: PaymentTransaction) {
    const { key, secret } = await this.paymentsService.resolveRazorpayConfig(
      payment?.entityType,
      payment?.projectId,
    );

    const base = this.config.get<string>('RAZORPAY_API_URL');
    const orderId = payment.gatewayOrderId;
    if (!orderId) return { status: 'pending', raw: {}, msg: 'orderId missing' };

    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const orderResp = await firstValueFrom(
      this.http.get(`${base}/orders/${orderId}/payments`, {
        headers: { Authorization: `Basic ${auth}` },
      }),
    );

    const gatewayPayment = orderResp?.data?.items?.[0] || {};
    let mappedStatus = RazorpayTxStatusEnum.PENDING;
    if (gatewayPayment?.status === 'captured') {
      mappedStatus = RazorpayTxStatusEnum.SUCCESS;
    } else if (gatewayPayment?.status === RazorpayTxStatusEnum.FAILED) {
      mappedStatus = RazorpayTxStatusEnum.FAILED;
    }

    // Additional check: if still pending after long time, mark as failed
    if (
      mappedStatus === RazorpayTxStatusEnum.PENDING &&
      gatewayPayment.created_at
    ) {
      const failedStatus = this.markFailedIfPendingTooLong(
        gatewayPayment?.created_at,
        !gatewayPayment?.status ? 8 : undefined, // if created but no status for >8hrs, mark as failed
      );

      if (failedStatus) {
        mappedStatus = failedStatus;
      }
    }

    return {
      gateway: PaymentGatewayEnum.RAZORPAY,
      status: mappedStatus,
      raw: gatewayPayment,
      orderId: gatewayPayment.order_id ?? orderId,
      gatewayId: gatewayPayment.id,
      signature: gatewayPayment.signature,
    };
  }

  // ---------------- EASEBUZZ ------------------
  private async verifyEasebuzz(payment: PaymentTransaction) {
    const { easebuzzKey, easebuzzSalt } =
      await this.paymentsService.resolveEasebuzzSubMerchantId(
        payment?.entityType,
        payment?.projectId,
      );
    const base = this.config.get<string>('EASEBUZZ_DASHBOARD_URL');
    // v1 retrieve (safe, stable)
    const { gatewayOrderId, amount, notes } = payment;
    const amt = Number(amount)?.toFixed(1);

    const { email = '', phone = '' } = notes?.guest || {};
    const hashString = `${easebuzzKey}|${gatewayOrderId}|${amt}|${email}|${phone}|${easebuzzSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const payload = {
      key: easebuzzKey,
      txnid: gatewayOrderId ?? '',
      amount: amt ?? '0.0',
      email,
      phone,
      hash,
    };
    const response = await firstValueFrom(
      this.http.post(`${base}/transaction/v1/retrieve`, payload),
    );
    const d = response.data;
    if (!d || d.status !== true)
      return {
        status: RazorpayTxStatusEnum.FAILED,
        orderId: gatewayOrderId,
        raw: d,
      };
    const gatewayPayment = d.msg;
    const gwStatus = gatewayPayment?.status;
    let mappedStatus = RazorpayTxStatusEnum.PENDING;
    if (gwStatus === EasebuzzEventEnum.SUCCESS) {
      mappedStatus = RazorpayTxStatusEnum.SUCCESS;
    } else if (
      gwStatus === EasebuzzEventEnum.FAILURE ||
      gwStatus === EasebuzzEventEnum.USER_CANCELLED
    ) {
      mappedStatus = RazorpayTxStatusEnum.FAILED;
    }

    // Additional check: if still pending after long time, mark as failed
    if (
      mappedStatus === RazorpayTxStatusEnum.PENDING &&
      gatewayPayment.addedon
    ) {
      const failedStatus = this.markFailedIfPendingTooLong(
        gatewayPayment?.addedon,
        gwStatus === EasebuzzEventEnum.INITIATED ? 8 : undefined, // if initiated but pending for >8hrs, mark as failed
      );

      if (failedStatus) {
        mappedStatus = failedStatus;
      }
    }

    return {
      gateway: PaymentGatewayEnum.EASEBUZZ,
      status: mappedStatus,
      raw: gatewayPayment,
      gatewayId: gatewayPayment?.easepayid,
      orderId: gatewayPayment?.txnid,
      signature: gatewayPayment?.hash,
    };
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  }

  private markFailedIfPendingTooLong(
    addedOn: string | number | Date,
    maxHours = 24,
  ): RazorpayTxStatusEnum | null {
    const addedOnDate =
      typeof addedOn === 'number'
        ? new Date(addedOn * 1000) // Razorpay
        : new Date(addedOn); // Easebuzz / Date

    if (isNaN(addedOnDate.getTime())) {
      return null;
    }

    const diffHours = (Date.now() - addedOnDate.getTime()) / (1000 * 60 * 60);

    return diffHours > maxHours ? RazorpayTxStatusEnum.FAILED : null;
  }
}
