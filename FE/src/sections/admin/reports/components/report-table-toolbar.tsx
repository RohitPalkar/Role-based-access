import type { RootState } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';

import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies

import type { Dayjs } from 'dayjs';
import type { IReportsTableFilters } from 'src/types/admin/feature/reports';

import Box from '@mui/material/Box';
import { DatePicker } from '@mui/x-date-pickers';
import { Grid, Button, Typography, FormControl, CircularProgress } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { normalizeValue, mapArrayToLabelValue } from 'src/utils/helper';

import { fetchReports } from 'src/redux/actions/admin/reports-actions';
import { getRmDropdown } from 'src/redux/actions/admin/reports-user-actions';

import { LoadingScreen } from 'src/components/loading-screen';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

// ----------------------------------------------------------------------



type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IReportsTableFilters>;
  options: any;
  isAdminReport?: boolean;
  canExport?: boolean;
}>;

export function ReportsTableToolbar({
  filters,
  options,
  onResetPage,
  isAdminReport,
  canExport = true,
}: Props) {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rmSearch, setRmSearch] = useState('');
  const [selectedRm, setSelectedRm] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { loading } = useSelector((state: RootState) => state.reportsList);
  const { rmList, loading: rmLoading } = useAppSelector((state) => state.reportsUser);

  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rmOptions = useMemo(() => mapArrayToLabelValue(rmList, 'name', 'id'), [rmList]);

  // Initialize RM dropdown on mount
  useEffect(() => {
    if (isAdminReport) {
      dispatch(getRmDropdown(''));
    }
  }, [dispatch, isAdminReport]);

  // Debounced search effect
  useEffect(() => {
    if (isAdminReport) {
      // Clear previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Only search if there's a search term with minimum length, otherwise keep the initial list
      if (rmSearch.trim() && rmSearch.length >= 2) {
        debounceTimer.current = setTimeout(() => {
          dispatch(getRmDropdown(rmSearch));
        }, 500); // Increased debounce time to reduce API calls
      } else if (rmSearch.trim() === '') {
        // Reset to initial list when search is cleared
        dispatch(getRmDropdown(''));
      }

      // Cleanup function
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }
    return undefined;
  }, [dispatch, isAdminReport, rmSearch]);

  const handleStartDateChange = useCallback(
    (date: Dayjs | null) => {
      setStartDate(date);
      setError(null);
      // Month/year pickers: compare by calendar month so same month is never invalid due to day-of-month.
      if (endDate && date?.isAfter(endDate, 'month')) {
        setError('Start date should be before the end date.');
      } else {
        onResetPage();
      }
    },
    [endDate, onResetPage]
  );

  const handleEndDateChange = useCallback(
    (date: Dayjs | null) => {
      setEndDate(date);
      setError(null);
      if (startDate && date?.isBefore(startDate, 'month')) {
        setError('End date cannot be before the start date.');
      } else {
        onResetPage();
      }
    },
    [startDate, onResetPage]
  );

  const handleRmChange = useCallback(
    (newValue: string | null) => {
      setSelectedRm(newValue);
      filters.setState({ ...filters.state, rmId: newValue || null });
      
      // If clearing the selection, also clear the search input
      if (!newValue) {
        setRmSearch('');
      }
      
      onResetPage();
    },
    [filters, onResetPage]
  );

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError('Date range is required. Please select start date and end date.');
      return;
    }
    
    // Check if RM is mandatory for admin reports
    if (isAdminReport && !selectedRm) {
      setError('RM selection is required for admin reports. Please select an RM.');
      return;
    }
    
    try {
      const formattedStartDate = startDate.startOf('month').format('YYYY-MM-DD');
      const formattedEndDate = endDate.endOf('month').format('YYYY-MM-DD'); 

      const payload: { startDate: string; endDate: string; rmId?: string | null } = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      };

      if (isAdminReport && selectedRm) {
        payload.rmId = selectedRm;
      }

      await dispatch(fetchReports(payload));
    } catch (err) {
      console.error('Failed to download the report:', err);
    }
  };

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2.5,
        display: 'flex',
        pr: { xs: 2.5, md: 1 },
        flexDirection: { xs: 'column', md: 'column' },
        alignItems: { xs: 'start', md: 'start' },
      }}
    >
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: '500', mb: 2.5 }}>
            Monthly Incentive Statement
          </Typography>

          {/* RM Dropdown - only show when isAdminReport is true */}
          {isAdminReport && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormControl fullWidth required>
                  <Box sx={{ position: 'relative' }}>
                     <Box sx={{
                      '& .MuiInputLabel-root': {
                        transform: 'translate(14px, 10px) scale(1)',
                        '&.MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                      '& .MuiInputBase-input': {
                        padding: '8.5px 14px !important',
                        height: '10px !important',
                      },
                    }}>
                    <ControlledAutocomplete
                      required
                      options={rmOptions}
                      value={selectedRm}
                      onChange={(value) => handleRmChange(normalizeValue(value, false))}
                      label="Relationship Manager"
                      placeholder="Search and select RM"
                    />
                    </Box>
                    {rmLoading && (
                      <CircularProgress
                        size={20}
                        sx={{
                          position: 'absolute',
                          right: 40,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    )}
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
          )}

         {!isAdminReport && ( <Typography variant="h6" sx={{ fontWeight: '600', mb: 2.5 }}>
              Select Date
          </Typography>)}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormControl fullWidth>
                <DatePicker
                  label="Select Start Range"
                  views={['year', 'month']}
                  value={startDate}
                  onChange={handleStartDateChange}
                  minDate={dayjs('2025-01-01')}
                  maxDate={dayjs()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      placeholder: 'Month/Year',
                    },
                  }}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormControl fullWidth>
                <DatePicker
                  label="Select End Range"
                  views={['year', 'month']}
                  value={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate || dayjs('2025-01-01')}
                  maxDate={
                    startDate
                      ? (() => {
                          const year = startDate.year();
                          const month = startDate.month(); // 0-based (Jan = 0)
                          const fyEndYear = month >= 3 ? year + 1 : year; // April = 3
                          return dayjs(`${fyEndYear}-03-31`);
                        })()
                      : dayjs()
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      placeholder: 'Month/Year',
                    },
                  }}
                />
              </FormControl>
            </Grid>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Typography color="error">{error}</Typography>
            </Grid>
          )}

          {canExport && (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 2.5 }}>
              <Button
                type="submit"
                variant="contained"
                className="primaryBtn"
                onClick={handleDownload}
                disabled={loading}
                sx={{
                  height: '48px',
                  width: '212px',
                }}
              >
                Generate
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
