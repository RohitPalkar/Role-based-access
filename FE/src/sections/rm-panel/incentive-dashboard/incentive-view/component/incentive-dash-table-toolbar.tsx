import type { SelectChangeEvent } from '@mui/material';

import React, { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Badge,
  Button,
  Select,
  Tooltip,
  MenuItem,
  useTheme,
  InputLabel,
  Typography,
  IconButton,
  FormControl,
  OutlinedInput,
  useMediaQuery,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { normalizeValue, mapArrayToLabelValue, CapitalizeFirstLetter } from 'src/utils/helper';

import { fetchProjectByBrandIdAndCityId } from 'src/redux/actions/admin/common-actions';
import { fetchIncentiveCardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

// ----------------------------------------------------------------------

type Props = Readonly<{
  // eslint-disable-next-line react/no-unused-prop-types
  filters: any;
  updateFilters: (filters: any) => void;
  currentFilters: any;
  columnManager?: any; // Add columnManager prop
  onResetPage?: () => void;
  isUserView?: boolean;
  rmId?: any;
}>;

const monthOptions = [
  { value: 'jan', label: 'January' },
  { value: 'feb', label: 'February' },
  { value: 'mar', label: 'March' },
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' },
  { value: 'aug', label: 'August' },
  { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' },
  { value: 'nov', label: 'November' },
  { value: 'dec', label: 'December' },
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth(); // 0-based (Jan = 0)
const currentYear = currentDate.getFullYear();

const START_YEAR = 2025;

const currentFY = currentMonth >= 3 ? currentYear : currentYear - 1; // April starts new FY
const endYear = currentFY + 1; // current financial year

const yearOptions = Array.from({ length: endYear - START_YEAR + 1 }, (_, i) => {
  const year = START_YEAR + i;
  return { value: `${year}`, label: `${year}` };
});

const STATUS_HEADER_TEXT: Record<string, string> = {
  'all': 'Filter by Booking Date',
  'regularized': 'Filter by Regularisation Date',
  'unregularized': 'Filter by Booking Date',
  'qualified': 'Filter by Qualified Date',
  'management sale': 'Filter by Disqualified Date',
  'management approved credit sale': '',
  'cancelled': 'Filter by Cancelled Date',
};

function IncentiveDashTableToolbarBase({
  currentFilters,
  updateFilters,
  columnManager,
  onResetPage,
  isUserView,
  rmId,
}: Props) {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector((state) => state.common);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const projectOptions = useMemo(() => mapArrayToLabelValue(projects, 'name', 'id') || [], [projects]);

  const statusKey = currentFilters?.status || 'all';
  const headerText = STATUS_HEADER_TEXT[statusKey] || '';

  useEffect(() => {
    dispatch(fetchProjectByBrandIdAndCityId({}));
  }, [dispatch]);

  const menuActions = usePopover();
  const handleOnReset = useCallback(() => {
    setProjectFilter([]);
    setYear('');
    setMonth('');
    setErrorMessage(null);
    if (
      !currentFilters?.year &&
      !currentFilters?.month &&
      (currentFilters?.projectIds?.length === 0 || !currentFilters?.projectIds)
    )
      return;
    setFiltersApplied(false);
    updateFilters({ projectIds: [], year: null, month: null, page: 1, limit: 10 });
    // @ts-ignore
    dispatch(fetchIncentiveCardData(isUserView && rmId ? { rmId } : {}));
  }, [
    currentFilters?.month,
    currentFilters?.projectIds,
    currentFilters?.year,
    dispatch,
    updateFilters,
    isUserView,
    rmId,
  ]);

const handleProjectChange = useCallback((values: string[]) => {
    setProjectFilter(values);
}, []);

  const handleSelectYear = (event: SelectChangeEvent<string>) => {
    const selectedYear = event.target.value;
    setYear(selectedYear);
    setMonth('');
    if (month) {
      setErrorMessage(null);
    } else {
      setErrorMessage('Please select both Year and Month before applying filters');
    }
  };

  const handleSelectMonth = (event: SelectChangeEvent<string>) => {
    setMonth(event.target.value);
    setErrorMessage(null);
  };

const handleSearch = useCallback(
  (value: string) => {
    if (onResetPage) onResetPage();
    updateFilters({ search: value });
  },
  [updateFilters, onResetPage]
);


  const getApiCall = () => {
    const filterPayload = {
      projectIds: projectFilter,
      year,
      month,
      ...(isUserView && rmId && { rmId }), // Only add rmId if isUserView is true and rmId exists
    };
    updateFilters(filterPayload);
    dispatch(
      fetchIncentiveCardData({
        ...filterPayload,
      })
    );
    setFiltersApplied(true);
  };

  const renderMenuActions = () => (
    <FilterToolbar menuActions={menuActions} onReset={handleOnReset} onApply={getApiCall} title='Filters'>
      <FormControl sx={{ flexShrink: 0, width: { md: 500 } }}>
        <ControlledAutocomplete
          multiple
          label="Project"
          placeholder="Select projects"
          options={projectOptions}
          value={projectFilter}
          onChange={(value) =>{
            const val = normalizeValue(value, true) ?? [];
            handleProjectChange(val || [])}}
          limitTags={3}
        />
      </FormControl>
      {renderDateRange()}
    </FilterToolbar>
  );

  const renderDateRange = () => {
    const currentMonthIndex = new Date().getMonth();

    const filteredMonthOptions =
      year === `${currentYear}`
        ? monthOptions?.slice(0, currentMonthIndex + 1) // Show only months up to the current month
        : monthOptions; // Show all months for previous years

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: { xs: 1, md: 460 }  , maxWidth: {xs: 1, md: 500 }}}>
        <Typography sx={{ fontSize: '14px', fontWrap: 'wrap',  mb: 1.5 }}>
          {headerText}
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Duration
        </Typography>
        <FormControl
          sx={{ flexShrink: 0, mb: 2, width: { md: 500 } }}
          error={!year && !!errorMessage}
        >
          <InputLabel htmlFor="filter-role-select">Year</InputLabel>
          <Select
            name="year"
            value={year}
            onChange={handleSelectYear}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
            sx={{ width: '100%' }}
            input={<OutlinedInput label="Year" />}
            inputProps={{ id: 'filter-role-select' }}
          >
            {yearOptions?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl error={!month && !!errorMessage} sx={{ flexShrink: 0, width: { md: 500 } }}>
          <InputLabel htmlFor="filter-role-select">Month</InputLabel>
          <Select
            name="month"
            value={month}
            onChange={handleSelectMonth}
            MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
            sx={{ width: '100%' }}
            input={<OutlinedInput label="Month" />}
            inputProps={{ id: 'filter-role-select' }}
          >
            {filteredMonthOptions?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {CapitalizeFirstLetter(option.label)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {errorMessage && (
          <Typography sx={{ color: 'error.main', mt: 1 }}>{errorMessage}</Typography>
        )}
      </Box>
    );
  };

  return (
    <>
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          pr: { xs: 2.5, md: 1 },
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            gap: 2,
            width: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SearchInput
            value={currentFilters?.search || ''}
            placeholder="Search by Customer Name & Property Number"
            onChange={handleSearch}
          />


          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Tooltip title="Filters">
              {isMobile ? (
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="material-symbols:filter-list" />
                </IconButton>
              ) : (
                <Badge variant="dot" color="error" invisible={!filtersApplied}>
                  <Button
                    onClick={menuActions.onOpen}
                    startIcon={<Iconify icon="material-symbols:filter-list" />}
                    sx={{
                      whiteSpace: 'nowrap',
                      minWidth: 'auto',
                    }}
                  >
                    Filters
                  </Button>
                </Badge>
              )}
            </Tooltip>

            {/* Column Manager */}
            {columnManager && <ColumnManager {...columnManager} />}
          </Box>
        </Box>
      </Box>
      {menuActions.open && renderMenuActions()}
    </>
  );
}

export const IncentiveDashTableToolbar = React.memo(IncentiveDashTableToolbarBase);