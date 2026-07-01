import { HttpException, HttpStatus } from '@nestjs/common';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';

/**
 * Canonical HTTP status mapping for every IOM error code. Centralised so
 * services don't pick statuses ad-hoc and the contract stays stable.
 */
const STATUS_MAP: Record<IomErrorCodeEnum, HttpStatus> = {
  [IomErrorCodeEnum.DUPLICATE_IOM_EXISTS]: HttpStatus.CONFLICT,
  [IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION]: HttpStatus.CONFLICT,
  [IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED]: HttpStatus.CONFLICT,
  [IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS]: HttpStatus.FORBIDDEN,
  [IomErrorCodeEnum.MANDATORY_FIELDS_MISSING]: HttpStatus.BAD_REQUEST,
  [IomErrorCodeEnum.BOOKING_NOT_ELIGIBLE]: HttpStatus.BAD_REQUEST,
  [IomErrorCodeEnum.BOOKING_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [IomErrorCodeEnum.IOM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [IomErrorCodeEnum.IOM_PDF_NOT_AVAILABLE]: HttpStatus.NOT_FOUND,
  [IomErrorCodeEnum.REJECTION_REASON_MISSING]: HttpStatus.CONFLICT,
  [IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD]: HttpStatus.BAD_REQUEST,
  [IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING]:
    HttpStatus.BAD_REQUEST,
};

/**
 * Default human-readable messages. Callers may override per-throw if
 * extra context helps the user (e.g. listing the missing fields).
 */
const DEFAULT_MESSAGES: Record<IomErrorCodeEnum, string> = {
  [IomErrorCodeEnum.DUPLICATE_IOM_EXISTS]:
    'An active IOM already exists for this booking.',
  [IomErrorCodeEnum.INVALID_STATUS_FOR_ACTION]:
    'The requested action is not allowed for the current IOM status.',
  [IomErrorCodeEnum.CONCURRENT_MODIFICATION_DETECTED]:
    'The IOM was modified by someone else. Please reload and try again.',
  [IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS]:
    'You do not have access to this project.',
  [IomErrorCodeEnum.MANDATORY_FIELDS_MISSING]:
    'One or more mandatory fields are missing.',
  [IomErrorCodeEnum.BOOKING_NOT_ELIGIBLE]:
    'The booking has not achieved the required milestone for IOM creation.',
  [IomErrorCodeEnum.BOOKING_NOT_FOUND]:
    'The referenced booking does not exist.',
  [IomErrorCodeEnum.IOM_NOT_FOUND]: 'The requested IOM does not exist.',
  [IomErrorCodeEnum.IOM_PDF_NOT_AVAILABLE]:
    'The IOM PDF has not been generated yet.',
  [IomErrorCodeEnum.REJECTION_REASON_MISSING]:
    'A rejection reason is required before resubmission.',
  [IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD]:
    'The payload contains fields the CRM user is not permitted to edit.',
  [IomErrorCodeEnum.LOYALTY_UPLOAD_PREREQUISITE_MISSING]:
    'Required loyalty upload prerequisites are missing.',
};

export type IomErrorBody = {
  code: IomErrorCodeEnum;
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Throws a properly-typed HttpException for an IOM error. Use this
 * instead of `new BadRequestException(...)` etc. so the response shape is
 * always `{ code, message, details? }`.
 */
export function throwIomError(
  code: IomErrorCodeEnum,
  details?: Record<string, unknown>,
  message?: string,
): never {
  const body: IomErrorBody = {
    code,
    message: message ?? DEFAULT_MESSAGES[code],
    ...(details ? { details } : {}),
  };
  throw new HttpException(body, STATUS_MAP[code]);
}
