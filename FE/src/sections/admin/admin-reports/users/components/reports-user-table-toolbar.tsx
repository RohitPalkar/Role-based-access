import type { AppDispatch } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ReportsUserTableFilters } from 'src/types/admin/feature/reports-user';

import { toast } from 'sonner';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import { Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';

import { refreshUserBookings } from 'src/redux/actions/admin/reports-user-actions';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

// ----------------------------------------------------------------------
export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<ReportsUserTableFilters>;
  columnManager?: any;
  handleExport: () => void;
  dataLength: number;
  /** Role-based: BIS and similar roles cannot export user reports. */
  canExport?: boolean;
  /** Role-based: server refresh / SAP sync (see `canRefresh` in role-based-permissions). */
  canRefresh?: boolean;
}>;

export function ReportsUserTableToolbar({
  filters,
  onResetPage,
  handleExport,
  dataLength,
  columnManager,
  canExport = true,
  canRefresh = false,
}: Props) {
  const menuActions = usePopover();
  const dispatch: AppDispatch = useDispatch();
  const { state: currentFilters, setState: updateFilters } = filters;
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const showActionsMenu = Boolean(canExport) || canRefresh;

  const handleUserRefresh = async () => {
    try {
      await dispatch(refreshUserBookings());
      setShowRefreshConfirm(false);
    } catch (error) {
      toast.error('Failed to refresh data', error);
      setShowRefreshConfirm(false);
    }
  };

  const handleRefreshClick = () => {
    setShowRefreshConfirm(true);
    menuActions.onClose();
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
            disabled={dataLength === 0}
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
            value={currentFilters?.name ?? ''}
            placeholder="Search by Employee ID, Name & Email Address"
            onChange={(value) => {
              onResetPage();
              updateFilters({ name: value });
            }}
          />

          {columnManager?.columns && <ColumnManager {...columnManager} />}
          {showActionsMenu && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0,
              }}
            >
              <Tooltip title="Action">
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>
      {showActionsMenu && renderMenuActions()}

      {/* Refresh Confirmation Dialog */}
      <ConfirmDialog
        open={showRefreshConfirm}
        onClose={() => setShowRefreshConfirm(false)}
        title="Confirm Refresh"
        content="Are you sure you want to refresh the user reports data? This will reload all the information from the server."
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
}
