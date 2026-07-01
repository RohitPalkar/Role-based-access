import { Box } from '@mui/material';

import PerformerList from './performers-list';

type PerformerData = {
    id: number,
    name: string,
    amount: string
    totalCancellations: any;
    isHighestUnitsSold: boolean,
  };
  
  type Props = Readonly<{
    highestUnitsSoldList: PerformerData[] | undefined;
  }>;

function HighestUnitsList({highestUnitsSoldList}: Props) {

  return (
    <Box>
       {highestUnitsSoldList ? (
        <PerformerList performers={highestUnitsSoldList.map(performer => ({
          ...performer,
          isHighestUnitsSold: true, // Ensure this is set to true
        }))} />
      ) : (
        <p>No Data Found!</p>
      )}
    </Box>
  );
}

export default HighestUnitsList;
