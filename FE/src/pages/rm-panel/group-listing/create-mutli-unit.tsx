import type { BookingItem } from 'src/services/rm-panel/multi-unit-service';
import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';

import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { setCreateStep } from 'src/redux/slices/rm-panel/multi-unit-slice';
import { fetchMultiBookingGroupThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';

import { OpportunityList } from 'src/sections/rm-panel/opportunity-list';

import { MultiUnitDetails } from './multiunit-details';
// ----------------------------------------------------------------------

export default function CreateMUltiUnit() {
  const metadata = { title: 'Puravankara | Dashboard' };
  const dispatch = useAppDispatch();
  const location = useLocation();

  const [selected, setSelected] = useState<Opportunity[]>([]);
  const isEditMultiUnit = location.pathname.includes('/edit-multi-unit');
  const {groupId} = useParams()
  const { createStep, editMultiBookings } = useAppSelector((state) => state.multiUnit);
  const {
    data: { opportunities, groupDetails },
  } = editMultiBookings;
  useEffect(() => {
    if (isEditMultiUnit) {
      dispatch(
        fetchMultiBookingGroupThunk({
          id: groupId || '',
        })
      );
    }
  }, [createStep, dispatch, groupId, isEditMultiUnit]);

  useEffect(() => {
    dispatch(setCreateStep(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

useEffect(() => {
  if (opportunities && selected?.length===0 && isEditMultiUnit) {

    const groupedIds = groupDetails?.groupedOppoId || [];

    const mappedData: Opportunity[] = opportunities?.map((item: BookingItem) => {
      const isMatched = groupedIds?.includes(item?.Id);

      return {
        ...item,
        isSelected: isMatched,
      };
    });

    // ✅ Only set selected opportunities that belong to groupDetails
    const preSelected = mappedData?.filter((oppo) => oppo?.isSelected);
    setSelected(preSelected);
  }
}, [groupDetails, opportunities, selected?.length,isEditMultiUnit]);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      {createStep === 0 && <OpportunityList selected={selected} setSelected={setSelected} />}
      {createStep === 1 && <MultiUnitDetails selected={selected} setSelected={setSelected} />}
    </>
  );
}
