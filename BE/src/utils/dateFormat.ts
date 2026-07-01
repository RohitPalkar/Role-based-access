import { TransformFnParams } from 'class-transformer';
import * as moment from 'moment-timezone';
import { isValid, parse, startOfDay } from 'date-fns';

export const formatDate = (date: string, format: string): string => {
  const parsedDate = moment.tz(
    date,
    ['DD MMM YYYY', 'D MMM YYYY', 'DD-MM-YYYY', 'DD/MM/YYYY', moment.ISO_8601],
    true,
    'Asia/Kolkata',
  );
  if (!date || !parsedDate.isValid()) {
    return null;
  }
  return parsedDate.format(format);
};

export const transformInputDate = ({
  value,
}: TransformFnParams): Date | null => {
  if (!value || value === '') {
    return null;
  }

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = parse(value.trim(), 'yyyy-MM-dd', new Date());
  } else if (typeof value === 'number') {
    date = new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  if (!date || !isValid(date)) {
    return null;
  }

  return startOfDay(date);
};
