import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Razorpay = require('razorpay');
import * as crypto from 'node:crypto';
import { logger } from 'src/logger/logger';
import { CreatePaymentOrderDto } from './dto/create-order.dto';
import { PaymentTransaction } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { generateOrderId } from 'src/utils/generateRandomNumber';
import {
  EasebuzzEventEnum,
  PaymentGatewayEnum,
  PaymentModeEnum,
  PaymentTxStatusEnum,
  RazorpayEntityEnum,
  RazorpayEventType,
  RazorpayTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { SUCCESS } from 'src/config/constants';
import {
  Booking,
  BookingPayment,
  Brands,
  EoiCampaign,
  ProjectPhase,
  ProjectTerm,
  Projects,
  VoucherForm,
  VoucherPayment,
  VoucherUnitBlocking,
} from 'src/entities';
import { deriveVoucherTransactionIdFromPaymentDetails } from 'src/utils/voucher-payment-transaction-id.util';
import {
  VoucherFormStatusEnum,
  VoucherIdFieldNameEnum,
  VoucherPaymentStatus,
} from 'src/enums/eoi-form.enums';
import { CustomConfigService } from 'src/config/custom-config.service';
import { VoucherFormsService } from '../eoi_manager/voucher_forms/voucher_form.service';
import {
  shouldGenerateQueueId,
  calculatePaymentMetrics,
  determinePaymentStatus,
  determineVoucherChronology,
  resolveAndAssignTieredId,
  generateAndAssignTieredQueueId,
  allocateCampaignTierCounter,
  applyAssignedTierThresholdAmountAndRecomputeMetrics,
  markFormSubmittedOnTierChange,
} from 'src/helpers/eoi.helper';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;

  constructor(
    private readonly configService: CustomConfigService,
    private readonly voucherFormsService: VoucherFormsService,
    private readonly httpService: HttpService,

    @InjectRepository(PaymentTransaction)
    private readonly paymentRepository: Repository<PaymentTransaction>,

    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,

    @InjectRepository(ProjectTerm)
    private readonly projectTermRepository: Repository<ProjectTerm>,

    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,

    @InjectRepository(Projects)
    private readonly projectsRepository: Repository<Projects>,

    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  /**
   * Creates a new order in Razorpay/Easebuzz.
   * @param orderDto - The order details.
   * @returns The created order details.
   */

  async createOrder(orderDto: CreatePaymentOrderDto): Promise<any> {
    const gateway = orderDto.gateway ?? PaymentGatewayEnum.RAZORPAY;

    switch (gateway) {
      case PaymentGatewayEnum.RAZORPAY:
        return this.createRazorpayOrder(orderDto);

      case PaymentGatewayEnum.EASEBUZZ:
        return this.createEasebuzzOrder(orderDto);

      default:
        throw new BadRequestException('Unsupported payment gateway');
    }
  }

  /**
   * Creates a new order in Razorpay.
   * @param orderDto - The order details.
   * @returns The created order details.
   */
  private async createRazorpayOrder(orderDto: CreatePaymentOrderDto) {
    const { key, secret } = await this.resolveRazorpayConfig(
      orderDto.entityType,
      orderDto.projectId,
    );

    if (!key || !secret) {
      throw new ServiceUnavailableException(
        'Razorpay configuration not found. please contact support.',
      );
    }

    const razorpay = new Razorpay({ key_id: key, key_secret: secret });

    const receipt = generateOrderId();
    const options: Razorpay.OrderCreateRequestBody = {
      amount: orderDto.amount * 100,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: orderDto.notes,
    };

    const order = await razorpay.orders.create(options);

    if (!order?.id) {
      throw new BadRequestException('Failed to create Razorpay order');
    }

    const tx = this.paymentRepository.create({
      entityType: orderDto?.entityType ?? 'unknown',
      entityId: Number.parseInt(orderDto?.entityId, 10),
      orderId: receipt,
      gatewayOrderId: order?.id,
      amount: orderDto?.amount,
      currency: 'INR',
      gatewayName: PaymentGatewayEnum.RAZORPAY,
      status: RazorpayTxStatusEnum.PENDING,
      notes: orderDto?.notes,
      metadata: {
        stage: 'order_created',
        paymentOrder: order,
      },
      projectId: orderDto?.projectId ?? null,
    });

    await this.paymentRepository.save(tx);
    return {
      statusCode: SUCCESS,
      message: 'Razorpay order created',
      data: {
        razorpayOrder: order,
        customOrderId: receipt,
        razorpayKey: key,
      },
    };
  }

  /**
   * Creates a new order in Easebuzz.
   * @param orderDto - The order details.
   * @returns The created order details.
   */
  private async createEasebuzzOrder(orderDto: CreatePaymentOrderDto) {
    try {
      const { entityType, projectId } = orderDto;
      const txnid = generateOrderId();

      const { subMerchantId, easebuzzKey, easebuzzSalt } =
        await this.resolveEasebuzzSubMerchantId(
          entityType,
          projectId,
          Number.parseInt(orderDto.entityId, 10),
        );

      // amount MUST be decimal string e.g
      const amount = Number(orderDto.amount).toFixed(2);

      // Safely extract values
      const notes = orderDto.notes || {};
      const productinfo = notes.productInfo?.trim() || '';
      const firstname = notes?.guest?.name?.trim() || '';
      const email = notes?.guest?.email?.trim() || '';
      const phone = notes?.guest?.phone?.trim() || '';

      //EXACT hash format required by Easebuzz
      const hashString =
        `${easebuzzKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}` +
        `|||||||||||${easebuzzSalt}`;

      const hash = crypto.createHash('sha512').update(hashString).digest('hex');
      const redirectUrl = orderDto?.redirectUrl ?? '';
      const payload = {
        key: easebuzzKey,
        txnid,
        amount,
        productinfo,
        firstname,
        sub_merchant_id: subMerchantId,
        email,
        phone,
        surl: redirectUrl + `?txnid=${txnid},status=success`,
        furl: redirectUrl + `?status=failure`,
        hash,
      };

      const baseUrl = this.configService.get<string>('EASEBUZZ_BASE_URL');
      const paymentMode = this.configService.get<string>(
        'EASEBUZZ_PAYMENT_MODE',
      );
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/payment/initiateLink`, payload, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Success must return status=1
      if (response.data?.status !== 1) {
        throw new ServiceUnavailableException(
          `Easebuzz payment initiation failed: ${response.data?.error_desc || 'Unknown error'}`,
        );
      }

      // Save order in DB
      await this.paymentRepository.save(
        this.paymentRepository.create({
          entityType,
          entityId: Number.parseInt(orderDto.entityId, 10),
          orderId: txnid,
          gatewayOrderId: txnid ?? null,
          amount: orderDto.amount,
          currency: 'INR',
          gatewayName: PaymentGatewayEnum.EASEBUZZ,
          status: RazorpayTxStatusEnum.PENDING,
          notes: orderDto.notes,
          metadata: {
            stage: 'order_created',
            paymentOrder: response.data,
          },
          projectId,
        }),
      );

      return {
        statusCode: SUCCESS,
        message: 'Easebuzz payment link created',
        data: {
          customOrderId: txnid,
          accessKey: response?.data?.data ?? '',
          easebuzzKey: easebuzzKey,
          paymentMode,
        },
      };
    } catch (error) {
      logger.error('Easebuzz order creation error:', error);
      logsAndErrorHandling('paymentService - createEasebuzzOrder', error, {
        orderDto,
      });
    }
  }

  /**
   * Resolves the Easebuzz sub-merchant configuration for a given entity type and project ID.
   * @param entityType - The type of entity (e.g., VOUCHER, BOOKING).
   * @param projectId - The ID of the project.
   * @returns A promise resolving to the Easebuzz configuration.
   */
  async resolveEasebuzzSubMerchantId(
    entityType: string,
    projectId?: number,
    entityId?: number,
  ): Promise<{ subMerchantId; easebuzzKey; easebuzzSalt }> {
    if (!projectId) {
      return this.getDefaultEasebuzzConfig();
    }

    if (entityType === RazorpayEntityEnum.VOUCHER) {
      return this.resolveVoucherEasebuzzConfig(projectId);
    }

    if (entityType === RazorpayEntityEnum.BOOKING) {
      return this.resolveBookingEasebuzzConfig(entityId, projectId);
    }

    // For any other entity types, fall back to the default configuration
    return this.getDefaultEasebuzzConfig();
  }

  private async resolveVoucherEasebuzzConfig(
    projectId: number,
  ): Promise<{ subMerchantId; easebuzzKey; easebuzzSalt }> {
    const campaign = await this.eoiCampaignRepository.findOne({
      where: { id: projectId },
      select: ['subMerchantId', 'easebuzzKey', 'easebuzzSalt'],
    });

    return {
      subMerchantId: campaign?.subMerchantId
        ? this.configService.decryptData(campaign.subMerchantId)
        : this.configService.getDecrypted('EASEBUZZ_SUBMERCHANT_ID'),
      easebuzzKey: campaign?.easebuzzKey
        ? this.configService.decryptData(campaign.easebuzzKey)
        : this.configService.getDecrypted('EASEBUZZ_KEY'),
      easebuzzSalt: campaign?.easebuzzSalt
        ? this.configService.decryptData(campaign.easebuzzSalt)
        : this.configService.getDecrypted('EASEBUZZ_SALT'),
    };
  }

  private async resolveBookingEasebuzzConfig(
    entityId: number,
    projectId: number,
  ): Promise<{
    subMerchantId: string;
    easebuzzKey: string;
    easebuzzSalt: string;
  }> {
    let phase: ProjectPhase | null = null;
    let project: Projects | null = null;
    let brand: Brands | null = null;

    const booking = await this.bookingsRepository.findOne({
      where: { id: entityId },
      select: ['id', 'unitDetails'],
    });

    if (!booking) {
      throw new Error(`Booking not found for entityId ${entityId}`);
    }

    const phaseName = booking?.unitDetails?.phaseName;
    const blockName = booking?.unitDetails?.blockName;

    if (phaseName && blockName) {
      phase = await this.projectPhaseRepository
        .createQueryBuilder('phase')
        .leftJoinAndSelect('phase.project', 'project')
        .leftJoinAndSelect('phase.brand', 'brand')
        .where('phase.phaseName = :phaseName', { phaseName })
        .andWhere('FIND_IN_SET(:blockName, phase.blockNames)', { blockName })
        .getOne();

      if (phase) {
        project = phase.project ?? null;
        brand = phase.brand ?? null;
      }
    }

    if (!project) {
      project = await this.projectsRepository.findOne({
        where: { id: projectId },
        relations: ['brand'],
      });

      if (!project) {
        throw new Error(`Project not found for projectId ${projectId}`);
      }

      brand = project.brand ?? null;
    }

    return this.getEasebuzzCredentials(phase, project, brand);
  }

  private getEasebuzzCredentials(
    phase: ProjectPhase | null,
    project: Projects | null,
    brand: Brands | null,
  ): {
    subMerchantId: string;
    easebuzzKey: string;
    easebuzzSalt: string;
  } {
    const bookingMid =
      phase?.easebuzzBookingmid ??
      (project as any)?.easebuzzBookingmid ??
      brand?.easebuzzBookingmid ??
      null;

    const bookingKey =
      (project as any)?.easebuzzBookingKey ?? brand?.easebuzzBookingKey ?? null;

    const bookingSalt =
      (project as any)?.easebuzzBookingSalt ??
      brand?.easebuzzBookingSalt ??
      null;

    if (!bookingMid || !bookingKey || !bookingSalt) {
      return this.getDefaultEasebuzzConfig();
    }

    return {
      subMerchantId: this.configService.decryptData(bookingMid),
      easebuzzKey: this.configService.decryptData(bookingKey),
      easebuzzSalt: this.configService.decryptData(bookingSalt),
    };
  }

  private getDefaultEasebuzzConfig() {
    return {
      subMerchantId: this.configService.getDecrypted('EASEBUZZ_SUBMERCHANT_ID'),
      easebuzzKey: this.configService.getDecrypted('EASEBUZZ_KEY'),
      easebuzzSalt: this.configService.getDecrypted('EASEBUZZ_SALT'),
    };
  }

  async resolveRazorpayConfig(entityType: string, projectId?: number) {
    let razorpayKey: string | undefined;
    let razorpaySecret: string | undefined;

    if (entityType === RazorpayEntityEnum.BOOKING && projectId) {
      const project = await this.projectsRepository.findOne({
        where: { id: projectId },
        relations: ['brand'],
      });

      razorpayKey = project?.razorpayKey ?? project?.brand?.razorpayKey ?? null;
      razorpaySecret =
        project?.razorpaySecret ?? project?.brand?.razorpaySecret ?? null;
    }

    if (entityType === RazorpayEntityEnum.VOUCHER && projectId) {
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id: projectId },
        select: ['razorpayKey', 'razorpaySecret'],
      });

      razorpayKey = campaign?.razorpayKey ?? null;
      razorpaySecret = campaign?.razorpaySecret ?? null;
    }

    return {
      key: razorpayKey
        ? this.configService.decryptData(razorpayKey)
        : this.configService.getDecrypted('RAZORPAY_KEY_ID'),
      secret: razorpaySecret
        ? this.configService.decryptData(razorpaySecret)
        : this.configService.getDecrypted('RAZORPAY_KEY_SECRET'),
    };
  }

  /**
   * Handles Razorpay webhook events.
   * @param rawBody - The raw request body.
   * @param signature - The signature from the request headers.
   * @returns A response indicating the result of the webhook handling.
   */
  async handleWebhook(rawBody: string, signature: string) {
    try {
      const webhookSecret = this.configService.getDecrypted(
        'RAZORPAY_WEBHOOK_SECRET',
      );

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new BadRequestException('Invalid signature');
      }

      const event = JSON.parse(rawBody);
      const paymentDetails = event?.payload?.payment?.entity ?? {};
      const refundDetails = event?.payload?.refund?.entity ?? {};

      switch (event.event) {
        case RazorpayEventType.CAPTURED:
          await this.markPaymentSuccess(
            PaymentGatewayEnum.RAZORPAY,
            paymentDetails?.order_id,
            paymentDetails?.id,
            signature,
            paymentDetails,
          );
          break;
        case RazorpayEventType.FAILED:
          await this.markPaymentFailed(
            paymentDetails?.order_id,
            paymentDetails,
          );
          break;

        case RazorpayEventType.REFUNDED:
          await this.markPaymentRefunded(
            refundDetails?.payment_id,
            paymentDetails,
            refundDetails,
          );
          break;

        case RazorpayEventType.DISPUTE:
          await this.markPaymentDispute(
            paymentDetails?.id,
            event.payload?.dispute?.entity,
          );
          break;

        default:
          logger.warn('Unhandled Razorpay webhook event', event.event);
          break;
      }

      return { message: 'ok', statusCode: SUCCESS };
    } catch (error) {
      logger.error('Razorpay webhook error:', error);
      throw new BadRequestException('Invalid webhook data');
    }
  }

  /**
   * Handles Razorpay webhook events.
   * @param rawBody - The raw request body.
   * @param signature - The signature from the request headers.
   * @returns A response indicating the result of the webhook handling.
   */
  async handleEaseBuzzWebhook(paymentDetails: any) {
    try {
      logger.log('Easebuzz webhook received:', paymentDetails);
      // 1. Find payment transaction within transaction
      if (!paymentDetails?.txnid) {
        logger.error('Easebuzz webhook missing txnid:', paymentDetails);
        throw new BadRequestException(
          'Invalid Easebuzz webook data: Missing txnid',
        );
      }

      const paymentTx = await this.paymentRepository.findOne({
        where: { gatewayOrderId: paymentDetails?.txnid },
      });

      if (!paymentTx) {
        logger.error(
          'Payment transaction not found for Easebuzz txnid:',
          paymentDetails?.txnid,
        );
        throw new Error('Payment transaction not found');
      }

      // Resolve sub-merchant details
      const { easebuzzKey, easebuzzSalt } =
        await this.resolveEasebuzzSubMerchantId(
          paymentTx?.entityType,
          paymentTx?.projectId,
        );

      // Step 2: Verify webhook hash
      if (!this.verifyEasebuzzHash(paymentDetails, easebuzzSalt)) {
        throw new BadRequestException('Invalid Easebuzz hash signature');
      }

      if (paymentDetails?.status === EasebuzzEventEnum.SUCCESS) {
        // Step 3: Call Transaction Retrieve API
        const txnResponse = await this.verifyTransactionWithEasebuzz(
          paymentDetails,
          easebuzzKey,
          easebuzzSalt,
        );

        // Step 4: Validate response
        const gatewayStatus = txnResponse?.msg?.status;
        const gatewayAmount = txnResponse?.msg?.amount;

        if (gatewayStatus !== 'success') {
          throw new BadRequestException(
            `Transaction status mismatch from Easebuzz. Gateway returned: ${gatewayStatus}`,
          );
        }

        if (Number(gatewayAmount) !== Number(paymentDetails?.amount)) {
          throw new BadRequestException(
            `Transaction amount mismatch from Easebuzz. Gateway returned: ${gatewayAmount}`,
          );
        }
      }

      // Step 5: Process based on event status
      switch (paymentDetails?.status) {
        case EasebuzzEventEnum.SUCCESS:
          await this.markPaymentSuccess(
            PaymentGatewayEnum.EASEBUZZ,
            paymentDetails?.txnid,
            paymentDetails?.easepayid,
            paymentDetails?.hash,
            paymentDetails,
          );
          break;
        case EasebuzzEventEnum.FAILURE:
          await this.markPaymentFailed(paymentDetails?.txnid, paymentDetails);
          break;
        default:
          logger.warn(
            'Unhandled Easebuzz webhook status',
            paymentDetails?.status,
          );
          break;
      }
      return { message: 'ok', statusCode: SUCCESS };
    } catch (error) {
      logger.error('Easebuzz webhook error:', error);
      logsAndErrorHandling('paymentService - handleEaseBuzzWebhook', error, {
        paymentDetails,
      });
    }
  }

  /**
   * Verifies the Easebuzz payment hash when get webhook call.
   * @param data - The payment data received from Easebuzz.
   * @param salt - The salt used for hash generation.
   * @returns True if the hash is valid, otherwise false.
   */
  private verifyEasebuzzHash(data: any, easebuzzSalt: string): boolean {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash: receivedHash,
    } = data;

    if (!receivedHash || !status) {
      return false;
    }

    // Response hash pattern (reverse order + leading salt)
    const stringToHash = `${easebuzzSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const calculatedHash = crypto
      .createHash('sha512')
      .update(stringToHash)
      .digest('hex');
    return calculatedHash.toLowerCase() === receivedHash.toLowerCase();
  }

  /**
   * Verifies a transaction with Easebuzz.
   * @param txnid - The transaction ID.
   * @returns The transaction details from Easebuzz.
   */
  private async verifyTransactionWithEasebuzz(
    paymentDetails: any,
    easebuzzKey: string,
    easebuzzSalt: string,
  ) {
    const baseUrl = this.configService.get<string>('EASEBUZZ_DASHBOARD_URL');

    const { txnid, amount, email, phone } = paymentDetails;
    // hash format for Retrieve API
    const hashString = `${easebuzzKey}|${txnid}|${amount}|${email}|${phone}|${easebuzzSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    const payload = {
      key: easebuzzKey,
      txnid,
      amount,
      email,
      phone,
      hash,
    };

    const response = await firstValueFrom(
      this.httpService.post(`${baseUrl}/transaction/v1/retrieve`, payload),
    );
    return response.data;
  }

  /**
   * Marks gateway payment success; for vouchers, opens `updateVoucherWithPayment` → tier ID pipeline.
   *
   * @param orderId - The order ID.
   * @param razorpayPaymentId - The Razorpay payment ID.
   * @param signature - The signature for verification.
   * @param paymentDetails - The payment details from Razorpay.
   * @returns The updated payment transaction.
   */
  async markPaymentSuccess(
    gateway: PaymentGatewayEnum,
    orderId: string,
    razorpayPaymentId: string,
    signature: string,
    paymentDetails: any,
  ) {
    const deferredEvents: any[] = [];
    const result = await this.paymentRepository.manager.transaction(
      async (manager) => {
        // 1. Find payment transaction within transaction
        const paymentTx = await manager.findOne(PaymentTransaction, {
          where: { gatewayOrderId: orderId },
        });

        if (!paymentTx) {
          throw new Error('Payment transaction not found');
        }

        const createdAtUnix = paymentDetails?.created_at; // 1755794325
        let paidAt = new Date(createdAtUnix * 1000); // convert seconds → ms
        let method = paymentDetails?.method || null;
        if (gateway == PaymentGatewayEnum.EASEBUZZ) {
          paidAt = new Date(paymentDetails?.addedon);
          method = paymentDetails?.mode || null;
        }

        // 2. Update payment transaction
        // STEP 1 — lock payment transaction
        const tx = await manager.findOne(PaymentTransaction, {
          where: { id: paymentTx.id },
          lock: { mode: 'pessimistic_write' },
        });

        // idempotency guard
        if (tx.status === RazorpayTxStatusEnum.SUCCESS) {
          return;
        }

        tx.status = RazorpayTxStatusEnum.SUCCESS;
        await manager.save(tx);
        paymentTx.gatewayPaymentId = razorpayPaymentId;
        paymentTx.gatewaySignature = signature;
        paymentTx.method = method;
        paymentTx.paidAt = paidAt || null;

        paymentTx.metadata = {
          ...(paymentTx.metadata ?? {}),
          stage: 'payment_success',
          paymentSuccess: paymentDetails,
        };

        await manager.save(paymentTx);

        // 3. Update related voucher(s)
        if (paymentTx.entityType === RazorpayEntityEnum.BOOKING) {
          await this.updateBookingWithPayment(
            manager,
            gateway,
            paymentTx,
            paymentDetails,
          );
        } else {
          await this.updateVoucherWithPayment(
            manager,
            gateway,
            paymentTx,
            paymentDetails,
            deferredEvents,
          );
        }

        return paymentTx;
      },
    );

    // Emit any deferred events after the transaction has committed
    try {
      for (const ev of deferredEvents || []) {
        this.voucherFormsService['eventEmitter']?.emit(
          'COMPOSE_EMAIL' as any,
          ev,
        );
      }
    } catch (e) {
      logger.error(
        'Failed to emit deferred events after payment transaction',
        e,
      );
    }

    return result;
  }

  /**
   *
   * @param manager EntityManager
   * @param paymentTx PaymentTransaction
   * @param paymentDetails Razorpay payment details
   * @returns updated Booking
   */
  private async updateBookingWithPayment(
    manager: EntityManager,
    gateway: PaymentGatewayEnum,
    paymentTx: PaymentTransaction,
    paymentDetails: any,
  ) {
    const booking = await manager.findOne(Booking, {
      where: {
        id: paymentTx?.entityId,
        opportunityId: paymentTx?.notes?.opportunityId,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Ensure paymentDetails root object
    if (!booking.paymentDetails) {
      booking.paymentDetails = {
        amountPayable: paymentTx?.notes?.bookingAmount || 0,
      };
    }

    const paymentData = this.buildPaymentData(
      gateway,
      paymentTx,
      paymentDetails,
    );

    // STEP 1 — lock payment transaction (prevents race)
    const tx = await manager.findOne(PaymentTransaction, {
      where: { id: paymentTx.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!tx) {
      throw new Error('PaymentTransaction not found');
    }

    // idempotency guard
    if (tx.status === RazorpayTxStatusEnum.SUCCESS) {
      return booking;
    }

    // update transaction
    tx.status = RazorpayTxStatusEnum.SUCCESS;
    tx.gatewayPaymentId = paymentData?.gatewayPaymentId;
    tx.paidAt = new Date();

    await manager.save(tx);

    // STEP 2 — atomic insert (no duplicates possible)
    await manager
      .createQueryBuilder()
      .insert()
      .into(BookingPayment)
      .values({
        booking: { id: booking.id },
        paidAmount: Number(tx.amount),
        paymentMode: PaymentModeEnum.GATEWAY,
        paymentDate: tx.paidAt,
        status: PaymentTxStatusEnum.VERIFIED,
        paymentTransactionId: tx.id,
        paymentDetails: paymentData as any,
      })
      .orIgnore()
      .updateEntity(false)
      .execute();

    await manager.save(booking);

    return booking;
  }

  private buildPaymentData(
    gateway: PaymentGatewayEnum,
    paymentTx: PaymentTransaction,
    paymentDetails: any,
  ) {
    let paymentData = {
      paymentTransactionId: paymentTx?.id ?? '',
      gatewayPaymentId: paymentDetails?.id ?? '',
      order_id: paymentDetails?.order_id ?? '',
      method: paymentDetails?.method ?? '',
      bank: paymentDetails?.bank ?? '',
      email: paymentDetails?.email,
      contact: paymentDetails?.contact,
      paymentProof: [],
      isPhysicalPaymentProof: false,
    };

    if (gateway === PaymentGatewayEnum.EASEBUZZ) {
      paymentData = {
        ...paymentData,
        gatewayPaymentId: paymentDetails?.easepayid ?? '',
        order_id: paymentDetails?.txnid ?? '',
        method: paymentDetails?.mode ?? '',
        contact: paymentDetails?.phone ?? '',
        bank: paymentDetails?.bank_name ?? '',
      };
    }

    return paymentData;
  }

  /**
   * Inserts/updates the gateway `VoucherPayment` row then runs `recalculateVoucherAfterPayment`
   * (tier IDs + queue via eoi.helper — same rules as customer `updatePaymentDetails`).
   */
  private async updateVoucherWithPayment(
    manager: EntityManager,
    gateway: PaymentGatewayEnum,
    paymentTx: PaymentTransaction,
    paymentDetails: any,
    deferredEvents?: any[],
  ) {
    const voucher = await manager.findOne(VoucherForm, {
      where: {
        id: paymentTx.entityId,
        voucherId: paymentTx?.notes?.voucherId,
      },
      relations: ['campaign'],
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Lock the voucher row to prevent concurrent allocation/races.
    await manager.findOne(VoucherForm, {
      where: { id: paymentTx.entityId },
      lock: { mode: 'pessimistic_write' },
    });

    await this.upsertGatewayVoucherPayment(
      manager,
      gateway,
      voucher,
      paymentTx,
      paymentDetails,
      deferredEvents,
    );

    const updatedVoucher = await this.recalculateVoucherAfterPayment(
      manager,
      voucher,
      paymentTx,
      deferredEvents,
    );

    // Process unit approval and mapping after voucher is updated with latest payment details and tier assignment, as these may impact unit eligibility and mapping logic
    await this.voucherFormsService.processUnitApprovalAndMapping(
      manager,
      updatedVoucher,
      undefined,
      deferredEvents,
    );

    return updatedVoucher;
  }

  /**
   * Gateway success path: `buildVoucherQueueResponse` for metrics only, then
   * `resolveAndAssignTieredId` + optional `generateAndAssignTieredQueueId` (eoi.helper).
   */
  private async recalculateVoucherAfterPayment(
    manager: EntityManager,
    voucher: VoucherForm,
    paymentTx: PaymentTransaction,
    deferredEvents?: any[],
  ): Promise<VoucherForm> {
    // Reload voucher with latest payment rows written in this transaction.
    const updatedVoucher = await manager.findOne(VoucherForm, {
      where: { id: voucher.id },
      relations: ['campaign', 'payments', 'closingRm', 'createdBy'],
    });

    // Compute payment + finance aggregates once and reuse below.
    const { paymentStatus, totalAmountPaid, paymentMetrics, financeStatus } =
      this.buildVoucherQueueResponse(updatedVoucher, paymentTx);

    // Persist latest payment rollups on voucher.
    voucher.paymentDetails.totalAmountPaid = totalAmountPaid;
    voucher.paymentStatus = paymentStatus;
    voucher.customerLastUpdatedAt = new Date();
    voucher.voucherFormStatus =
      voucher.voucherFormStatus === VoucherFormStatusEnum.CREATED
        ? VoucherFormStatusEnum.IN_PROGRESS
        : voucher.voucherFormStatus;

    voucher.financeStatus =
      voucher.financeStatus === PaymentTxStatusEnum.REFUNDED
        ? voucher.financeStatus
        : financeStatus;

    // Resolve and assign exactly one eligible tier ID (highest qualifying tier).
    const tierConfig = await resolveAndAssignTieredId(
      voucher,
      voucher.campaign,
      paymentMetrics.validPaidAmount,
      (voucherForm, id) =>
        this.voucherFormsService.sendQueueIdAssignmentEmail(
          voucherForm,
          id,
          deferredEvents,
        ),
      // Atomic DB counter allocation to avoid duplicate tier IDs during concurrent webhook processing
      (counterField) =>
        allocateCampaignTierCounter(manager, voucher.campaign.id, counterField),
    );

    let metricsForQueue = paymentMetrics;
    const recomputedMetrics =
      applyAssignedTierThresholdAmountAndRecomputeMetrics(
        voucher,
        voucher.campaign,
        tierConfig,
        updatedVoucher.payments || [],
      );
    if (
      tierConfig &&
      (tierConfig.tier === VoucherIdFieldNameEnum.STD_EOI_ID ||
        tierConfig.tier === VoucherIdFieldNameEnum.PRE_EOI_ID)
    ) {
      markFormSubmittedOnTierChange(voucher, tierConfig);
    }
    if (recomputedMetrics) {
      metricsForQueue = recomputedMetrics;
      voucher.paymentStatus = determinePaymentStatus(metricsForQueue);
      voucher.financeStatus = this.calculateFinanceStatusForOnlinePayment(
        updatedVoucher.payments || [],
        Number(voucher.paymentDetails?.amountPayable || 0),
      );
    }
    if (tierConfig) {
      // No need to save(campaign) here — counter already persisted by atomic UPDATE in allocateCampaignTierCounter

      // Queue ID generation depends on full-payment/verification gates.
      if (shouldGenerateQueueId(voucher, metricsForQueue)) {
        await generateAndAssignTieredQueueId(
          voucher,
          tierConfig,
          (campaignId, queueType) =>
            this.voucherFormsService.generateQueueId(
              campaignId,
              queueType,
              manager,
            ),
        );
      }
    }

    voucher.chronology =
      voucher.chronology || determineVoucherChronology(voucher);
    return manager.save(voucher);
  }

  private prepareVoucherPayments(
    voucher: VoucherForm,
    paymentTx?: PaymentTransaction,
  ) {
    if (!voucher.paymentDetails) {
      voucher.paymentDetails = {
        amountPayable: paymentTx?.notes?.voucherAmount || 0,
        recoveryAccountDetails: null,
      };
    } else if (paymentTx?.notes?.voucherAmount) {
      // Update amountPayable while preserving existing paymentDetails
      voucher.paymentDetails.amountPayable = paymentTx.notes.voucherAmount;
    }
  }

  /**
   * Inserts or updates a gateway payment for a voucher.
   *
   * @param manager EntityManager
   * @param gateway PaymentGatewayEnum
   * @param voucher VoucherForm
   * @param paymentTx PaymentTransaction
   * @param paymentDetails any
   * @returns VoucherPayment
   */
  private async upsertGatewayVoucherPayment(
    manager: EntityManager,
    gateway: PaymentGatewayEnum,
    voucher: VoucherForm,
    paymentTx: PaymentTransaction,
    paymentDetails: any,
    deferredEvents?: any[],
  ): Promise<void> {
    try {
      this.prepareVoucherPayments(voucher, paymentTx);

      // Normalize gateway payment id
      let gatewayPaymentId = paymentDetails?.id;

      if (gateway === PaymentGatewayEnum.EASEBUZZ) {
        gatewayPaymentId = paymentDetails?.easepayid;
      }

      if (!gatewayPaymentId) {
        throw new Error('Missing gatewayPaymentId');
      }

      // STEP 1 — Lock payment transaction (prevents race)
      const tx = await manager.findOne(PaymentTransaction, {
        where: {
          id: paymentTx.id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!tx) {
        throw new Error('PaymentTransaction not found');
      }

      // Idempotency guard
      if (tx.status === RazorpayTxStatusEnum.SUCCESS) {
        return;
      }

      // Update transaction
      tx.status = RazorpayTxStatusEnum.SUCCESS;
      tx.gatewayPaymentId = gatewayPaymentId;
      tx.method = paymentDetails?.method;
      tx.paidAt = new Date();

      await manager.save(tx);
      //Prepare payment details
      let paymentData = {
        paymentTransactionId: tx?.id,
        gatewayPaymentId,
        order_id: paymentDetails?.order_id ?? '',
        method: paymentDetails?.method ?? '',
        bank: paymentDetails?.bank ?? '',
        email: paymentDetails?.email,
        contact: paymentDetails?.contact,
        paymentProof: [],
        isPhysicalPaymentProof: false,
      };

      if (gateway === PaymentGatewayEnum.EASEBUZZ) {
        paymentData = {
          ...paymentData,
          order_id: paymentDetails?.txnid ?? '',
          method: paymentDetails?.mode ?? '',
          contact: paymentDetails?.phone ?? '',
          bank: paymentDetails?.bank_name ?? '',
        };
      }

      // Check if voucher has a unit mapping
      const unitBlocking = await manager.findOne(VoucherUnitBlocking, {
        where: { voucherId: voucher.id },
      });
      const isUnitMapped = !!unitBlocking;

      // STEP 2 — Atomic insert (NO DUPLICATES POSSIBLE).
      // QueryBuilder bypasses entity hooks — persist denormalized txn id alongside JSON.
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(VoucherPayment)
        .values({
          voucherId: voucher.id,
          paidAmount: Number(tx.amount),
          paymentMode: PaymentModeEnum.GATEWAY,
          date: tx.paidAt,
          status: PaymentTxStatusEnum.UNVERIFIED,
          paymentTransactionId: tx.id,
          paymentDetails: paymentData as any,
          voucherTransactionId: deriveVoucherTransactionIdFromPaymentDetails(
            paymentData as Record<string, unknown>,
          ),
          isUnitMapped,
        })
        .orIgnore()
        .updateEntity(false)
        .execute();

      // STEP 3 — Send email ONLY if inserted
      if (result.identifiers.length > 0) {
        // Defer emission if caller provided a deferredEvents array
        await this.voucherFormsService
          .sendPaymentConfirmationEmails(
            voucher,
            [result.identifiers[0]],
            deferredEvents,
          )
          .catch((err) =>
            logger.error('Failed to queue payment confirmation email', err),
          );
      }
    } catch (error) {
      throw error;
    }
  }

  /** PE-476: metrics + `validPaidAmount` only — tier assignment happens in `recalculateVoucherAfterPayment`. */
  private buildVoucherQueueResponse(
    voucher: VoucherForm,
    paymentTx: PaymentTransaction,
  ): {
    paymentStatus: VoucherPaymentStatus;
    totalAmountPaid: number;
    financeStatus: PaymentTxStatusEnum;
    paymentMetrics: ReturnType<typeof calculatePaymentMetrics>;
  } {
    // Prefer webhook amount when present; otherwise fall back to voucher payable amount.
    const amountPayable =
      Number(paymentTx.notes?.voucherAmount) ||
      Number(voucher?.paymentDetails?.amountPayable) ||
      0;
    // Single source for paid/verified/unverified totals and derived status booleans.
    const paymentMetrics = calculatePaymentMetrics(
      voucher?.payments,
      amountPayable,
    );
    return {
      paymentStatus: determinePaymentStatus(paymentMetrics),
      totalAmountPaid: Number(paymentMetrics?.totalPaidAmount || 0),
      financeStatus: this.calculateFinanceStatusForOnlinePayment(
        voucher?.payments || [],
        amountPayable,
      ),
      paymentMetrics,
    };
  }

  /**
   * Determines finance status during gateway payment processing.
   * Rule: if sum of REALIZED payments is >= amountPayable, status is VERIFIED
   * even if some transactions are REJECTED.
   */
  private calculateFinanceStatusForOnlinePayment(
    payments: Array<{ status: PaymentTxStatusEnum; paidAmount: number }>,
    amountPayable: number,
  ): PaymentTxStatusEnum {
    // Do not rely on paymentMetrics.verifiedAmount here because gateway UNVERIFIED
    // amounts can be treated as verified for queue calculations. Finance status
    // should only use explicitly REALIZED (VERIFIED) payments.
    let totalVerifiedAmount = 0;
    const statuses = new Set<PaymentTxStatusEnum>();
    for (const tx of payments || []) {
      statuses.add(tx.status);
      if (tx.status === PaymentTxStatusEnum.VERIFIED) {
        totalVerifiedAmount += Number(tx.paidAmount || 0);
      }
    }
    const isFullyVerified = totalVerifiedAmount >= amountPayable;

    if (isFullyVerified) return PaymentTxStatusEnum.VERIFIED;
    if (statuses.has(PaymentTxStatusEnum.REJECTED)) {
      return PaymentTxStatusEnum.REJECTED;
    }
    if (statuses.has(PaymentTxStatusEnum.REVERSED)) {
      return PaymentTxStatusEnum.REVERSED;
    }
    if (statuses.has(PaymentTxStatusEnum.UNVERIFIED)) {
      return PaymentTxStatusEnum.UNVERIFIED;
    }

    return PaymentTxStatusEnum.VERIFIED;
  }

  /**
   * Marks a payment as failed in the database.
   * @param orderId - The order ID.
   * @param errorDetails - The error details from Razorpay.
   * @returns The updated payment transaction.
   */
  async markPaymentFailed(orderId: string, errorDetails: any) {
    const paymentTx = await this.paymentRepository.findOne({
      where: { gatewayOrderId: orderId },
    });
    if (!paymentTx) throw new Error('Payment transaction not found');

    paymentTx.status = RazorpayTxStatusEnum.FAILED;

    paymentTx.metadata = {
      ...(paymentTx.metadata ?? {}),
      stage: 'payment_failed',
      paymentError: errorDetails,
    };

    await this.paymentRepository.save(paymentTx);
    return paymentTx;
  }

  /**
   * Marks a payment as refunded in the database.
   * @param razorpayPaymentId - The Razorpay payment ID.
   * @param refundDetails - The refund details from Razorpay.
   * @returns The updated payment transaction.
   */
  async markPaymentRefunded(
    razorpayPaymentId: string,
    paymentDetails: any,
    refundDetails: any,
  ) {
    // Find by paymentId (since refund belongs to a payment)
    return await this.paymentRepository.manager.transaction(async (manager) => {
      // 1. Find payment transaction within transaction
      const paymentTx = await manager.findOne(PaymentTransaction, {
        where: { gatewayPaymentId: razorpayPaymentId },
      });

      if (!paymentTx)
        throw new Error('Payment transaction not found for refund');

      paymentTx.status = RazorpayTxStatusEnum.REFUNDED;

      // Append refund details to metadata (preserving history)
      paymentTx.metadata = {
        ...(paymentTx.metadata ?? {}),
        stage: 'payment_refunded',
        refunded: [...(paymentTx.metadata?.refunds || []), refundDetails],
      };

      await manager.save(paymentTx);

      // 2. Update related voucher(s)
      // await this.updateVoucherWithPayment(manager, paymentTx, refundDetails,paymentDetails);
      return paymentTx;
    });
  }

  /**
   * Marks a payment as disputed in the database.
   *
   * @param paymentId - The Razorpay payment ID.
   * @param disputeDetails - The details of the dispute.
   * @returns The updated payment transaction.
   */
  async markPaymentDispute(paymentId: string, disputeDetails: any) {
    const paymentTx = await this.paymentRepository.findOne({
      where: { gatewayPaymentId: paymentId },
    });

    if (!paymentTx) throw new Error('Payment transaction not found');

    paymentTx.status = RazorpayTxStatusEnum.DISPUTED;
    paymentTx.metadata = {
      ...(paymentTx.metadata ?? {}),
      stage: 'payment_dispute',
      disputed: disputeDetails,
    };

    await this.paymentRepository.save(paymentTx);
    return paymentTx;
  }

  /**
   * Verifies the payment signature.
   * @param orderId - The order ID.
   * @param paymentId - The payment ID.
   * @param signature - The signature to verify.
   * @returns True if the signature is valid, otherwise false.
   */
  async verifyPaymentDetails(body: VerifyPaymentDto): Promise<any> {
    try {
      const { gateway, orderId, paymentId, signature, clientResponse } = body;
      if (gateway === PaymentGatewayEnum.RAZORPAY) {
        const keySecret = this.configService.getDecrypted(
          'RAZORPAY_KEY_SECRET',
        );

        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        if (generatedSignature !== signature) {
          throw new BadRequestException('Invalid payment signature');
        }
      }

      const paymentTx = await this.paymentRepository.findOne({
        where: {
          gatewayOrderId: orderId,
        },
      });

      // Update payment transaction with client response
      if (clientResponse) {
        const mergedMetadata = {
          ...(paymentTx?.metadata ?? {}),
          clientResponse, // only overwrites this key
        };
        await this.paymentRepository.update(
          { gatewayOrderId: orderId },
          { metadata: mergedMetadata },
        );
      }

      if (!paymentTx) {
        throw new BadRequestException('Payment transaction not found');
      }

      if (paymentTx?.gatewayPaymentId != paymentId) {
        throw new BadRequestException(
          'Payment ID does not match the order. If its a successful payment, wait for sometime to update the payment status.',
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Payment verified successfully',
        data: {
          status: paymentTx?.status ?? RazorpayTxStatusEnum.PENDING,
          gatewayPaymentId: paymentTx?.gatewayPaymentId ?? '',
          amount: paymentTx?.amount ?? 0,
          method: paymentTx?.method ?? null,
          date: paymentTx?.paidAt ?? null,
        },
      };
    } catch (error) {
      logger.error('Payment verification error:', error);
      logsAndErrorHandling('paymentService - verifyPaymentSignature', error, {
        body,
      });
    }
  }
}
