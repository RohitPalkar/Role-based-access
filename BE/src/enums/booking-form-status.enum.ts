export enum BookingFormStatusEnum {
  NOT_SENT = 'Form not Sent',
  SENT = 'Form Sent',
  NEW = 'New',
  PRE_BOOKING_SUBMITTED = 'Pre-booking Docs Added',
  IN_PROGRESS = 'Form filling in progress',
  NOT_SIGNED = 'Form Filled, not signed',
  PARTIALLY_SIGNED = 'Partially signed',
  FILLING_BY_RM = 'Form filling started by RM',
  SIGNED = 'Signed - Digitally',
  SIGNED_OFFLINE = 'Signed offline',
  RM_UPLOAD_DONE = 'Signed - RM Uploaded Offline Docs',
  OFFICE_USE_SUBMITTED = 'Signed - Office Use Updated',
}

export enum AmendmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum OccupationEnum {
  PRIVATE_SALARIED = 'Employed - Private Sector',
  GOVT_SALARIED = 'Employed - Government',
  ARMED_FORCES = 'Armed Forces',
  BUSINESS = 'Business',
  RETIRED = 'Retired',
  HOMEMAKER = 'Homemaker',
  NOT_TO_SAY = 'I would rather not say',
}

export enum FormType {
  BOOKING = 'booking',
  REFERRAL = 'referral',
}

export enum LegalGuardianEnum {
  FATHER = 'Father',
  MOTHER = 'Mother',
}

export enum SignatureTypeEnum {
  DIGITAL = 'Digital Signature',
  WET = 'Wet Signature',
}

export enum MultiBookingStatusEnum {
  NOT_SIGNED = 'Not Signed',
  PARTIALLY_SIGNED = 'Partially Signed',
  SIGNED = 'All Signed',
}

export enum KYCTypeEnum {
  DIGILOCKER = 'DigiLocker',
  OCR = 'OCR',
  APPLIED = 'Applied',
}

export enum AmountAdjustmentEnum {
  LUMPSUM = 'Lumpsum',
  DISTINCT = 'Distinct',
}

export enum VoucherBookingStatusEnum {
  PENDING = 'Pending',
  PRE_FILLED = 'Pre Filled',
  SIGNED = 'Signed',
}
