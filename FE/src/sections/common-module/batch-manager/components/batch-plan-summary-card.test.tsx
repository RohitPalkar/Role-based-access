import type { ComponentProps } from 'react';

import { it, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';

import { createTheme, ThemeProvider } from '@mui/material/styles';

import { BatchPlanSummaryCard } from './batch-plan-summary-card';
import { formatScheduleTimeForCopy } from '../utils/batch-manager-shared';

const theme = createTheme();

const filledPlanSummary = {
  slotCount: 4,
  scheduleTimeSlotCount: 10,
  capacity: 200,
  requiredTotal: 150,
  dayCount: 2,
};

const baseProps: ComponentProps<typeof BatchPlanSummaryCard> = {
  planValid: false,
  planSummary: null,
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  durationMinutes: '60',
  recordsPerBatch: '50',
  sameTimeForAllDates: true,
  sharedStartTime: '09:00',
  sharedEndTime: '17:00',
  formatScheduleTime: formatScheduleTimeForCopy,
};

function renderCard(props: Partial<ComponentProps<typeof BatchPlanSummaryCard>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <BatchPlanSummaryCard {...baseProps} {...props} />
    </ThemeProvider>
  );
}

describe('BatchPlanSummaryCard', () => {
  it('renders empty state when plan is not valid', () => {
    renderCard();

    expect(screen.getByText('Complete the plan to see your estimate')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /batch schedule overview/i })
    ).not.toBeInTheDocument();
  });

  it('renders filled summary with deficit status when batches required exceed provision', () => {
    renderCard({
      planValid: true,
      planSummary: {
        ...filledPlanSummary,
        requiredTotal: 500,
        slotCount: 4,
        scheduleTimeSlotCount: 4,
      },
    });

    expect(screen.getByRole('heading', { name: /batch schedule overview/i })).toBeInTheDocument();
    expect(screen.getByText('Deficit in no. of Batches')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders sufficient status when batches required equals provision', () => {
    renderCard({
      planValid: true,
      planSummary: {
        slotCount: 3,
        scheduleTimeSlotCount: 3,
        capacity: 150,
        requiredTotal: 150,
        dayCount: 1,
      },
      recordsPerBatch: '50',
    });

    expect(screen.getByText('Sufficient')).toBeInTheDocument();
  });
});
