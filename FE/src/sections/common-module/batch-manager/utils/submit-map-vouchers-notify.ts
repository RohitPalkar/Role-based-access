import type { AppDispatch } from 'src/redux/store';

import { toast } from 'sonner';

import { mapBatchVouchersAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { buildMapVouchersPayload } from './build-map-vouchers-payload';

import type { NotifySubmitPayload } from '../components/batch-listing-dialog-box';

function getMapVouchersErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error mapping vouchers';
}

export async function submitMapVouchersNotify(
  dispatch: AppDispatch,
  batchId: string,
  payload: NotifySubmitPayload,
  { onSuccess }: { onSuccess?: () => void } = {}
): Promise<void> {
  try {
    const body = buildMapVouchersPayload(
      payload.mode === 'now'
        ? { mode: 'now' }
        : { mode: 'scheduled', date: payload.date, time: payload.time }
    );

    const result = await dispatch(
      mapBatchVouchersAction({ batchId: String(batchId), body })
    ).unwrap();
    toast.success(result.message || 'Success');
    onSuccess?.();
  } catch (error) {
    toast.error(getMapVouchersErrorMessage(error));
    throw error;
  }
}
