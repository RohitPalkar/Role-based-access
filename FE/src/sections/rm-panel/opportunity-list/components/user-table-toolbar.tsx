import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IOpportunityListTableFilters } from 'src/types/rm-panel/user';

import { useLocation } from 'react-router';

import Stack from '@mui/material/Stack';

import { useAppSelector } from 'src/hooks/use-redux';

import { ROLES } from 'src/utils/constant';

import SearchInput from 'src/components/search-field-toolbar/SearchInput';

import { BookingActionDropdown } from './booking-action-dropdown';

// ----------------------------------------------------------------------

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IOpportunityListTableFilters>;
}>;

export function UserTableToolbar({ filters, onResetPage }: Props) {

  const location = useLocation();

  const isCreateMultiUnit = location.pathname.includes('/create-multi-unit');
  const isEditMultiUnit = location.pathname.includes('/edit-multi-unit');
  const isGroupDetailByID = location.pathname.includes('/group-details');
  const isMultiUnit = isCreateMultiUnit || isEditMultiUnit || isGroupDetailByID;
  const { user } = useAppSelector((state) => state.auth);
    

  return (
    <Stack
      spacing={1.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      mt={{ xs: 0, sm: 1 }}
      sx={{ p: { xs: 0, md: 1.5 }, width: '100%' }}
    >
      <Stack direction="column" spacing={0.5} flexGrow={1} sx={{ width: 1 }}>
        <SearchInput
          value={filters.state.name || ''}
          placeholder="Search by Customer Name, Enquiry Ref. No. or Unit Number"
          onChange={(value) => {
            onResetPage();
            filters.setState({ name: value });
          }}
        />

      </Stack>

      {/* Booking Action Dropdown */}
     {(!isMultiUnit && user?.role === ROLES.RM) &&  <BookingActionDropdown />}
    </Stack>
  );
}
