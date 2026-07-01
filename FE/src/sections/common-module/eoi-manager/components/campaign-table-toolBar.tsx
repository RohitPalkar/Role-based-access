import type { CampaignTableFilters } from 'src/types/eoi/eoi';

import React, { useState, useEffect } from 'react';

import {
  Box,
  Button,
  Tooltip,
  useTheme,
  TextField,
  IconButton,
  FormControl,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { useDebounceMethod } from 'src/utils/helper';
import { PROJECT_STATUS_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { fetchCitiesByBrandId } from 'src/redux/actions/admin/common-actions';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

interface EOITableToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  filters: any;
  roleFilters: any;
  columnManager: any;
}

export const CampaignTableToolBar: React.FC<EOITableToolbarProps> = ({
  search,
  setSearch,
  filters,
  roleFilters,
  columnManager,
}) => {
  const filterMenuActions = usePopover(); // For filters (Campaign, Status, etc.)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const { cities } = useAppSelector((state) => state.common);

  const [selectedProjects, setSelectedProjects] = useState<{ label: string; value: string }[]>([]);

  const [selectedCities, setSelectedCities] = useState<{ label: string; value: string }[]>([]);

  // Debounced search handling
  const [localSearch, setLocalSearch] = React.useState(search);
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    dispatch(fetchCitiesByBrandId(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const selectedProjectStatus = filters.state.projectStatus || [];
    setSelectedProjects(selectedProjectStatus);
  }, [filters.state.projectStatus]);

  useEffect(() => {
    const selectedCity = filters.state.city || [];
    setSelectedCities(selectedCity);
  }, [filters.state.city]);

  const debouncedSetSearch = useDebounceMethod((value: string) => setSearch(value), 500);

  // Local draft filters to apply on click
  const [draftFilters, setDraftFilters] = React.useState<CampaignTableFilters>(filters.state);

  const initialEmpty: CampaignTableFilters = {
    search: '',
    projectStatus: [],
    city: [],
  };

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setDraftFilters(filters.state); // sync from current applied filters
    filterMenuActions.onOpen(event);
  };

  const handleReset = () => {
    filters.setState(initialEmpty);
    setSelectedProjects([]);
    setSelectedCities([]);
  };

  const handleApply = () => {
    filters.setState(draftFilters);
  };

  const citiesOptions =
    cities.map((city) => ({ label: city?.name, value: city?.id?.toString() })) || [];

  // Actions Menu - Only for actions like Export

  // Filters Menu - Only for filters like Campaign, Status, etc.
  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApply}
      title="Filter"
    >
      <FormControl sx={{ flexShrink: 0, width: { md: 400 }, gap: '1rem' }}>
        {/* Campaign Dropdown - Only show if user has permission for this filter */}
        {roleFilters?.find((i: any) => i?.id === 'projectStatus') && (
          <ControlledAutocomplete
            label="Project Status"
            options={PROJECT_STATUS_OPTIONS}
            value={selectedProjects?.map((opt) => opt?.value)}
            onChange={(val) => {
              const values = (val as string[]) || [];
              const selected = PROJECT_STATUS_OPTIONS?.filter((opt) => values?.includes(opt?.value));
              setSelectedProjects(selected);
              setDraftFilters((prev) => ({ ...prev, projectStatus: selected }));
            }}
            multiple
          />
        )}
        {roleFilters?.find((i: any) => i?.id === 'city') && (
          <ControlledAutocomplete
            label="City"
            options={citiesOptions}
            value={selectedCities?.map((opt) => opt?.value)}
            onChange={(val) => {
              const values = (val as string[]) || [];
              const selected = citiesOptions?.filter((opt) => values?.includes(opt?.value));
              setSelectedCities(selected);
              setDraftFilters((prev) => ({ ...prev, city: selected }));
            }}
            multiple
          />
        )}
      </FormControl>
    </FilterToolbar>
  );

  return (
    <>
      <Box
        sx={{
          p: 1.5,
          gap: 1,
          display: 'flex',
          pr: { xs: 1.5, md: 0.5 },
          flexDirection: { xs: 'row', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
          width: '100%',
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
          {/* Search */}
          <TextField
            placeholder={uiText.campaignListing.searchBoxPlaceholder}
            value={localSearch}
            size="small"
            onChange={(e) => {
              const inputValue = e.target.value;
              setLocalSearch(inputValue);
              debouncedSetSearch(inputValue);
            }}
            sx={{ flexGrow: 1, minWidth: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {roleFilters?.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {/* Filters trigger */}
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
                  {uiText.common.filters}
                </Button>
              )}
            </Tooltip>

            {/* Column Manager */}

            {/* Actions Menu - only show if export is enabled */}
          </Box>
        )}
      </Box>
      {renderFilterMenuActions()}
      {/* Render filters menu */}

      {/* Render actions menu only if export is enabled */}
    </>
  );
};
