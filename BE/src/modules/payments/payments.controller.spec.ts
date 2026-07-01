import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BadRequestException } from '@nestjs/common';
import { SUCCESS } from 'src/config/constants';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60,
            limit: 100, // global: 100 req/min per IP
          },
        ]),
      ],
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createOrder: jest.fn(),
            handleWebhook: jest.fn(),
            handleEaseBuzzWebhook: jest.fn(),
            createOrderForEaseBuzz: jest.fn?.(),
            verifyPaymentDetails: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    // cast to jest.Mocked<PaymentsService> so TypeScript knows these are jest mocks
    paymentsService = module.get(
      PaymentsService,
    ) as unknown as jest.Mocked<PaymentsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // CREATE ORDER
  it('should create an order successfully', async () => {
    const dto = { amount: 5000, currency: 'INR' } as any;
    const mockOrder = { id: 'order_123', amount: 5000 };

    paymentsService.createOrder.mockResolvedValue(mockOrder);

    const result = await controller.createOrder(dto);

    expect(result).toEqual(mockOrder);
    expect(paymentsService.createOrder).toHaveBeenCalledWith(dto);
  });

  it('should throw error if createOrder fails', async () => {
    paymentsService.createOrder.mockRejectedValue(new Error('Failed'));

    await expect(controller.createOrder({} as any)).rejects.toThrow('Failed');
  });

  // WEBHOOK (Razorpay)
  it('should handle webhook successfully', async () => {
    const mockResponse = { message: 'ok', statusCode: SUCCESS };
    paymentsService.handleWebhook.mockResolvedValue(mockResponse);
    const result = await controller.handleWebhook(
      { rawBody: '{"event":"payment.captured"}' },
      'test-signature',
    );

    expect(result).toEqual(mockResponse);
    expect(paymentsService.handleWebhook).toHaveBeenCalledWith(
      '{"event":"payment.captured"}',
      'test-signature',
    );
  });

  it('should throw BadRequestException if webhook signature invalid', async () => {
    paymentsService.handleWebhook.mockImplementation(() => {
      throw new BadRequestException('Invalid signature');
    });

    await expect(
      controller.handleWebhook({ rawBody: '{}' }, 'wrong-signature'),
    ).rejects.toThrow(BadRequestException);
  });

  // EASEBUZZ WEBHOOK
  it('should handle EaseBuzz webhook successfully', async () => {
    const webhookPayload = { txnid: 'txn_1', status: 'success' };
    const mockResponse = { message: 'processed', statusCode: SUCCESS };

    paymentsService.handleEaseBuzzWebhook.mockResolvedValue(mockResponse);

    const result = await controller.handleEaseBuzzWebhook(webhookPayload);

    expect(result).toEqual(mockResponse);
    expect(paymentsService.handleEaseBuzzWebhook).toHaveBeenCalledWith(
      webhookPayload,
    );
  });

  it('should throw when EaseBuzz handler fails', async () => {
    const webhookPayload = { txnid: 'txn_2', status: 'failed' };
    paymentsService.handleEaseBuzzWebhook.mockRejectedValue(
      new Error('easebuzz error'),
    );

    await expect(
      controller.handleEaseBuzzWebhook(webhookPayload),
    ).rejects.toThrow('easebuzz error');
  });

  // VERIFY PAYMENT
  it('should verify payment successfully', async () => {
    const mockResponse = {
      message: 'Payment verified successfully',
      data: {
        status: 'Success',
        gatewayPaymentId: 'pay_123',
        amount: 1000,
        method: 'card',
        date: new Date(),
      },
    };
    paymentsService.verifyPaymentDetails.mockResolvedValue(mockResponse);

    const verifyDto = {
      gateway: PaymentGatewayEnum.RAZORPAY,
      orderId: 'order_123',
      paymentId: 'pay_123',
      signature: 'valid_signature',
    };

    const result = await controller.verifyPayment(verifyDto);

    expect(result).toEqual(mockResponse);
    expect(paymentsService.verifyPaymentDetails).toHaveBeenCalledWith(
      verifyDto,
    );
  });

  it('should throw BadRequestException on invalid payment signature', async () => {
    paymentsService.verifyPaymentDetails.mockImplementation(() => {
      throw new BadRequestException('Invalid payment signature');
    });

    await expect(
      controller.verifyPayment({
        gateway: PaymentGatewayEnum.RAZORPAY,
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'invalid_signature',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
