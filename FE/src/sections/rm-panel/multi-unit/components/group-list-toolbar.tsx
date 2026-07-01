import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IOpportunityListTableFilters } from 'src/types/rm-panel/user';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IOpportunityListTableFilters>;
}>;

export function GroupListTableToolbar({ filters, onResetPage }: Props) {
  const searchLength = filters.state.name?.length || 0;
  const showHelperText = searchLength > 0 && searchLength < 3;

  return (
    <Stack
      spacing={1.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      mt={{ xs: 0, sm: 1 }}
      sx={{ p: { xs: 0, md: 1.5 }, width: '100%' }}
    >
      <Stack direction="column" spacing={0.5} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          size="small"
          value={filters.state.name}
          onChange={(event) => {
            const { value } = event.target;
            onResetPage();
            filters.setState({ name: value });
          }}
          placeholder="Search by Group Name"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify
                  icon="eva:search-fill"
                  sx={{ color: 'text.disabled', width: 18, height: 18 }}
                />
              </InputAdornment>
            ),
          }}
          inputProps={{
            maxLength: 30,
          }}
          sx={{
            '& .MuiInputBase-root': {
              minHeight: '36px',
            },
            '& .MuiInputBase-input': {
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              padding: '8px 12px',
            },
          }}
        />

        {showHelperText && (
          <Typography variant="caption" color="black" sx={{ ml: 1 }}>
            Please enter at least 3 characters to search
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
