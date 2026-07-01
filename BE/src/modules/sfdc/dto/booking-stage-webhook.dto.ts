import { Transform } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

/**
 * Inbound payload from SFDC for `POST /api/sfdc/webhooks/booking-stage`.
 *
 * SFDC sends two spaced PascalCase keys (`"Opportunity ID"`, `"Booking
 * Stage"`).
 * Both fields are mandatory; whitespace-only values are rejected because
 * the trim transform runs before `@IsNotEmpty` under NestJS's
 * `ValidationPipe({ transform: true })`. See the `SfdcWebhookController`
 * docstring for the full pipe-chain rationale — we deliberately do NOT
 * use `excludeExtraneousValues: true` so the global pipe stack can keep
 *
 * The webhook service is currently stateless: it only logs the payload
 * and returns `202 Accepted` (no DB writes, no events, no migrations).
 */
export class BookingStageWebhookDto {
  @IsDefined({ message: 'Opportunity ID is required' })
  @IsString({ message: 'Opportunity ID must be a string' })
  @IsNotEmpty({ message: 'Opportunity ID is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  opportunityId: string;

  @IsDefined({ message: 'Booking Stage is required' })
  @IsString({ message: 'Booking Stage must be a string' })
  @IsNotEmpty({ message: 'Booking Stage is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bookingStage: string;
}
