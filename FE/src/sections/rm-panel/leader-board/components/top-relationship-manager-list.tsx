import React, { useState, useEffect } from 'react';

import { Box } from '@mui/material';

import PerformerList from './performers-list';

type PerformerData = {
  id: number;
  name: string;
  amount: string;
  totalCancellations: any;
  isHighestUnitsSold: any;
  bookingsCount?: any;
};

type Props = Readonly<{
  topRMList: PerformerData[] | undefined;
}>;

function TopRelationshipManagerList({ topRMList }: Props) {
  const [newData, setNewData] = useState<any>();

  useEffect(() => {
    const data =
      topRMList &&
      topRMList?.length > 0 &&
      topRMList.map((item) => ({ ...item, totalCancellations: item.bookingsCount }));
    setNewData(data);
  }, [topRMList]);

  return (
    <Box
      sx={{
        minHeight: '295px',
        display: !topRMList ? 'flex' : '',
        alignItems: !topRMList ? 'center' : '',
        justifyContent: !topRMList ? 'center' : '',
        width: '100%',
      }}
    >
      {newData && newData?.length > 0 && <PerformerList performers={newData} />}
      {!newData && newData?.length > 0 && <p>No Data Found</p>}
    </Box>
  );
}

export default TopRelationshipManagerList;
