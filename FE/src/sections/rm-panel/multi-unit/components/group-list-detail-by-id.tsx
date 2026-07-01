import { Helmet } from 'react-helmet-async';

import { OpportunityList } from 'src/sections/rm-panel/opportunity-list';

// ----------------------------------------------------------------------

const metadata = { title: "Puravankara | Dashboard" };

export default function GroupListingDeatilByID() {
  const data = {
    groupName: "Group Six 01",
    noOfUnits:'5'
  }
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>

      </Helmet>
      <OpportunityList groupDetailById={data}/>
    </>
  );
}
