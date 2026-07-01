import { BatchStage } from 'src/enums/batch-manager.enums';
export interface BatchNotificationJobPayload {
  userId?: number;
  batchId: string;
  stage?: BatchStage;
}
