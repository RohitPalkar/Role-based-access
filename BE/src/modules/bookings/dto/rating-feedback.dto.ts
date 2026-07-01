import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

export class RatingFeedbackDto {
  @IsNotEmpty()
  @IsString()
  opportunityId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(10)
  rating: number;

  @IsOptional()
  @IsString()
  @Length(0, 500, {
    message: 'Feedback text must be less than 500 characters.',
  })
  feedback: string;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}
