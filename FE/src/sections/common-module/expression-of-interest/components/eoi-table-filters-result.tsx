import type { Date } from 'src/types/eoi/eoi';
import type { RootState } from 'src/redux/store';
import type { Theme, SxProps } from '@mui/material/styles';
import type { DropdownOption } from 'src/services/rm-panel/eoi-service';

import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import React, { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';


export type Filters = {
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
  rmUsers: string[]
  approvalStatus?: string;
};

type Props = Readonly<{
  search: string;
  setSearch: (value: string) => void;
  filters: Filters;
  setFilters: (updater: Filters | ((prev: Filters) => Filters)) => void;
  totalResults: number;
  onResetPage?: () => void;
  sx?: SxProps<Theme>;
  campaigns?: { value: string | number; name: string }[];
  cpNameOptions?:DropdownOption[];
}>;

export function EOITableFiltersResult({ search, setSearch, filters, setFilters, totalResults, onResetPage, sx, campaigns = [], cpNameOptions}: Props) {
  const { rmList } = useSelector((state: RootState) => state.reportsUser);
  const handleRemove = useCallback(
    (key: keyof Filters) => {
      onResetPage?.();
      setFilters((prev) => ({ ...prev, [key]: key === 'queueIdAllotted' ? null : '' }));
    },
    [onResetPage, setFilters]
  );

  const handleRemoveSearch = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleResetAll = useCallback(() => {
    onResetPage?.();
    setSearch('');
    setFilters({ campaignId: '', primarySource: '',leadStatus: '', formStatus: [], paymentStatus: [], financeStatus: [], deletionStatus: '', queueIdAllotted: null,cpName: '', sortBy: '', rmUsers: [], startDate:'', endDate:'', approvalStatus: '' });
  }, [onResetPage, setSearch, setFilters]);

  const campaignLabel = React.useMemo(() => {
    if (!filters?.campaignId) return '';
    const match = campaigns?.find((c) => String(c.value) === String(filters?.campaignId));
    return match?.name || String(filters?.campaignId);
  }, [campaigns, filters?.campaignId]);

  const cpNameLabel = React.useMemo(() => {
    if (!filters.cpName) return '';
    return cpNameOptions?.find((item) => item.value === filters.cpName)?.label;
  }, [filters.cpName, cpNameOptions]);
  
  return (
    <FiltersResult totalResults={totalResults} onReset={handleResetAll} sx={sx}>
      <FiltersBlock label="Keyword:" isShow={!!search}>
        <Chip {...chipProps} label={search} onDelete={handleRemoveSearch} />
      </FiltersBlock>

      <FiltersBlock label="Campaign:" isShow={!!filters?.campaignId}>
        <Chip {...chipProps} label={campaignLabel} onDelete={() => handleRemove('campaignId')} />
      </FiltersBlock>

      <FiltersBlock label="Primary Source:" isShow={!!filters?.primarySource}>
        <Chip {...chipProps} label={filters?.primarySource} onDelete={() => handleRemove('primarySource')} />
      </FiltersBlock>

      <FiltersBlock label="CP Name:" isShow={!!filters?.cpName}>
        <Chip {...chipProps} label={cpNameLabel} onDelete={() => handleRemove('cpName')} />
      </FiltersBlock>

      <FiltersBlock label="Lead Status:" isShow={!!filters?.leadStatus}>
        <Chip {...chipProps} label={filters?.leadStatus} onDelete={() => handleRemove('leadStatus')} />
      </FiltersBlock>

      <FiltersBlock label="Form Status:" isShow={filters?.formStatus?.length > 0}>
         {filters?.formStatus?.map((item) => (
          <Chip
            key={item}
            {...chipProps}
            label={item}
            onDelete={() =>
              setFilters((prev) => ({
                ...prev,
                formStatus: prev?.formStatus?.filter((v) => v !== item),
              }))
            }
          />
        ))}
      </FiltersBlock>

      <FiltersBlock label="Payment Status:" isShow={filters?.paymentStatus?.length > 0}>
        {filters?.paymentStatus?.map((item) => (
          <Chip
            key={item}
            {...chipProps}
            label={item}
            onDelete={() =>
              setFilters((prev) => ({
                ...prev,
                paymentStatus: prev?.paymentStatus?.filter((v) => v !== item),
              }))
            }
          />
        ))}
      </FiltersBlock>

      <FiltersBlock label="Finance Status:" isShow={filters?.financeStatus?.length > 0}>
        {filters?.financeStatus?.map((item) => (
          <Chip
            key={item}
            {...chipProps}
            label={item}
            onDelete={() =>
              setFilters((prev) => ({
                ...prev,
                financeStatus: prev?.financeStatus?.filter((v) => v !== item),
              }))
            }
          />
        ))}
      </FiltersBlock>

      <FiltersBlock label="Archived Records :" isShow={!!filters?.deletionStatus}>
        <Chip {...chipProps} label={filters?.deletionStatus} onDelete={() => handleRemove('deletionStatus')} />
      </FiltersBlock>

      <FiltersBlock label="Relationship Manager:" isShow={filters?.rmUsers?.length > 0}>
        {filters?.rmUsers?.map((rmId) => {
          const rm = rmList?.find((u) => String(u?.id) === String(rmId));
          return (
            <Chip
              key={rmId}
              {...chipProps}
              label={rm?.name || rmId}
              onDelete={() =>
                setFilters((prev) => ({
                  ...prev,
                  rmUsers: prev?.rmUsers?.filter((v) => v !== rmId),
                }))
              }
            />
          );
        })}
      </FiltersBlock>

       <FiltersBlock label={`${uiText.EOIJson.queueIdAssigned}: `} isShow={filters?.queueIdAllotted ===true}>
        <Chip {...chipProps} label={filters?.queueIdAllotted && uiText.EOIJson.yes} onDelete={() => handleRemove('queueIdAllotted')} />
      </FiltersBlock>

       <FiltersBlock label={`${uiText.common.startDate}:`} isShow={!!filters?.startDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.startDate).format('DD/MM/YYYY')}
          onDelete={() => {
            handleRemove('startDate');
            handleRemove('endDate');
          }}
        />
      </FiltersBlock>

      <FiltersBlock label={`${uiText.common.startDate}:`} isShow={!!filters?.endDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.endDate).format('DD/MM/YYYY')}
          onDelete={() => {
            handleRemove('startDate');
            handleRemove('endDate');
          }}
        />
      </FiltersBlock>

      <FiltersBlock label="Status:" isShow={!!filters?.approvalStatus}>
        <Chip {...chipProps} label={filters?.approvalStatus} onDelete={() => handleRemove('approvalStatus')} />
      </FiltersBlock>
    </FiltersResult>
  );
}