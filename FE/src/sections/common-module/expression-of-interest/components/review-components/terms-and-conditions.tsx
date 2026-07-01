import React from 'react'

import { Box, Typography } from '@mui/material'

import uiText from 'src/locales/langs/en/common.json';

export const TermsAndConditions = ({ termsAndConditionsData } : { termsAndConditionsData: string | null | undefined}) => {
  const previewText = uiText.eoiPreview.termsAndConditions;

  const getProcessedContent = (data : any) => {
    if (!data) return null;

    if (/<[a-z][\s\S]*>/i.test(data)) {
      return data;
    }
 
    return data.replaceAll(/\n/g, '<br />');
  };

  const processedContent = getProcessedContent(termsAndConditionsData);
 
  return (
    <div className="applicantDetailsCard">
      <h3 className="titlePersonalHD marginBottom28">
        {previewText.title}
      </h3>
      {processedContent ? (
        <Box
          id="terms-description"
          dangerouslySetInnerHTML={{ __html: processedContent }}
 
        />
      ) : (
        <Typography id="terms-description" variant="body2" sx={{ fontWeight: 500 }}>
          {previewText.noContent}
        </Typography>
      )}
    </div>
 
  )
}