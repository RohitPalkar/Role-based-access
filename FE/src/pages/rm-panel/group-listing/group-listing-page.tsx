import React from 'react';
import { Helmet } from 'react-helmet-async';

import { GroupListing } from 'src/sections/rm-panel/multi-unit/group-listing';

// ----------------------------------------------------------------------

export default function GroupListingPage() {
  const metadata = { title: 'Puravankara | Dashboard' };

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <GroupListing />
    </>
  );
}
