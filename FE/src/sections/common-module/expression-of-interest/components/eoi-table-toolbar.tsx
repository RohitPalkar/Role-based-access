import type { Date } from 'src/types/eoi/eoi';
import type { Dispatch, SetStateAction } from 'react';
import type { RootState, AppDispatch } from 'src/redux/store';
import type { RoleFilter } from 'src/config/role-based-permissions';
import type { DropdownOption } from 'src/services/rm-panel/eoi-service';

import dayjs from 'dayjs';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, FormProvider } from 'react-hook-form';

import {
  Box,
  Switch,
  Button,
  Tooltip,
  useTheme,
  MenuItem,
  MenuList,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { fIsAfter } from 'src/utils/format-time';
import { mapArrayToLabelValue } from 'src/utils/helper';
import {
  ROLES,
  deletionStatus,
  PRIMARY_SOURCE,
  VoucherLeadStatus,
  FinanceStatusEnum,
  UnitBlockingStatus,
  VoucherFormStatusEnum,
  PaymentProofStatusEnum,
  generateRoleBasedRoute,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { fetchCPNameAction } from 'src/redux/actions/rm-panel/eoi-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

interface EOITableToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  filters: {
    campaignId: string;
    primarySource: string;
    leadStatus: string;
    formStatus: string[];
    paymentStatus: string[];
    financeStatus: string[];
    deletionStatus: string;
    startDate: Date;
    endDate: Date;
    queueIdAllotted: boolean | null;
    cpName: string;
    sortBy: string;
    rmUsers: string[];
  };
  setFilters: Dispatch<
    SetStateAction<{
      campaignId: string;
      primarySource: string;
      leadStatus: string;
      formStatus: string[];
      paymentStatus: string[];
      financeStatus: string[];
      deletionStatus: string;
      startDate: Date;
      endDate: Date;
      queueIdAllotted: boolean | null;
      cpName: string;
      sortBy: string;
      rmUsers: string[];
    }>
  >;
  drawerOpen: boolean; // kept for backward compatibility but not used in the popover layout
  setDrawerOpen: Dispatch<SetStateAction<boolean>>; // kept for compatibility
  columnManager: any;
  eoiData: any[];
  campaigns: { value: string | number; name: string }[];
  cpName: DropdownOption[];
  campaignsLoading: boolean;
  primarySource: { value: string; name?: string }[]; // from redux
  roleFilters?: RoleFilter[]; // Role-based filters
  userRole?: string | null; // User role for debugging
  canExport?: boolean; // Export permission
  handleExport?: (exportTransaction?: boolean) => void; // Export function
  isFromDashbhboard?: boolean;
  isChangeRequestView?: boolean;
  isCancellationsView?: boolean;
  isApprovalUnitView?: boolean;
}

export const EOITableToolbar: React.FC<EOITableToolbarProps> = ({
  search,
  setSearch,
  filters,
  setFilters,
  // drawerOpen,
  // setDrawerOpen,
  columnManager,
  eoiData,
  campaigns,
  cpName,
  campaignsLoading,
  primarySource,
  roleFilters = [],
  userRole,
  canExport = false,
  handleExport,
  isFromDashbhboard,
  isChangeRequestView,
  isCancellationsView = false,
  isApprovalUnitView = false,
}) => {
  const menuActions = usePopover(); // For actions (Export, etc.)
  const dateMenuActions = usePopover();
  const filterMenuActions = usePopover(); // For filters (Campaign, Status, etc.)
  const route = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { rmList } = useSelector((state: RootState) => state.reportsUser);



  // Local draft filters to apply on click
  const [draftFilters, setDraftFilters] = React.useState(filters);
  const dispatch = useDispatch<AppDispatch>();
  const isChannelPartnerSelected = draftFilters.primarySource === PRIMARY_SOURCE.ChannelPartner;
  const isCampaignSelected = Boolean(draftFilters.campaignId);
  const monthDateError = fIsAfter(draftFilters.startDate, draftFilters.endDate);
  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);

  const methods = useForm<{ startDate: Date; endDate: Date }>({
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });
  const { watch, reset } = methods;
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    setDraftFilters(filters);
    methods.setValue('startDate', filters?.startDate || null);
    methods.setValue('endDate', filters?.endDate || null);
  }, [filters, methods]);

  useEffect(()=>{
    dispatch(fetchCPNameAction({campaignId:draftFilters.campaignId}));
  }, [dispatch, draftFilters.campaignId])
  

  useEffect(() => {
    const startDate = watchedStartDate ? dayjs(watchedStartDate) : null;
    const endDate = watchedEndDate ? dayjs(watchedEndDate) : null;

    setDraftFilters((prev) => ({
      ...prev,
      startDate: watchedStartDate || null,
      endDate: watchedEndDate || null,
    }));

    if (startDate && !endDate) {
      setEndDateRequired(true);
    } else {
      setEndDateRequired(false);
    }
    if (endDate && !startDate) {
      setStartDateRequired(true);
    } else {
      setStartDateRequired(false);
    }
  }, [watchedStartDate, watchedEndDate]);

  const initialEmpty = {
    campaignId: '',
    primarySource: '',
    leadStatus: '',
    formStatus: [],
    paymentStatus: [],
    financeStatus: [],
    deletionStatus: '',
    startDate: '',
    endDate: '',
    queueIdAllotted: null,
    cpName: '',
    sortBy: '',
    rmUsers: [],
    approvalStatus: '',
  };

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setDraftFilters(filters); // sync from current applied filters
    filterMenuActions.onOpen(event);
  };

  const handleReset = () => {
    setDraftFilters((prev) => ({
      ...initialEmpty,
      startDate: prev.startDate,
      endDate: prev.endDate,
    }));
  };

  const handleApply = () => {
    setFilters(draftFilters);
  };

  const getDateErrorMessage = () => {
    if (monthDateError) {
      return uiText.commonValidations.endDateLaterThanStart;
    }
    if (startDateRequired) {
      return uiText.commonValidations.startDate;
    }
    return uiText.commonValidations.endDate;
  };

  // Actions Menu - Only for actions like Export
  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem
          disabled={eoiData.length === 0}
          onClick={() => {
            if (handleExport) {
              handleExport();
            }
            menuActions.onClose();
          }}
        >
          <Iconify icon="solar:export-bold" />
          Export
        </MenuItem>
        {userRole === ROLES.FinanceAdmin && (
          <>
            <MenuItem
              disabled={eoiData.length === 0}
              onClick={() => {
                route.push(
                  generateRoleBasedRoute(
                    userRole,
                    `upload-finance-records`
                  )
                );
                menuActions.onClose();
              }}
            >
              <Iconify icon="mynaui:cloud-upload" />
              Upload Transaction
            </MenuItem>
            <MenuItem
              disabled={eoiData.length === 0}
              onClick={() => {
                if (handleExport) {
                  handleExport(true); // pass true to indicate it's export for finance transactions
                }
                menuActions.onClose();
              }}
            >
              <Iconify icon="solar:export-bold" />
              Export Transaction
            </MenuItem>
          </>
        )}
      </MenuList>
    </CustomPopover>
  );

  // Only these 4 fields are multiselect
  const specialFilters = new Set(['formStatus', 'paymentStatus', 'financeStatus', 'rmUsers']);

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApply}
      title="Filter"
    >
      {/* Campaign Dropdown - always single select */}
      {roleFilters?.some((filter) => filter?.id === 'campaignId') && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            label="Campaign"
            multiple={false}
            value={draftFilters.campaignId || ''}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                campaignId: (value as string) || '',
              }))
            }
            options={
              campaignsLoading
                ? []
                : campaigns.map((c) => ({
                    value: String(c.value),
                    label: c.name,
                  }))
            }
          />
        </Box>
      )}

      {/* Role Based Filters */}
      {roleFilters
        ?.filter((f) => f.id !== 'campaignId' && f.id !== 'queueIdAllotted')
        ?.filter((f) => Object.hasOwn(filters, f?.id))
        ?.map((filter) => {
          if (
            filter.id === 'cpName' &&
            (
              (!isApprovalUnitView && !isChannelPartnerSelected) ||   // normal tab
              (isApprovalUnitView && !isCampaignSelected)             // approve tab
            )
          ) {
            return null;
          }
          // Build options same as your logic
          let options: any[] = [];

          if (filter?.id === 'primarySource') {
            options = primarySource?.map((p) => ({
              value: p?.value,
              label: p?.value,
            }));
          } else if (filter?.id === 'cpName') {
            if (
              (isApprovalUnitView && isCampaignSelected) || (!isApprovalUnitView && isChannelPartnerSelected)) {
              options = cpName;
            } else {
              return null;
            }
          } else if (filter?.id === 'paymentStatus') {
            options = mapArrayToLabelValue(Object.values(PaymentProofStatusEnum));
          } else if (filter?.id === 'financeStatus') {
            options = mapArrayToLabelValue(Object.values(FinanceStatusEnum));
          } else if (filter?.id === 'leadStatus') {
            options = mapArrayToLabelValue(Object.values(VoucherLeadStatus));
          } else if (filter?.id === 'formStatus') {
            options = mapArrayToLabelValue(Object.values(VoucherFormStatusEnum).filter(
                (status) => status !== VoucherFormStatusEnum.CRM_VERIFIED));
          } else if (filter?.id === 'deletionStatus') {
            options = mapArrayToLabelValue(Object.values(deletionStatus));
          } else if (filter?.id === 'rmUsers') {
            options = mapArrayToLabelValue(rmList, 'name', 'id');
          } else if (filter?.id === 'approvalStatus') {
            options = mapArrayToLabelValue(Object.values(UnitBlockingStatus));
          } else {
            const values = Array.from(
              new Set(
                eoiData?.map((item) => (item[filter?.id] == null ? '' : String(item[filter?.id])))
              )
            ).filter((v) => v !== '');

            options = values.map((v) => ({
              value: v,
              label: v,
            }));
          }

          // Final rule: only specialFilters are multi-select
          const isMulti = specialFilters.has(filter.id);

          return (
            <Box key={filter?.id} sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
              <ControlledAutocomplete
                label={filter?.label}
                multiple={isMulti}
                options={options}
                value={
                  isMulti
                    ? (draftFilters[filter.id as keyof typeof draftFilters] as string[]) || []
                    : (draftFilters[filter.id as keyof typeof draftFilters] as string) || ''
                }
                onChange={(value: any) => {
                  const val = isMulti ? value || [] : value || '';

                  setDraftFilters((prev) => {
                    const next = { ...prev };

                    if (filter.id === 'primarySource') {
                      next.primarySource = val;
                      next.cpName = val === 'Channel Partner' ? prev.cpName : '';
                    } else {
                      (next as any)[filter.id as keyof typeof prev] = val;
                    }

                    return next;
                  });
                }}
              />
            </Box>
          );
        })}
      {roleFilters?.some((filter) => filter?.id === 'queueIdAllotted') && (
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
          <Typography
            sx={{
              fontWeight: 600,
              color: '#1C252E',
              fontSize: '14px',
              lineHeight: '12px',
              letterSpacing: '0px',
              mr: 2,
            }}
          >
            {uiText.EOIJson.queueIdAssigned}
          </Typography>

          <Switch
            checked={draftFilters.queueIdAllotted ?? false}
            onChange={(_, checked) => {
              setDraftFilters((prev) => ({
                ...prev,
                queueIdAllotted: checked,
              }));
            }}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#4caf50',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#00368C',
              },
              '& .MuiSwitch-switchBase': {
                color: 'green',
              },
              '& .MuiSwitch-switchBase + .MuiSwitch-track': {
                backgroundColor: '#D0D5DD',
              },
            }}
          />
        </Box>
      )}
    </FilterToolbar>
  );

  const renderDatePickerMenuActions = () => (
    <FilterToolbar
      title={uiText.common.dateRange}
      menuActions={dateMenuActions}
      onReset={() => {
        reset({ startDate: '', endDate: '' });
        setDraftFilters((prev) => ({
          ...prev,
          startDate: null,
          endDate: null,
        }));
      }}
      onApply={handleApply}
    >
      <FormProvider {...methods}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Field.Date name="startDate" label={uiText.common.startDate} />
          <Field.Date name="endDate" label={uiText.common.endDate} />
          {(monthDateError || startDateRequired || endDateRequired) && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {getDateErrorMessage()}
            </Typography>
          )}
        </Box>
      </FormProvider>
    </FilterToolbar>
  );

  let placeholderText = uiText.EOIJson.searchBoxPlaceholder;
  if (isApprovalUnitView) {
    placeholderText = uiText.EOIJson.approvalUnitView;
  } else if (isChangeRequestView) {
    placeholderText = uiText.EOIJson.searchChangeRequestView;
  } else if (isCancellationsView) {
    placeholderText = uiText.EOIJson.searchCancellationsView ?? uiText.EOIJson.searchBoxPlaceholder;
  }

  return (
    <>
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
            value={search}
            onChange={setSearch}
            placeholder={placeholderText}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {!isChangeRequestView && (
            <>
              {!isFromDashbhboard && roleFilters?.some((filter) => filter?.id === 'dateRange') && (
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
              {/* Filters trigger */}
              {!isFromDashbhboard && (
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
              )}
            </>
          )}
          {/* Column Manager */}
          {columnManager && <ColumnManager {...columnManager} />}

          {/* Actions Menu - only show if export is enabled */}
          {!isFromDashbhboard && !isChangeRequestView && !isCancellationsView && !isApprovalUnitView && canExport && handleExport && (
            <Tooltip title="Actions">
              <IconButton onClick={menuActions.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Render filters menu */}
      {!isFromDashbhboard && renderFilterMenuActions()}
      {!isFromDashbhboard && renderDatePickerMenuActions()}

      {/* Render actions menu only if export is enabled */}
      {!isFromDashbhboard && canExport && handleExport && renderMenuActions()}
    </>
  );
};
