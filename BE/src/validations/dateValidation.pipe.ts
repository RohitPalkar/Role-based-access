import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { startOfDay } from 'date-fns';

@Injectable()
export class DateValidationPipe implements PipeTransform {
  async transform(value: any) {
    const dateValue = value.date;
    const inputDate = startOfDay(new Date(dateValue));
    if (isNaN(inputDate.getTime())) {
      throw new BadRequestException('Date must be a valid date.');
    }
    const currentDate = startOfDay(new Date());
    if (inputDate < currentDate) {
      throw new BadRequestException('Date must be a current or future date.');
    }
    return value;
  }
}
