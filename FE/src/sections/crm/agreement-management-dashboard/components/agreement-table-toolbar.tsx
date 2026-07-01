import type { Dayjs } from 'dayjs';
import type { RoleFilter } from 'src/config/role-based-permissions';
import type { IAgreementListTableFilters } from 'src/types/crm/agreement';

import dayjs from 'dayjs';
import { useState } from 'react';
import { usePopover, type UseSetStateReturn } from 'minimal-shared/hooks';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Button,
  Tooltip,
  useTheme,
  IconButton,
  FormControl,
  Autocomplete,
  useMediaQuery,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { ROLES } from 'src/utils/constant';
import { mapArrayToLabelValue } from 'src/utils/helper';

import { getAgreementDocumentTypeOptions } from 'src/pages/crm/dashboard/agreement-eSignature-edit';

import { Iconify } from 'src/components/iconify';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import CrmUserAutocomplete from './custom-automcomplete';

// ----------------------------------------------------------------------

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IAgreementListTableFilters>;
  roleFilters: RoleFilter[];
  userRole: string | null;
}>;

export function AgreementTableToolbar({ filters, onResetPage, roleFilters, userRole }: Props) {
  const menuActions = usePopover();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { optionsData } = useAppSelector((state) => state.agreements);
  const  DOC_TYPE_OPTIONS = [...(mapArrayToLabelValue(getAgreementDocumentTypeOptions(userRole))), { label: 'Merged Document', value: 'Merged Document' }]

  // Local temp filters (used inside popover, applied only on Apply)
  const [tempFilters, setTempFilters] = useState(filters.state);

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setTempFilters(filters.state); // sync with current applied filters
    menuActions.onOpen(event);
  };

  const handleTempChange = (key: keyof IAgreementListTableFilters, value: any) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const DocumentStatus = [
    { label: 'Doc. Setup in Progress' },
    { label: 'Sent For Signature' },
    { label: 'Cx: Partially Signed' },
    { label: 'Cx: Signed' },
    ...(userRole === ROLES.CRM ? [{ label: 'CRM: Signed' }] : []),
  ];

  return (
    <Stack
      spacing={1.5}
      alignItems='center' 
      direction='row'
      sx={{ p:1.5, width: '100%' }}
    >
      {/* Search */}
      <Stack direction="column" spacing={0.5} flexGrow={1} sx={{ width: 1 }}>
        <SearchInput
          value={filters.state.name || ''}
          placeholder="Search by Applicant Name, Document Name or Unit Number"
          onChange={(value) => {
            onResetPage();
            filters.setState({ name: value });
          }}
        />
      </Stack>


      {/* Filters Button */}
      <Box display="flex" gap={1} alignItems="center" flexShrink={0}>
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
                Filters
              </Button>
          )}
        </Tooltip>
      </Box>

      {/* Popover-based Filters */}
      <FilterToolbar
        menuActions={menuActions as any}
        onReset={() => {
          const reset = {
            ...filters.state,
            projectName: '',
            documentStatus: '',
            crmUser: '',
            internalSignatory: '',
            startDate: null,
            enddate: null,
          };
          setTempFilters(reset);
        }}
        onApply={() => {
          filters.setState(tempFilters); // apply local temp → main filters
          menuActions.onClose();
          onResetPage();
        }}
        title="Filters"
      >
        <Box sx={{ width: '300px', display: 'flex', gap: '1rem', flexDirection: 'column', }}>
          {roleFilters?.some((f) => f.id === 'documentStatus') && (
            <Autocomplete
              value={tempFilters.documentStatus || null}
              onChange={(_, value) =>
                handleTempChange('documentStatus', value?.label || '')
              }
              options={DocumentStatus}
              renderInput={(params) => (
                <TextField {...params} label="Cx Sign Status" />
              )}
            />
          )}

          {roleFilters?.some((f) => f.id === 'crmUser') && (
            <CrmUserAutocomplete
              options={optionsData?.crmUsers}
              value={tempFilters?.crmUser || null}
              onChange={(val: string) => handleTempChange('crmUser', val)}
              label="CRM User"
            />
          )}

          {roleFilters?.some((f) => f.id === 'internalSignatory') && (
            <CrmUserAutocomplete
              options={optionsData?.internalSignatories}
              value={tempFilters?.internalSignatory || null}
              onChange={(val: string) => handleTempChange('internalSignatory', val)}
              label="Authorised Signatory"
            />
          )}

          {roleFilters?.some((f) => f.id === 'documentType') && (
            <ControlledAutocomplete
              label="Document Type"
              multiple={false}
              value={tempFilters.documentType || null}
              onChange={(val) => handleTempChange('documentType', val)}
              options={DOC_TYPE_OPTIONS}
            />
          )}

          {(roleFilters?.some((f) => f.id === 'startDate') ||
            roleFilters?.some((f) => f.id === 'enddate')) && (
            <>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                Duration
              </Typography>

              {roleFilters?.some((f) => f.id === 'startDate') && (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <FormControl fullWidth sx={{ mb: 0 }}>
                    <DatePicker
                      label="Start Date"
                      value={tempFilters.startDate ? dayjs(tempFilters.startDate) : null}
                      onChange={(date: Dayjs | null) =>
                        handleTempChange('startDate', date ? date.toISOString() : null)
                      }
                    />
                  </FormControl>
                </LocalizationProvider>
              )}

              {roleFilters?.some((f) => f.id === 'enddate') && (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <FormControl fullWidth sx={{ mb: 0 }}>
                    <DatePicker
                      label="End Date"
                      value={tempFilters.enddate ? dayjs(tempFilters.enddate) : null}
                      onChange={(date: Dayjs | null) =>
                        handleTempChange('enddate', date ? date.toISOString() : null)
                      }
                    />
                  </FormControl>
                </LocalizationProvider>
              )}
            </>
          )}
        </Box>
      </FilterToolbar>
    </Stack>
  );
}
