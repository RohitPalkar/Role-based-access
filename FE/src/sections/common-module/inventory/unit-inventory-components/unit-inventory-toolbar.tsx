import type { ColumnManagerProps } from 'src/components/column-manager/types';

import React from 'react';

import { Box, Button } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { formatArrayToCommaString } from 'src/utils/helper';

import ExportIcon from 'src/assets/icons/export.svg';
import uiText from 'src/locales/langs/en/common.json';
import { downloadUnitInventoryList } from 'src/redux/actions/rm-panel/unit-inventory-actions';

import { ColumnManager } from 'src/components/column-manager';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

import type { UnitInventoryFormValues } from '../unit-inventory-view';


interface UnitInventoryToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  columnManager?: ColumnManagerProps;
  canExport?: boolean;
  filters?: UnitInventoryFormValues;
  page: number
  limit: number
  disabledExport?: boolean;
  onResetPage?: () => void;
}

export const UnitInventoryToolbar: React.FC<UnitInventoryToolbarProps> = ({
  search,
  setSearch,
  columnManager,
  canExport=false,
  filters,
  disabledExport=false,
  onResetPage
}) => {
    const dispatch = useAppDispatch();
  
  const handleExport = () => {
    const { campaign, tower, floor, configuration, facing, series, inventoryStatus } = filters || {};
    const hasItems = (arr: any) => Array.isArray(arr) && arr.length > 0;
    const payload = {
      ...(search && { search }),
      ...(campaign && { campaignId: campaign}),
      ...(hasItems(tower) && { tower: formatArrayToCommaString(tower) }),
      ...(hasItems(floor) && { floor: formatArrayToCommaString(floor) }),
      ...(hasItems(configuration) && { configuration: formatArrayToCommaString(configuration) }),
      ...(hasItems(facing) && { facing: formatArrayToCommaString(facing) }),
      ...(hasItems(series) && { series: formatArrayToCommaString(series) }),
      ...(inventoryStatus && { inventoryStatus }),
    };

    dispatch(downloadUnitInventoryList(payload));
  }; 

  return (
      <Box
        sx={{
          p: 1.5,
          gap: 1,
          display: 'flex',
          pr: { xs: 1.5, md: 0.5 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-end', sm: 'center' },
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
          <SearchInput
            value={search}
            placeholder="Search"
            onChange={(value) => {
              onResetPage?.();
              setSearch(value);
            }}
            minLength={1}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {canExport && (
            <Button
              variant="contained"
              disabled={disabledExport}
              onClick={handleExport}
              startIcon={<img src={ExportIcon} alt="export" style={{ width: 18, height: 18 }} />}
              sx={{
                bgcolor: '#1a407d',
                color: 'white',
                '&:hover': {
                  bgcolor: '#1a407d',
                },
                py: 0.91,
                px: 2,
              }}
            >
              {uiText.button.export}
            </Button>
          )}
          {columnManager?.columns && <ColumnManager {...columnManager} />}
        </Box>
      </Box>
  )};
