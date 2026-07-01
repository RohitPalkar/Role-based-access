import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { EmployeeListTableFilters } from 'src/types/finance-admin/employee-list';

import Box from '@mui/material/Box';

import SearchInput from 'src/components/search-field-toolbar/SearchInput';

// ----------------------------------------------------------------------

export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  getLists: (value: any) => void;
  filters: UseSetStateReturn<EmployeeListTableFilters>;
}>;

export function EmployeeListTableToolbar({ filters, onResetPage, getLists }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;
  return (
    <Box
      sx={{
        p: 1.5,
        gap: 1,
        display: 'flex',
        pr: { xs: 1.5, md: 0.5 },
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      <Box
        sx={{
          gap: 1,
          width: 1,
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
      <SearchInput
        value={currentFilters?.name || ''}
        placeholder="Search by Name & Email Address"
        onChange={(value) => {
          const sanitized = value.replaceAll(/[^a-zA-Z0-9\s@.]/g, '');
          onResetPage();
          updateFilters({ name: sanitized });
        }}
      />
      </Box>
    </Box>
  );
}
