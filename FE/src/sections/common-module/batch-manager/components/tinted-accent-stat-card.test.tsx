import type { ComponentProps } from 'react';

import { it, vi, expect, describe } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { createTheme, ThemeProvider } from '@mui/material/styles';

import { BatchIdTypeStatTile, TintedAccentStatCard } from './tinted-accent-stat-card';

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('TintedAccentStatCard', () => {
  it('renders children and invokes onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderWithTheme(
      <TintedAccentStatCard accentColor="#2e7d32" onClick={onClick}>
        <span>Metric content</span>
      </TintedAccentStatCard>
    );

    expect(screen.getByText('Metric content')).toBeInTheDocument();
    await user.click(screen.getByText('Metric content').closest('.MuiCard-root') as HTMLElement);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('BatchIdTypeStatTile', () => {
  const baseProps: ComponentProps<typeof BatchIdTypeStatTile> = {
    title: 'Preferential',
    accent: '#2e7d32',
    fullyPaid: 1200,
    partiallyPaid: 300,
  };

  it('shows category total and FP/PP labels from locale', () => {
    renderWithTheme(<BatchIdTypeStatTile {...baseProps} />);

    expect(screen.getByText('Preferential')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('Fully paid')).toBeInTheDocument();
    expect(screen.getByText('Partially paid')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('renders typology breakdown when showTypology is true', () => {
    renderWithTheme(
      <BatchIdTypeStatTile
        {...baseProps}
        showTypology
        items={[
          { label: '1 BHK', value: 2 },
          { label: '2 BHK', value: 3 },
        ]}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1 BHK')).toBeInTheDocument();
    expect(screen.getByText('2 BHK')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
