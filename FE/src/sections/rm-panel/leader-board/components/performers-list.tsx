import React from 'react';

import { Box } from '@mui/material';

import { getInitials } from 'src/utils/helper';

import PerformerItem from './performers-item';


interface Performer {
  id: number,
  name: string,
  amount: string
  totalCancellations: any;
  isHighestUnitsSold: boolean
}


interface PerformerListProps {
  readonly performers: Performer[];
}

function PerformerList({ performers }: PerformerListProps) {
  return (
    <Box sx={{
      minHeight: { md: "280px", xs: "auto" },
      maxHeight: "340px", // Adjust height to fit ~5 items
      overflowY: "auto", // Enables vertical scrolling
      pr: 1, // Adds space between content and scrollbar
      "&::-webkit-scrollbar": { width: "8px" }, // Slightly wider scrollbar
      width:'100%'
    }}>

      {performers && performers?.length > 0 ? <>
        {performers && performers?.length > 0 && performers?.map((performer, index) =>
        (<>
          {performer.name && <Box key={index} sx={{
            m: 1
          }}>
            <PerformerItem
              name={performer.name}
              initials={getInitials(performer.name)}
              amount={`${performer.amount}`}
              rank={index + 1}
              totalCancellations={performer.totalCancellations || undefined}
              isHighestUnitsSold={performer.isHighestUnitsSold}
            />
          </Box>}
        </>
        )
        )}
      </> : <Box sx={{ opacity: 0.6, display: "flex", justifyContent: "center", m: 3, alignItems: "center", minHeight: { md: "280px", xs: "auto" }, }} >No Data Available </Box>}
    </Box>
  );
}

export default PerformerList;
