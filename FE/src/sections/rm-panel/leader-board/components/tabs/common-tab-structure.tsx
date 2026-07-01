import React, { useState, useEffect } from 'react';

import { Box, Tab, Tabs, Divider } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getCancellations, getTopPerformers } from 'src/redux/actions/leader-board/leader-board-top-performer-and-cancellation-action';

import PerformerList from '../performers-list';

interface Performer {
  name: string;
  initials: string;
  amount: string;
  rank: number;
  totalCancellations: string;
}

interface CommonTabStructureProps {
  readonly tabs: { value: string; label: string, index: string }[];
  readonly performersData: Record<string, Performer[]>;
  readonly tabValue: string;
  readonly activeTab: any;
  readonly setActiveTab: any;
  readonly isCancellation: boolean;
}

function CommonTabStructure({ tabs, performersData, tabValue, activeTab, setActiveTab, isCancellation }: CommonTabStructureProps) {
  const [performersList, setPerformersList] = useState<any>(performersData)
  const [cancellationList, setCancellationList] = useState<any>(performersData)
  const dispatch = useAppDispatch();

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  useEffect(() => {
    if (isCancellation) {
      setCancellationList(performersData)
    } else {
      setPerformersList(performersData)
    }
  }, [performersData, activeTab, isCancellation])
  const { topPerformers } = useAppSelector((state) => state.topPerformers);
  const { cancellations } = useAppSelector((state) => state.cancellations);
  return (
    <Box sx={{ minHeight: "100px" }}>
      <Tabs value={activeTab} onChange={async (event, newValue) => {
        if (!isCancellation) {
          await dispatch(getTopPerformers({ type: tabValue, id: newValue }))
        } else {
          await dispatch(getCancellations({ type: tabValue, id: newValue }))
        }
        handleTabChange(event, newValue);
        let restructuredData: any = [];
        // @ts-ignore
        if (topPerformers?.data?.length > 0 && !isCancellation) {
          // @ts-ignore
          restructuredData = topPerformers?.data?.map(item => ({ name: item?.name, amount: item?.totalSales }))
          setPerformersList(restructuredData)
        }
        // @ts-ignore
        if (isCancellation) {
          // @ts-ignore
          restructuredData = cancellations?.data?.cancellations?.map(item => ({ name: item?.name, amount: item?.totalSales, totalCancellations: item?.totalCancellations }))
          setCancellationList(restructuredData)
        }

      }}
        variant="scrollable"
        // @ts-ignore
        scrollButtons="always"
        allowScrollButtonsMobile
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.index} />
        ))}
      </Tabs>
      <Divider sx={{ mb: 3, borderColor: '#919EAB24' }} />
      {performersList && !isCancellation && <PerformerList performers={performersList} />}
      {cancellationList && isCancellation && <PerformerList performers={cancellationList} />}
    </Box >
  );
}

export default CommonTabStructure;
