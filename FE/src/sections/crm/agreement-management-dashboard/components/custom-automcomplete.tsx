import React from 'react';

import { TextField, Autocomplete } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';

const filter = createFilterOptions<any>();

export default function CrmUserAutocomplete({ options, value, onChange, label, placeholder }: any) {
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(option) => option?.name || ''}
      isOptionEqualToValue={(option, val) => option?.id === val?.id} // ensures correct selection
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);

        // Remove duplicates by name (keep first match)
        const seen = new Set<string>();
        return filtered.filter((opt) => {
          if (seen?.has(opt?.name?.toLowerCase())) return false;
          seen?.add(opt?.name?.toLowerCase());
          return true;
        });
      }}
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  );
}
