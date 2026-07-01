export enum BatchStage {
  UNIT_ALLOTMENT = 'Unit Allotment',
  LAUNCH = 'Launch',
}

export enum BatchStatus {
  ACTIVE = 'Active',
  ARCHIVED = 'Archived',
  DELETED = 'Deleted',
}

export enum SlotStatusEnum {
  LOCKED = 'Locked',
  ACTIVE = 'Active',
  OPEN = 'Open',
  COMPLETED = 'Completed',
  ELAPSED = 'Elapsed',
}
export enum BatchVoucherStatus {
  MAPPED = 'Mapped',
  INVITED = 'Invited',
  ATTENDED = 'Attended',
  AGREEMENT_SIGNED = 'Agreement Signed',
  BOOKED = 'Booked',
}

export enum BatchQueueJobs {
  BATCH_STAGE_NOTIFICATION = 'batch-stage-notification',
  BATCH_DELETE_NOTIFICATION = 'batch-delete-notification',
}
