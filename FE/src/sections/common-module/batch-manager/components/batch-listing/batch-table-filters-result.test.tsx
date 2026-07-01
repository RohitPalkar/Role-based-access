import { it, vi, expect, describe } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent } from '@testing-library/react';

import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

import { defaultSettings } from 'src/components/settings/config-settings';

import { BatchTableFiltersResult } from './batch-table-filters-result';

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const theme = createTheme(defaultSettings);

function renderFilters(props: {
  search: string;
  setSearch: (value: string) => void;
  onResetPage?: () => void;
}) {
  return render(
    <CssVarsProvider theme={theme}>
      <BatchTableFiltersResult
        search={props.search}
        setSearch={props.setSearch}
        totalResults={3}
        onResetPage={props.onResetPage}
      />
    </CssVarsProvider>
  );
}

describe('BatchTableFiltersResult', () => {
  it('clears search when chip delete is clicked and calls onResetPage', () => {
    const setSearch = vi.fn();
    const onResetPage = vi.fn();

    const { container } = renderFilters({ search: 'alpha', setSearch, onResetPage });

    const deleteIcon = container.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).not.toBeNull();
    fireEvent.click(deleteIcon as Element);

    expect(onResetPage).toHaveBeenCalled();
    expect(setSearch).toHaveBeenCalledWith('');
  });

  it('resets all filters when reset control is used', async () => {
    const user = userEvent.setup();
    const setSearch = vi.fn();
    const onResetPage = vi.fn();

    renderFilters({ search: 'batch-1', setSearch, onResetPage });

    const clearButtons = screen.getAllByRole('button', { name: /^clear$/i });
    await user.click(clearButtons.at(-1)!);

    expect(onResetPage).toHaveBeenCalled();
    expect(setSearch).toHaveBeenCalledWith('');
  });
});
