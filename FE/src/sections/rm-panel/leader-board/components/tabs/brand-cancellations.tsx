import { Box, CircularProgress } from '@mui/material';

import CommonTabStructure from './common-tab-structure';

export function BrandCancellations({ data, loading, tabValue, activeTab, setActiveTab, isCancellation, brandsData }: any) {
  
  return <>
    {loading ? <Box sx={{ display: "flex", justifyContent: "center", m: 3 }}><CircularProgress /></Box>:
      <CommonTabStructure tabs={brandsData} performersData={data} tabValue={tabValue} activeTab={activeTab} setActiveTab={setActiveTab} isCancellation={isCancellation} />}
  </>
}
