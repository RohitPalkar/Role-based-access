import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import { SFDC_LOG_EVENT_FILTER_OPTIONS } from '../log-event-filter';

const LOG_EVENT_AUTOCOMPLETE_OPTIONS = SFDC_LOG_EVENT_FILTER_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

type Props = Readonly<{
  search: string;
  setSearch: (value: string) => void;
  logEvent: string;
  setLogEvent: (value: string) => void;
  onResetPage: () => void;
  columnManager?: any;
}>;

export function SfdcLogsTableToolbar({
  search,
  setSearch,
  logEvent,
  setLogEvent,
  onResetPage,
  columnManager,
}: Props) {
  const filterMenuActions = usePopover();
  const [draftLogEvent, setDraftLogEvent] = useState(logEvent);

  useEffect(() => {
    setDraftLogEvent(logEvent);
  }, [logEvent]);

  const handleFilterReset = useCallback(() => {
    setDraftLogEvent('');
  }, []);

  const handleApply = useCallback(() => {
    onResetPage();
    setLogEvent(draftLogEvent);
  }, [draftLogEvent, onResetPage, setLogEvent]);

  const handleOpenFilters = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setDraftLogEvent(logEvent);
      filterMenuActions.onOpen(event);
    },
    [filterMenuActions, logEvent]
  );

  return (
    <>
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
            flexWrap: 'wrap',
          }}
        >
          <SearchInput
            value={search}
            placeholder={uiText.sfdcLogs.searchPlaceholder}
            onChange={(value) => {
              setSearch(value);
              onResetPage();
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Button
            onClick={handleOpenFilters}
            startIcon={<Iconify icon="material-symbols:filter-list" />}
          >
            {uiText.common.filters}
          </Button>
          {columnManager && <ColumnManager {...columnManager} />}
        </Box>
      </Box>

      <FilterToolbar
        title={uiText.common.filters}
        menuActions={filterMenuActions}
        onReset={handleFilterReset}
        onApply={handleApply}
      >
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 400 } }}>
          <ControlledAutocomplete
            label={uiText.sfdcLogs.filters.logEvent}
            placeholder={uiText.sfdcLogs.filters.logEventPlaceholder}
            value={draftLogEvent}
            options={LOG_EVENT_AUTOCOMPLETE_OPTIONS}
            onChange={(value) => {
              const v = value !== null && value !== undefined ? String(value) : '';
              setDraftLogEvent(v);
            }}
          />
        </Box>
      </FilterToolbar>
    </>
  );
}
