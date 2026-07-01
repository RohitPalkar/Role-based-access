import type { RootState, AppDispatch } from 'src/redux/store';

import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';

import { Box, Tab, Tabs, Stack, Typography } from '@mui/material';

import { useTabs } from 'src/hooks/use-tabs';

import { clearUserDetails } from 'src/redux/slices/admin/user-slice';
import { fetchUserById, getUserGroups, getRolesDropdown } from 'src/redux/actions/admin/user-actions';

import UserDetails from './components/user-details';
import UserDetailsListView from './user-details-list-view';
import UserDetailsIcon from '../../../assets/icons/primary-shape.png';

/* Edit User Component */
const EditUserView: React.FC = () => {
  const { userDetails } = useSelector((state: RootState) => state.userlist);
  const tabs = useTabs('userDetails');
  const dispatch: AppDispatch = useDispatch();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    dispatch(clearUserDetails()); // Clear previous details before fetching new data
    dispatch(fetchUserById(Number.parseInt(id, 10)));
    dispatch(getUserGroups());
    dispatch(getRolesDropdown());
  }, [dispatch, id]);

  /* Tabs Data */
  const TABS = [
    {
      value: 'userDetails',
      label: 'User Details',
      component: userDetails ? 
        <>
          <UserDetails user={userDetails} />
          <UserDetailsListView user={userDetails} />   
        </> : null,
      icon: UserDetailsIcon,
    },
  ];

  return (
    <Stack sx={{ p: '30px' }} key={id}>
      <Typography sx={{ fontSize: '24px', fontWeight: 600, color: '#1C252E', mb: 3 }}>
        User Details
      </Typography>

      {/* Tabs */}
      <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ marginBottom: '30px' }}>
        {TABS.map(({ value, label, icon }) => (
          <Tab
            key={value}
            icon={<img src={icon} alt={label} width={24} height={24} />}
            value={value}
            label={label}
          />
        ))}
      </Tabs>

      {/* Tab Content */}
      {TABS.map(
        ({ value, component }) => value === tabs.value && <Box key={value}>{component}</Box>
      )}
    </Stack>
  );
};

export default EditUserView;
