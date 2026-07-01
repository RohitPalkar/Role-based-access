import type { ComponentProps } from 'react';

import { it, vi, expect, describe } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { createTheme, ThemeProvider } from '@mui/material/styles';

import BatchListingDialogBox from './batch-listing-dialog-box';

vi.mock('src/hooks/use-redux', () => ({
  useAppSelector: () => ({ batchSlotsDropdownData: [] }),
}));

const theme = createTheme();

function renderNotifyDialog(
  props: Partial<ComponentProps<typeof BatchListingDialogBox>> = {}
) {
  const setDialog = vi.fn();
  const utils = render(
    <ThemeProvider theme={theme}>
      <BatchListingDialogBox
        dialog
        setDialog={setDialog}
        type="NOTIFY_CX"
        onNotifySubmit={props.onNotifySubmit}
        isNotifySubmitting={props.isNotifySubmitting}
      />
    </ThemeProvider>
  );
  return { ...utils, setDialog };
}

describe('BatchListingDialogBox NOTIFY_CX', () => {
  it('keeps dialog open when onNotifySubmit rejects', async () => {
    const user = userEvent.setup();
    const onNotifySubmit = vi.fn().mockRejectedValue(new Error('Batch ID is required'));

    renderNotifyDialog({ onNotifySubmit });

    expect(screen.getByText('Notify Customers?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Notify Now' }));

    expect(onNotifySubmit).toHaveBeenCalledWith({ mode: 'now' });
    expect(screen.getByText('Notify Customers?')).toBeInTheDocument();
  });
});
