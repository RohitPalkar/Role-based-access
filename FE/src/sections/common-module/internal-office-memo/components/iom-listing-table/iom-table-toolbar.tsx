
import type { AppDispatch } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IomTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import React, { useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import {
  Box,
  Button,
  Tooltip,
  useTheme,
  MenuList,
  MenuItem,
  TextField,
  IconButton,
  Typography,
  FormControl,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { useDebounceMethod } from 'src/utils/helper';
import { PointsClassification } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { downloadIomListing } from 'src/redux/actions/common-module/iom-management-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form/fields';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import {
  mapProjectDropdownOptions,
  mapIomStatusDropdownOptions,
  mapInvoiceStatusDropdownOptions,
} from 'src/sections/common-module/internal-office-memo/iom-config';

interface IomTableToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  filters: UseSetStateReturn<IomTableFilters>;
  roleFilters: any;
  columnManager: any;
  dataLength: number;
  canExport?: boolean;
  /** Role-based: server refresh / SAP sync (see `canRefresh` in role-based-permissions). */
  canRefresh?: boolean;
  onRefresh: () => void;
}

export const POINTS_CLASSIFICATION_OPTIONS = Object?.values(PointsClassification)?.map((val) => ({
  label: val,
  value: val,
}));

export const IomTableToolbar: React.FC<IomTableToolbarProps> = ({
  search,
  setSearch,
  filters,
  roleFilters,
  columnManager,
  dataLength,
  canExport = true,
  canRefresh = false,
  onRefresh,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { iomDropdowns } = useAppSelector((state) => state.common);
  const filterMenuActions = usePopover();
  const menuActions = usePopover();
  const dateMenuActions = usePopover();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showActionsMenu = Boolean(canExport) || canRefresh;

  // Debounced search handling
  const [localSearch, setLocalSearch] = React.useState(search);
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const debouncedSetSearch = useDebounceMethod((value: string) => setSearch(value), 500);

  // Local draft filters to apply on click
  const [draftFilters, setDraftFilters] = React.useState<IomTableFilters>(filters.state);

  const monthDateError = fIsAfter(draftFilters.startDate, draftFilters.endDate);
  const [startDateRequired, setStartDateRequired] = React.useState(false);
  const [endDateRequired, setEndDateRequired] = React.useState(false);

  const [showRefreshConfirm, setShowRefreshConfirm] = React.useState(false);

  const projectOptions = useMemo(
    () => mapProjectDropdownOptions(iomDropdowns?.projects),
    [iomDropdowns?.projects]
  );

  const iomStatusOptions = useMemo(
    () => mapIomStatusDropdownOptions(iomDropdowns?.IomStatus),
    [iomDropdowns?.IomStatus]
  );

  const invoiceStatusOptions = useMemo(
    () => mapInvoiceStatusDropdownOptions(iomDropdowns?.InvoiceStatus),
    [iomDropdowns?.InvoiceStatus]
  );

  const getDateErrorMessage = () => {
    if (monthDateError) {
      return uiText.commonValidations.endDateLaterThanStart;
    }
    if (startDateRequired) {
      return uiText.commonValidations.startDate;
    }
    return uiText.commonValidations.endDate;
  };

  const initialEmpty: IomTableFilters = {
    iomStatus: [],
    search: '',
    project: [],
    invoiceStatus: [],
    pointsClassification: '',
    startDate: null,
    endDate: null,
  };

  const methods = useForm<{
    startDate: IomTableFilters['startDate'];
    endDate: IomTableFilters['endDate'];
  }>({
    defaultValues: {
      startDate: null,
      endDate: null,
    },
  });

  const { watch, reset } = methods;
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    setDraftFilters((prev) => ({
      ...prev,
      startDate: watchedStartDate || null,
      endDate: watchedEndDate || null,
    }));
  }, [watchedStartDate, watchedEndDate]);

  useEffect(() => {
    setDraftFilters(filters.state);

    methods.setValue('startDate', filters.state.startDate || null);
    methods.setValue('endDate', filters.state.endDate || null);
  }, [filters.state, methods]);

  useEffect(() => {
    if (watchedStartDate && !watchedEndDate) {
      setEndDateRequired(true);
    } else {
      setEndDateRequired(false);
    }

    if (watchedEndDate && !watchedStartDate) {
      setStartDateRequired(true);
    } else {
      setStartDateRequired(false);
    }
  }, [watchedStartDate, watchedEndDate]);

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setDraftFilters(filters.state); // sync from current applied filters
    methods.setValue('startDate', filters.state.startDate || null);
    methods.setValue('endDate', filters.state.endDate || null);
    filterMenuActions.onOpen(event);
  };

  const handleReset = () => {
    filters.setState(initialEmpty);
    reset({ startDate: null, endDate: null });
  };

  const handleApply = () => {
    filters.setState(draftFilters);
  };

  const handleRefreshClick = () => {
    setShowRefreshConfirm(true);
    menuActions.onClose();
  };

  const handleExport = () => {
    const {
      iomStatus,
      invoiceStatus,
      project,
      pointsClassification,
      startDate,
      endDate,
    } = filters.state;

    const toProjectIds = (values: string[]) =>
      values
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));

    const payload: Record<string, any> = {
      ...(iomStatus?.length > 0 && { iomStatus }),
      ...(invoiceStatus?.length > 0 && { invoiceStatus }),
      ...(project?.length > 0 && { projects: toProjectIds(project) }),
      ...(pointsClassification && {
        pointsClassification: pointsClassification.toUpperCase(),
      }),
      ...(startDate && { startDate: dayjs(startDate).format('YYYY-MM-DD') }),
      ...(endDate && { endDate: dayjs(endDate).format('YYYY-MM-DD') }),
    };

    dispatch(downloadIomListing(payload));
  };

  const handleUserRefresh = async () => {
    try {
      await onRefresh?.();
      setShowRefreshConfirm(false);
    } catch (error) {
      toast.error('Failed to refresh data');
      setShowRefreshConfirm(false);
    }
  };

  const renderDatePickerMenuActions = () => (
    <FilterToolbar
      title={uiText.common.dateRange}
      menuActions={dateMenuActions}
      onReset={() => {
        reset({ startDate: null, endDate: null });
        setDraftFilters((prev) => ({
          ...prev,
          startDate: null,
          endDate: null,
        }));
      }}
      onApply={() => {
        const values = methods.getValues();
        filters.setState({
          startDate: values.startDate || null,
          endDate: values.endDate || null,
        });
        dateMenuActions.onClose();
      }}
    >
      <FormProvider {...methods}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Field.Date name="startDate" label="Start Date" />
          <Field.Date name="endDate" label="End Date" />

          {(monthDateError || startDateRequired || endDateRequired) && (
            <Typography variant="caption" color="error">
              {getDateErrorMessage()}
            </Typography>
          )}
        </Box>
      </FormProvider>
    </FilterToolbar>
  );

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApply}
      title="Filters"
    >
      <FormControl sx={{ flexShrink: 0, width: { md: 400 }, gap: '1rem' }}>
        {roleFilters?.find((i: any) => i?.id === 'iomStatus') && (
          <ControlledAutocomplete
            label="IOM Status"
            value={draftFilters.iomStatus || []}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                iomStatus: (value as string[]) || [],
              }))
            }
            options={iomStatusOptions}
            multiple
          />
        )}

        {roleFilters?.find((i: any) => i?.id === 'project') && (
          <ControlledAutocomplete
            label="Project"
            multiple
            value={draftFilters.project || []}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                project: (value as string[]) || [],
              }))
            }
            options={projectOptions}
          />
        )}

        {roleFilters?.find((i: any) => i?.id === 'invoiceStatus') && (
          <ControlledAutocomplete
            label="Invoice Status"
            multiple
            value={draftFilters.invoiceStatus || []}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                invoiceStatus: value as string[],
              }))
            }
            options={invoiceStatusOptions}
          />
        )}

        {roleFilters?.find((i: any) => i?.id === 'pointsClassification') && (
          <ControlledAutocomplete
            label="Points Classification"
            value={draftFilters.pointsClassification || null}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                pointsClassification: (value as string) || '',
              }))
            }
            options={POINTS_CLASSIFICATION_OPTIONS}
          />
        )}
      </FormControl>
    </FilterToolbar>
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        {canExport && (
          <MenuItem
            onClick={() => {
              handleExport();
              menuActions.onClose();
            }}
            disabled={dataLength === 0}
          >
            <Iconify icon="solar:export-bold" />
            {uiText.button.export}
          </MenuItem>
        )}
        {canRefresh && (
          <MenuItem onClick={handleRefreshClick}>
            <Iconify icon="solar:refresh-bold" />
            {uiText.button.fetchFromSAP}
          </MenuItem>
        )}
      </MenuList>
    </CustomPopover>
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
            placeholder={uiText.internalOfficeMemo.searchPlaceholder}
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {roleFilters?.some((f: any) => f?.id === 'dateRange') && (
            <Button
              variant="outlined"
              onClick={dateMenuActions.onOpen}
              endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
              sx={{
                color: 'text.primary',
                borderColor: 'grey.300',
                '&:hover': {
                  borderColor: 'grey.500',
                },
                whiteSpace: 'nowrap',
              }}
            >
              {uiText.common.dateRange}
            </Button>
          )}
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
            {columnManager?.columns && <ColumnManager {...columnManager} />}

            {showActionsMenu && (
              <Tooltip title="Action">
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
      {/* Render date menu */}
      {renderDatePickerMenuActions()}
      {/* Render filters menu */}
      {renderFilterMenuActions()}
      {/* Render Refresh & Export */}
      {showActionsMenu && renderMenuActions()}

      {/* Refresh Confirmation Dialog */}
      <ConfirmDialog
        open={showRefreshConfirm}
        onClose={() => setShowRefreshConfirm(false)}
        title="Confirm Refresh"
        content="Are you sure you want to refresh the IOM data? This will reload all the information from the server."
        action={
          <Button
            variant="contained"
            onClick={handleUserRefresh}
            sx={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              background: '#1A407D',
              minWidth: {
                xs: '120px',
                lg: '204px',
              },
              height: '48px',
              margin: '0',
            }}
          >
            Yes, Refresh
          </Button>
        }
      />
    </>
  );
};
