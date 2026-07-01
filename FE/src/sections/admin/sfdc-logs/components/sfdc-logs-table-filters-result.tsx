import type { Theme, SxProps } from '@mui/material/styles';

import React, { useMemo, useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import { SFDC_LOG_EVENT_FILTER_OPTIONS } from '../log-event-filter';

type Props = Readonly<{
  search: string;
  setSearch: (value: string) => void;
  logEvent: string;
  setLogEvent: (value: string) => void;
  totalResults: number;
  onResetPage?: () => void;
  sx?: SxProps<Theme>;
}>;

export function SfdcLogsTableFiltersResult({
  search,
  setSearch,
  logEvent,
  setLogEvent,
  totalResults,
  onResetPage,
  sx,
}: Props) {
  const handleRemoveSearch = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleRemoveLogEvent = useCallback(() => {
    onResetPage?.();
    setLogEvent('');
  }, [onResetPage, setLogEvent]);

  const handleResetAll = useCallback(() => {
    onResetPage?.();
    setSearch('');
    setLogEvent('');
  }, [onResetPage, setSearch, setLogEvent]);

  const logEventLabel = useMemo(() => {
    const v = logEvent?.trim();
    if (!v) return '';
    const found = SFDC_LOG_EVENT_FILTER_OPTIONS.find((o) => o.value === v);
    return found?.label ?? v;
  }, [logEvent]);

  const AS = uiText.sfdcLogs;

  return (
    <FiltersResult totalResults={totalResults} onReset={handleResetAll} sx={sx}>
      <FiltersBlock label={`${AS.filters.search}:`} isShow={Boolean(search?.trim())}>
        <Chip {...chipProps} label={search.trim()} onDelete={handleRemoveSearch} />
      </FiltersBlock>

      <FiltersBlock label={`${AS.filters.logEvent}:`} isShow={Boolean(logEvent?.trim())}>
        <Chip {...chipProps} label={logEventLabel} onDelete={handleRemoveLogEvent} />
      </FiltersBlock>
    </FiltersResult>
  );
}
