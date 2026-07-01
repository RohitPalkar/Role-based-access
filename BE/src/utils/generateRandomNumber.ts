import { randomInt, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { QueueTypeEnum } from 'src/enums/eoi-form.enums';

export const generateRandomNumber = (length: number): string => {
  if (length <= 0) {
    throw new Error('Length must be greater than 0');
  }

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  return randomInt(min, max + 1).toString(); // max is exclusive
};

export const generateOtp = (): string => {
  return randomInt(100000, 1000000).toString(); // 6-digit OTP
};

export const generateOrderId = (): string => {
  const timestamp = Date.now(); // milliseconds
  const random = randomBytes(3).toString('hex'); // small random string
  return `ORD-${timestamp}-${random}`; // Example: ORD-1724157109234-a3f2c1
};

/**
 * Generates a random 16-character alphanumeric ID.
 * Used for voucher IDs, channel partner links, and other unique identifiers.
 *
 * @returns 16-character alphanumeric string
 */
export const generateRandomId = (): string => {
  const randomPart = randomBytes(12)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16); // 16-character alphanumeric
  return randomPart;
};

/**
 * Generates a UUID v4 string.
 * Used for reference IDs, transaction IDs, and other unique identifiers that require UUID format.
 *
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export const generateUuid = (): string => {
  return uuidv4();
};

export const generateUniqueReferenceId = (
  initials: string,
  counter: number,
): string => {
  const paddedCounter = String(counter).padStart(4, '0'); // Ensure 4 digits
  return `${initials}-${paddedCounter}`; // Example: CAM-0001
};

export const prepareQueueId = (
  counter: number,
  queueType?: QueueTypeEnum,
): string => {
  const paddedCounter = String(counter).padStart(4, '0'); // Ensure 4 digits
  return `${queueType}-${paddedCounter}`; // Example: VQI-000001
};

export const generateVqiQueueId = (counter: number): string => {
  return prepareQueueId(counter, QueueTypeEnum.VQI);
};

export const generateStdQueueId = (counter: number): string => {
  return prepareQueueId(counter, QueueTypeEnum.STD);
};

export const generatePreQueueId = (counter: number): string => {
  return prepareQueueId(counter, QueueTypeEnum.PRE);
};

export const generateQueueCode = (
  initials: string,
  sequenceId: string,
): string => {
  const letters = 'ABCDEFGHIJ';
  const n: number =
    sequenceId.split('-').length > 1
      ? parseInt(sequenceId.split('-')[1], 10)
      : 0;
  if (n <= 0) return null;

  // prefix letter (cycles every 10 numbers)
  const prefix = letters[Math.floor((n - 1) / 10) % 10];

  // middle number (dynamic length: 2 digits until 9900, then 3+)
  const middleNum = Math.floor((n - 1) / 100) + 1;
  const middle =
    middleNum <= 99
      ? String(middleNum).padStart(2, '0')
      : String(middleNum).padStart(3, '0');

  // suffix letter (cycles every number in groups of 10)
  const suffix = letters[(n - 1) % 10];

  return `${initials}${prefix}${middle}${suffix}`;
};
