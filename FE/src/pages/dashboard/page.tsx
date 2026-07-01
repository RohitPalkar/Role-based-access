import { Helmet } from 'react-helmet-async';

import { OpportunityList } from 'src/sections/rm-panel/opportunity-list';

// ----------------------------------------------------------------------

const metadata = { title: "Puravankara | Dashboard" };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>

      </Helmet>
      <OpportunityList />
    </>
  );
}
