import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from './modules/bookings/bookings.module';
import * as Entities from './entities/index';
import { LeegalityModule } from './modules/leegality/leegality.module';
import { ProjectTermsModule } from './modules/project_terms/project_terms.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AwsModule } from './modules/aws/aws.module';
import { UserRequestMiddleware } from './middleware/user-requests.middleware';
import { ResponseCatchMiddleware } from './middleware/response-catch.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { UserRequest } from './entities/user-request.entity';
import { CustomConfigModule } from './config/custom-config.module';
import { CustomConfigService } from './config/custom-config.service';
import { CorsMiddleware } from './middleware/cors.middleware';
import { CacheModule } from '@nestjs/cache-manager';
import { SfdcModule } from './modules/sfdc/sfdc.module';
import { SfdcLogsModule } from './modules/sfdc_logs/sfdc_logs.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HelperMiddleware } from './middleware/helper.middleware';
import { SanitizeMiddleware } from './middleware/sanitize.middleware';
import { BookingDocumentsModule } from './modules/booking_documents/booking_documents.module';
import { SsoModule } from './modules/sso/sso.module';
import { SalesModule } from './modules/sales/sales.module';
import { UsersModule } from './modules/users/user.module';
import { RolesModule } from './modules/roles/roles.module';
import { PdfService } from './modules/pdf/pdf.service';
import { PdfModule } from './modules/pdf/pdf.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './modules/notifications/notification.module';
import { SalaryUploadModule } from './modules/salary_upload/salary-upload.module';
import { UserFinanceModule } from './modules/user_finance/employee_list.module';
import { CronLogsModule } from './modules/crons/cron-logs.module';

import { SentryModule } from '@sentry/nestjs/setup';
import { SentryService } from './modules/sentry/sentry.service';
import { FormAmendmentRequestsModule } from './modules/form_amendment_requests/form_amendment_requests.module';
import { redisStore } from 'cache-manager-ioredis-yet';
import { sentryResponseContext } from './modules/sentry/sentry-response.context';
import { AppController } from './app.controller';
import { AgreementSignatureFormModule } from './modules/agreement_signature_form/agreement_signature_form.module';
import { SiteVisitLogInModule } from './modules/site_visit_logIn/site_visit_logIn.module';
import { SiteVisitCRUDModule } from './modules/site_visit_crud/site_visit.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UserActivityLogsModule } from './modules/user_activity_logs/user_activity_logs.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { IncentivesModule } from './modules/incentives/incentives.module';
import { MastersModule } from './modules/masters/masters.module';
import { DecentroModule } from './modules/decentro/decentro.module';
import { PineLabsModule } from './modules/pine-labs/pine-labs.module';
import { EmailTemplatesModule } from './modules/email_templates/email_templates.module';
import { GoogleModule } from './modules/google/google.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { DecryptRequestGuard } from './middleware/decryptRequest.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WsPublisherModule } from './modules/ws_publisher/ws_publisher.module';
import { InventoryUnitModule } from './modules/inventory-unit/inventory-unit.module';
import { QueueAuditModule } from './modules/queue_audit/queue-audit.module';
import { BullModule } from '@nestjs/bullmq';
import { IomModule } from './modules/iom/iom.module';
import { IomDropdownsModule } from './modules/iom-dropdowns/iom-dropdowns.module';
import { EoiManagerModule } from './modules/eoi_manager/eoi_manager.module';
import { RbacModule } from './modules/rbac/rbac.module';
@Module({
  imports: [
    SentryModule.forRoot(),
    CustomConfigModule,
    // CacheModule.register({ isGlobal: true }),
    CacheModule.registerAsync({
      useFactory: async (configService: CustomConfigService) => ({
        store: redisStore,
        host: configService.getDecrypted('CACHE_HOST'),
        port: configService.get<number>('CACHE_PORT'),
        ttl: configService.get<number>('CACHE_TTL') * 1000,
      }),
      inject: [CustomConfigService],
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [CustomConfigModule],
      useFactory: (configService: CustomConfigService) => ({
        connection: {
          host: configService.getDecrypted('CACHE_HOST'),
          port: configService.get<number>('CACHE_PORT'),
        },
      }),
      inject: [CustomConfigService],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [CustomConfigModule],
      useFactory: async (configService: CustomConfigService) => {
        return {
          type: 'mysql',
          host: configService.getDecrypted('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.getDecrypted('DB_USERNAME'),
          password: configService.getDecrypted('DB_PASSWORD'),
          database: configService.getDecrypted('DB_DATABASE'),
          entities: Entities,
          synchronize: false,
          timezone: 'Z',
          extra: {
            connectionLimit: configService.get<number>('DB_CONNECTION_POOL'),
          },
        };
      },
      inject: [CustomConfigService],
    }),
    // Generic DB audit for any BullMQ queue (`QueueJobAuditService` is @Global).
    QueueAuditModule,
    TypeOrmModule.forFeature([UserRequest]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // global: 100 req/min per IP
      },
    ]),
    BookingsModule,
    LeegalityModule,
    ProjectTermsModule,
    ReferralsModule,
    AwsModule,
    SfdcModule,
    SfdcLogsModule,
    BookingDocumentsModule,
    SsoModule,
    SalesModule,
    UsersModule,
    RolesModule,
    PdfModule,
    NotificationModule,
    SalaryUploadModule,
    UserFinanceModule,
    CronLogsModule,
    FormAmendmentRequestsModule,
    AgreementSignatureFormModule,
    SiteVisitLogInModule,
    SiteVisitCRUDModule,
    PaymentsModule,
    UserActivityLogsModule,
    WhatsappModule,
    IncentivesModule,
    MastersModule,
    DecentroModule,
    PineLabsModule,
    EmailTemplatesModule,
    GoogleModule,
    WsPublisherModule,
    InventoryUnitModule,
    IomModule,
    IomDropdownsModule,
    EoiManagerModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: DecryptRequestGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    PdfService,
    SentryService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        RequestContextMiddleware,
        UserRequestMiddleware,
        ResponseCatchMiddleware,
        CorsMiddleware,
        HelperMiddleware,
        SanitizeMiddleware,
      )
      .forRoutes('*');
    consumer.apply(sentryResponseContext).forRoutes('*');
  }
}
