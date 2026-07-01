export enum EventMessagesEnum {
  OPP_UPDATED = 'opp_updated',
  OPP_PUSH_TO_SFDC = 'opp_push_to_sfdc',
  LEAD_CREATED = 'lead_created',
  CREATE_SFDC_LOG = 'create_sfdc_log',
  FORM_AMENDMENT_REQUEST = 'form_amendment_reset',
  GET_INCENTIVE_POLICY = 'get_incentive_policy',
  CREATE_NOTIFICATIONS = 'create_notifications',
  SEND_EMAIL = 'send_email',
  COMPOSE_EMAIL = 'compose_email',
  FETCH_FILE_FROM_S3 = 'fetch_file_from_s3',
  SV_FORM = 'site-visit_form',
  CREATE_ACTIVITY_LOG = 'CreateActivityLog',
  EOI_LEAD_PUSH = 'eoi_lead_push',
  MAP_AND_CONVERT = 'map_and_convert',
}

export enum WhatsAppEventsEnum {
  SEND_VOUCHER_LINK = 'send_voucher_link',
}

export enum UserActionsEnum {
  CREATED = 'Created',
  UPDATED = 'Updated',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded',
  EOI_LEAD_PUSH = 'EOI Lead Push',
  REVERT_EOI = 'Revert to EOI',
  MAP_AND_CONVERT = 'Map and Convert',
  BANK_DETAIL_EMAIL = 'Bank Detail Email Sent',
  DELETED = 'Deleted',
  UNIT_BLOCKED = 'Unit Blocked',
  UNIT_RELEASED = 'Unit Released',
  UNIT_REJECTED = 'Unit Rejected',
  UNIT_APPROVED = 'Unit Approved',
  MAP_VOUCHER = 'Batch Voucher Mapped',
  RECEPTION_CHECK_IN = 'Reception Desk Check-In',
}

export enum ComposeEmailsEnum {
  BOOKING_FORM = 'share_booking_form_link',
  REFERRAL_FORM = 'share_referral_form_link',
  GET_SIGNED_PDF = 'get_signed_pdf',
  VOUCHER_OTP = 'send_voucher_otp',
  SSO_OTP = 'send_sso_otp',
  OFFICE_USE_REVIEW = 'office_use_review',
  SIGNED_AGREEMENT_URL = 'send_signed_agreement_url',
  VOUCHER_FORM_CREATION = 'send_voucher_form_link',
  FILE_LOGIN_EMAIL = 'file_login_email',
  GROUP_LINK = 'send_group_link',
  AMOUNT_REVERSED = 'amount_reversed',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  QUEUE_ID_ASSIGNED = 'queue_id_assigned',
  VOUCHER_SUBMITTED = 'voucher_submitted',
  FORM_SUBMITTED_TO_RM_MIS = 'form_submitted_to_rm_mis',
  TRANSACTION_VERIFIED = 'transaction_verified',
  CUSTOMER_REQUESTED_CANCELLATION = 'customer_requested_cancellation',
  RM_REQUESTED_CANCELLATION = 'cancellation_request',
  CANCELLATION_REVOKED = 'cancellation_revoked',
  RM_DASHBOARD_DAILY_REPORT = 'rm_dashboard_daily_report',
  EMAIL_TO_CRM = 'email_to_crm',
  VOUCHER_CHANGE_REQUEST_APPROVAL = 'voucher_change_request_approval',
  VOUCHER_CHANGE_REJECTED = 'voucher_change_rejected',
  VOUCHER_CHANGE_APPROVED = 'voucher_change_approved',
  CRM_REQUESTED_CANCELLATION = 'crm_cancellation_request',
  CRM_CANCELLATION_INITIATED = 'crm_cancellation_initiated',
  CRM_CANCELLATION_REVOKED = 'crm_cancellation_revoked',
  CANCELLATION_APPROVED = 'cancellation_approved', //admin
  RM_CANCELLATION_REQUESTED = 'rm_cancellation_requested',
  OFFICE_USE_REMINDER = 'office_use_reminder',
  EOI_BANK_DETAIL_EMAIL = 'eoi_bank_detail_email',
  RECEIPT_UPLOAD = 'receipt_upload',
  UNIT_APPROVAL_REQUEST = 'unit_mapping_approval_request_bh',
  UNIT_APPROVE_REJECT = 'unit_mapping_approve_reject',
  LAUNCH_EVENT_INVITATION = 'launch_event_invitation',
  UNIT_ALLOTMENT_INVITATION = 'unit_allotment_invitation',
  BATCH_MOVE_NOTIFICATION = 'batch_move_notification',
  BATCH_CANCELLATION_NOTIFICATION = 'batch_cancellation_notification',
  IOM_TL_REJECTED = 'iom_tl_rejected',
  IOM_CRM_HEAD_REJECTED = 'iom_crm_head_rejected',
  IOM_FINANCE_REJECTED = 'iom_finance_rejected',
  FINANCE_APPROVER_REJECTED = 'finance_approver_rejected',
  // IOM approval cascade. Each template covers BOTH the next-stage
  // approver (TO) and the creator + prior approvers (CC), so a single
  // template body is reused for everyone on the recipient list.
  IOM_TL_APPROVED = 'iom_tl_approved',
  IOM_CRM_HEAD_APPROVED = 'iom_crm_head_approved',
  IOM_FINANCE_VERIFIED = 'iom_finance_verified',
  IOM_FINANCE_APPROVED = 'iom_finance_approved',
  // IOM submission. Fired the moment a CRM saves an IOM (the PATCH
  // endpoint auto-submits, moving IOM_TO_BE_CREATED -> IOM_CREATED)
  // and addressed to the project's assigned CRM TL so the TL can
  // pick up the freshly submitted IOM for review.
  IOM_CREATED_FOR_TL = 'iom_created_for_tl',
}
