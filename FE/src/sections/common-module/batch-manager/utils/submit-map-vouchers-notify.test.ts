import { toast } from 'sonner';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { mapBatchVouchersAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { buildMapVouchersPayload } from './build-map-vouchers-payload';
import { submitMapVouchersNotify } from './submit-map-vouchers-notify';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./build-map-vouchers-payload', () => ({
  buildMapVouchersPayload: vi.fn((input: { mode: string }) =>
    input.mode === 'now' ? {} : { notifyAt: '2026-06-20T09:00:00.000Z' }
  ),
}));

vi.mock('src/redux/actions/common-module/batch-manager-actions', () => ({
  mapBatchVouchersAction: vi.fn(),
}));

describe('submitMapVouchersNotify', () => {
  const unwrap = vi.fn();
  const dispatch = vi.fn(() => ({ unwrap }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapBatchVouchersAction).mockReturnValue({ type: 'mapBatchVouchersAction' } as never);
  });

  it('dispatches map action with empty body for notify now and shows success toast', async () => {
    unwrap.mockResolvedValue({ message: 'Vouchers mapped' });
    const onSuccess = vi.fn();

    await submitMapVouchersNotify(dispatch as never, '42', { mode: 'now' }, { onSuccess });

    expect(buildMapVouchersPayload).toHaveBeenCalledWith({ mode: 'now' });
    expect(mapBatchVouchersAction).toHaveBeenCalledWith({
      batchId: '42',
      body: {},
    });
    expect(dispatch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Vouchers mapped');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('uses scheduled payload when mode is scheduled', async () => {
    unwrap.mockResolvedValue({ message: 'Scheduled' });

    await submitMapVouchersNotify(dispatch as never, '7', {
      mode: 'scheduled',
      date: '2026-06-20',
      time: '09:00',
    });

    expect(buildMapVouchersPayload).toHaveBeenCalledWith({
      mode: 'scheduled',
      date: '2026-06-20',
      time: '09:00',
    });
    expect(mapBatchVouchersAction).toHaveBeenCalledWith({
      batchId: '7',
      body: { notifyAt: '2026-06-20T09:00:00.000Z' },
    });
  });

  it('shows default success message when API message is missing', async () => {
    unwrap.mockResolvedValue({});

    await submitMapVouchersNotify(dispatch as never, '1', { mode: 'now' });

    expect(toast.success).toHaveBeenCalledWith('Success');
  });

  it('shows error toast and rethrows when dispatch unwrap fails with Error', async () => {
    const err = new Error('Network failed');
    unwrap.mockRejectedValue(err);

    await expect(
      submitMapVouchersNotify(dispatch as never, '1', { mode: 'now' })
    ).rejects.toThrow('Network failed');

    expect(toast.error).toHaveBeenCalledWith('Network failed');
  });

  it('maps string rejection to toast error message', async () => {
    unwrap.mockRejectedValue('Batch ID is required');

    await expect(
      submitMapVouchersNotify(dispatch as never, '', { mode: 'now' })
    ).rejects.toBe('Batch ID is required');

    expect(toast.error).toHaveBeenCalledWith('Batch ID is required');
  });

  it('uses fallback error message for non-Error rejections', async () => {
    unwrap.mockRejectedValue({ code: 500 });

    await expect(
      submitMapVouchersNotify(dispatch as never, '1', { mode: 'now' })
    ).rejects.toEqual({ code: 500 });

    expect(toast.error).toHaveBeenCalledWith('Error mapping vouchers');
  });
});
