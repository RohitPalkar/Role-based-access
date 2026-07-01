import type { AppDispatch } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IUserTableFilters } from 'src/types/admin/feature/user';
import type { ISelectOption } from 'src/types/admin/services/incetive';

import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';
import { Button, Tooltip, useTheme, useMediaQuery } from '@mui/material';

import { CapitalizeFirstLetter } from 'src/utils/helper';

import { exportUsers, fetchUserRefresh } from 'src/redux/actions/admin/user-actions';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IUserTableFilters>;
  getLists: (value: any) => void;
  columnManager?: any;
  options: {
    group: ISelectOption[];
    status: string[];
    brand: ISelectOption[];
  };
  canExport?: boolean;
  canRefresh?: boolean;
}>;

export function UserTableToolbar({
  filters,
  options,
  onResetPage,
  getLists,
  columnManager,
  canExport = true,
  canRefresh = false,
}: Props) {
  const menuActions = usePopover();
  const filterMenuActions = usePopover();
  const dispatch: AppDispatch = useDispatch();
  const { state: currentFilters, setState: updateFilters } = filters;
  const [filterState, setFilterState] = useState(currentFilters);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const showActionsMenu = Boolean(canExport) || canRefresh;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleExport = () => {
    const payload: {
      brandId?: string | number;
      groupId?: string | number;
      status?: string;
      roleId?: string | number;
    } = {
      ...(filterState?.brand && { brandId: filterState.brand }),
      ...(filterState?.group && { groupId: filterState.group }),
      ...(filterState?.status && { status: filterState.status }),
      ...(filterState?.role && { roleId: filterState.role }),
    };

    dispatch(exportUsers(payload));
  };

  useEffect(() => {
    setFilterState(currentFilters);
  }, [currentFilters]);


  const handleFilter = useCallback(
    (name: 'brand' | 'group' | 'status' | 'role', value: string | null) => {
      onResetPage();
      if (name === 'brand') {
        setFilterState((pre) => ({ ...pre, [name]: value, group: null, status: null }));
      } else if (name === 'group') {
        setFilterState((pre) => ({ ...pre, [name]: value, status: null }));
      } else setFilterState((pre) => ({ ...pre, [name]: value }));
    },
    [onResetPage, setFilterState]
  );

  const handleOnReset = useCallback(() => {
    const resetState = { group: null, status: null, brand: null };
    setFilterState((prev) => ({ ...prev, ...resetState }));
    updateFilters(resetState);
    onResetPage();
  }, [updateFilters, onResetPage]);

  const handleRefresh = async () => {
    try {
      await dispatch(fetchUserRefresh());
   
      setShowRefreshConfirm(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to refresh data');
      setShowRefreshConfirm(false);
    }
  };

  const handleRefreshClick = () => {
    setShowRefreshConfirm(true);
    menuActions.onClose();
  };

  const handleApply = () => {
    updateFilters(filterState);
  };

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
          >
            <Iconify icon="solar:export-bold" />
            Export
          </MenuItem>
        )}
        {canRefresh && (
          <MenuItem onClick={handleRefreshClick}>
            <Iconify icon="solar:refresh-bold" />
            Refresh
          </MenuItem>
        )}
      </MenuList>
    </CustomPopover>
  );

  const renderFilterMenuActions = () => (
    <FilterToolbar menuActions={filterMenuActions} onReset={handleOnReset} onApply={handleApply}>
      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 400 } }}>
        <ControlledAutocomplete
          label="Brand"
          value={filterState.brand}
          options={
            options?.brand?.map((option) => ({
              value: String(option.value),
              label: CapitalizeFirstLetter(option.label),
            })) || []
          }
          onChange={(value) => {
            handleFilter('brand', value !== null && value !== undefined ? String(value) : null);
          }}
        />
      </Box>

      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 400 } }}>
        <ControlledAutocomplete
          label="User Group"
          value={filterState.group}
          options={
            options?.group?.map((option) => ({
              value: String(option.value),
              label: CapitalizeFirstLetter(option.label),
            })) || []
          }
          onChange={(value) => {
            handleFilter('group', value !== null && value !== undefined ? String(value) : null);
          }}
        />
      </Box>

      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 400 } }}>
        <ControlledAutocomplete
          label="Status"
          value={filterState.status}
          options={options.status.map((option) => ({
            value: option,
            label: CapitalizeFirstLetter(option),
          }))}
          onChange={(value) => {
            handleFilter('status', value !== null && value !== undefined ? String(value) : null);
          }}
        />
      </Box>
    </FilterToolbar>
  );

  return (
    <>
      <Box
        sx={{
          p: { xs: 0.75, md: 1 },
          gap: 0.75,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            gap: 0.75,
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
              onResetPage();
              updateFilters({ name: value });
            }}
          />

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            flexShrink: 0 
          }}>
            <Tooltip title="Filters" >
              {isMobile ? (
                <IconButton 
                  onClick={filterMenuActions.onOpen}
                  size="small"
                >
                  <Iconify icon="material-symbols:filter-list" />
                </IconButton>
              ) : (
                <Button
                  onClick={filterMenuActions.onOpen}
                  startIcon={<Iconify icon="material-symbols:filter-list" />}
                  size="small"
                  sx={{ 
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    height: '32px',
                    fontSize: '0.8125rem'
                  }}
                >
                  Filters
                </Button>
              )}
            </Tooltip>
            
            {/* Column Manager */}
            {columnManager && <ColumnManager {...columnManager} />}
            
            {showActionsMenu && (
              <Tooltip title="Action">
                <IconButton onClick={menuActions.onOpen} size="small">
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
      {renderFilterMenuActions()}
      {showActionsMenu && renderMenuActions()}
      
      {/* Refresh Confirmation Dialog */}
      <ConfirmDialog
        open={showRefreshConfirm}
        onClose={() => setShowRefreshConfirm(false)}
        title="Confirm Refresh"
        content="Are you sure you want to refresh the user data? This will reload all the information from the server."
        action={
          <Button
            variant="contained"
            onClick={handleRefresh}
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
}
