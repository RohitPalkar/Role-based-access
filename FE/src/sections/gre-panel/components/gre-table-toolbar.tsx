import type { Dayjs } from 'dayjs';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IgreTablelistTableFilters } from 'src/types/gre/grelist';

import dayjs from 'dayjs';
import React, { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers';
import Typography from '@mui/material/Typography';
import {
  Box,
  Button,
  Tooltip,
  useTheme,
  IconButton,
  FormControl,
  Autocomplete,
  useMediaQuery,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { route } from 'src/services/apiRoutes';
import { GET } from 'src/services/axiosInstance';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

import { AsyncAutocomplete } from './AsyncAutocomplete';

// ----------------------------------------------------------------------

export type Option = {
  label: string;
  value: string | number;
};
type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IgreTablelistTableFilters>;
  greTablelist: any[];
}>;

type Project = {
  id: number;
  name: string;
};

export function GreTableToolbar({ filters, onResetPage, greTablelist }: Props) {
  const menuActions = usePopover();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAppSelector((state) => state.auth);
  const userIdValue = (user as { userId: number })?.userId;
  const [draftFilters, setDraftFilters] = React.useState(filters.state);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Dayjs | null>(
    filters.state.startDate ? dayjs(filters.state.startDate) : null
  );
  const [localEndDate, setLocalEndDate] = useState<Dayjs | null>(
    filters.state.endDate ? dayjs(filters.state.endDate) : null
  );

  const initialEmpty = {
    name: '',
    id: '',
    projectName: '',
    customFilter1: '',
    sourcingRm: null,
    startDate: null,
    endDate: null,
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!userIdValue) return;
      setProjectsLoading(true);
      try {
        const url = `${route.GET_PROJECTS_BY_BRAND}?userId=${userIdValue}`;
        const response = await GET(url);
        const projectsData = response?.response?.response?.data?.projects || [];
        setProjects(projectsData);
      } catch (err: any) {
        console.error('Failed to fetch projects:', err);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [userIdValue]);

  // Convert projects to options for SelectWithClear
  const getProjectOptions = () =>
    projects.map((project) => ({
      value: project.name,
      label: project.name,
    }));

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setDraftFilters(filters.state);
    setLocalStartDate(filters.state.startDate ? dayjs(filters.state.startDate) : null);
    setLocalEndDate(filters.state.endDate ? dayjs(filters.state.endDate) : null);
    menuActions.onOpen(event);
  };

  const handleReset = () => {
    setDraftFilters(initialEmpty);
    setLocalStartDate(null);
    setLocalEndDate(null);
    setError(null);
  };

  const handleApply = () => {
    const finalFilters = {
      ...draftFilters,
      startDate: localStartDate ? localStartDate.format('YYYY-MM-DD') : null,
      endDate: localEndDate ? localEndDate.format('YYYY-MM-DD') : null,
    };

    filters.setState(finalFilters);
    onResetPage();
  };

  const getUniqueOptions = (key: string) => {
    const values = Array.from(
      new Set(greTablelist.map((item) => (item[key] != null ? String(item[key]) : '')))
    ).filter((v) => v !== '');
    return values.map((v) => ({ value: v, label: v }));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFilterOptions = (filterKey: string) => {
    switch (filterKey) {
      case 'primarySource':
        return getUniqueOptions('primarySource');

      default:
        return getUniqueOptions(filterKey);
    }
  };
  const fetchRMOptions = async (input: string): Promise<Option[]> => {
    try {
      const response = await GET(`${route.GET_RM_OPTIONS}?search=${encodeURIComponent(input)}`);
      const options = response?.response?.response?.data?.map(
        (i: { id: number; name: string }) => ({
          value: i?.id,
          label: i?.name,
        })
      );
      return options ?? [];
    } catch {
      return [];
    }
  };

  // Handle sourcing RM change
  const handleSourcingRmChange = (value: Option | null) => {
    setDraftFilters((prev) => ({
      ...prev,
      sourcingRm: value,
    }));
  };

  // Handle project name change
  const handleProjectNameChange = (value: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      projectName: value,
    }));
  };

  const handleStartDateChange = useCallback(
    (date: Dayjs | null) => {
      setLocalStartDate(date);
      setError(null);

      // Compare by calendar day so same-day range is valid regardless of time-of-day.
      if (localEndDate && date?.isAfter(localEndDate, 'day')) {
        setError('Start date should be before the end date.');
      }
    },
    [localEndDate]
  );

  const handleEndDateChange = useCallback(
    (date: Dayjs | null) => {
      setLocalEndDate(date);
      setError(null);

      if (localStartDate && date?.isBefore(localStartDate, 'day')) {
        setError('End date cannot be before the start date.');
      }
    },
    [localStartDate]
  );

  return (
    <Stack
      spacing={1.5}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: { xs: 0, md: 1.5 }, width: '100%' }}
    >
    <Stack direction="column" spacing={0.5} flexGrow={1} sx={{ width: 1 }}>
      <SearchInput
        value={filters.state.name || ''}
        placeholder="Search by Enquiry Ref No, Name, Mobile Number"
        onChange={(value) => {
          onResetPage();
          filters.setState({ name: value });
        }}
      />
    </Stack>

      {/* Filters trigger */}
      <Box display="flex" gap={1} alignItems="center" flexShrink={0}>
        <Tooltip title="Filters">
          {isMobile ? (
            <IconButton onClick={handleOpenFilters}>
              <Iconify icon="material-symbols:filter-list" />
            </IconButton>
          ) : (
            <Button
              onClick={handleOpenFilters}
              startIcon={<Iconify icon="material-symbols:filter-list" />}
              sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
            >
              Filters
            </Button>
          )}
        </Tooltip>
      </Box>

      {/* Popover-based Filters */}
      <FilterToolbar
        menuActions={menuActions}
        onReset={handleReset}
        onApply={handleApply}
        title="Filters"
      >
        {/* Project Name Filter - Using API data */}
        <Autocomplete
          options={getProjectOptions()} // array of { label, value }
          value={getProjectOptions().find((opt) => opt.value === draftFilters.projectName) || null}
          onChange={(_, newValue) => {
            handleProjectNameChange(newValue ? newValue.value : '');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Project Name"
              InputLabelProps={{ shrink: true }}
              placeholder="Select a project"
            />
          )}
          sx={{ flexShrink: 0, width: { xs: 1, md: 500 }, mb: 0 }}
          ListboxProps={{
            sx: {
              maxHeight: 240,
              '& .MuiMenuItem-root': {
                whiteSpace: 'normal',
                wordWrap: 'break-word',
              },
            },
          }}
        />

        <AsyncAutocomplete
          label="Sourcing RM"
          fetchOptions={fetchRMOptions}
          value={draftFilters.sourcingRm as Option | null}
          onChange={handleSourcingRmChange}
          placeholder="Search for RM..."
        />

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Select Date Range
        </Typography>

        <FormControl fullWidth sx={{ mb: 0 }}>
          <DatePicker
            label="Start Date"
            value={localStartDate}
            onChange={handleStartDateChange}
            maxDate={localEndDate || undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!error,
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 0 }}>
          <DatePicker
            label="End Date"
            value={localEndDate}
            onChange={handleEndDateChange}
            minDate={localStartDate || undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!error,
              },
            }}
          />
        </FormControl>
      </FilterToolbar>
    </Stack>
  );
}