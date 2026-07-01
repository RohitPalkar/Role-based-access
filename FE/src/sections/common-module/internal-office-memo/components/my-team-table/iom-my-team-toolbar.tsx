import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IomMyTeamTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import React, { useMemo } from 'react';

import {
  Box, Button,
  Tooltip,
  MenuList,
  MenuItem,
  useTheme,
  TextField,
  IconButton,
  FormControl,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { useDebounceMethod } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import {
  mapProjectDropdownOptions,
  IOM_MY_TEAM_STATUS_OPTIONS,
} from 'src/sections/common-module/internal-office-memo/iom-config';

interface IomMyTeamToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  filters: UseSetStateReturn<IomMyTeamTableFilters>;
  roleFilters: { id?: string; label?: string }[];
  columnManager: any;
  canExport: boolean;
  dataLength: number;
  onExport?: () => void;
}

export function IomMyTeamToolbar({
  search,
  setSearch,
  filters,
  roleFilters,
  columnManager,
  canExport = true,
  dataLength,
  onExport,
}: Readonly<IomMyTeamToolbarProps>) {
  const { iomDropdowns } = useAppSelector((state) => state.common);
  const filterMenuActions = usePopover();
  const menuActions = usePopover();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [localSearch, setLocalSearch] = React.useState(search);
  const [draftFilters, setDraftFilters] = React.useState<IomMyTeamTableFilters>(filters.state);

  const projectOptions = useMemo(
    () => mapProjectDropdownOptions(iomDropdowns?.projects),
    [iomDropdowns?.projects]
  );

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  React.useEffect(() => {
    setDraftFilters(filters.state);
  }, [filters.state]);

  const debouncedSetSearch = useDebounceMethod((value: string) => setSearch(value), 500);

  const initialEmpty: IomMyTeamTableFilters = {
    search: '',
    status: null,
    project: [],
  };

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setDraftFilters(filters.state);
    filterMenuActions.onOpen(event);
  };

  const handleReset = () => {
    filters.setState(initialEmpty);
    setSearch('');
    setLocalSearch('');
  };

  const handleApply = () => {
    filters.setState(draftFilters);
    filterMenuActions.onClose();
  };

  const handleExport = () => {
    onExport?.();
  };

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApply}
      title={uiText.common.filters}
    >
      <FormControl sx={{ flexShrink: 0, width: { md: 400 }, gap: '1rem' }}>
        {roleFilters?.find((filter) => filter?.id === 'status') && (
          <ControlledAutocomplete
            label={uiText.internalOfficeMemo.myTeam.columns.status}
            value={draftFilters.status || null}
            onChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                status: (value as string) || null,
              }))
            }
            options={IOM_MY_TEAM_STATUS_OPTIONS}
          />
        )}

        {roleFilters?.find((filter) => filter?.id === 'project') && (
          <ControlledAutocomplete
            label={uiText.internalOfficeMemo.myTeam.columns.project}
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
          <TextField
            placeholder={uiText.internalOfficeMemo.myTeam.searchPlaceholder}
            value={localSearch}
            size="small"
            onChange={(event) => {
              const inputValue = event.target.value;
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
            <Tooltip title={uiText.common.filters}>
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

            {columnManager?.columns && <ColumnManager {...columnManager} />}

            {canExport && (
              <Tooltip title="Action">
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {renderFilterMenuActions()}
      {canExport && renderMenuActions()}
    </>
  );
}
