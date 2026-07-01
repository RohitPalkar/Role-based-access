import React from 'react'

import { Box, Button, Typography } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility';

import { DOC_MESSAGE } from 'src/utils/constant';

interface ReviewInputProps {
  text: string;
  name: string;
  onView: (name: string) => void;
  disabled?: boolean;
  boxWidth?: string | number;
  justifyContent?: string;
  isPhysicalDoc?: boolean;
  isKycPagePhysicalSubmited?: boolean;
  documentNumber?: string;
}

const ReviewInput = ({ text, name, onView, disabled = false, boxWidth = "100%", justifyContent = "space-between", isPhysicalDoc = false,isKycPagePhysicalSubmited=false, documentNumber } : ReviewInputProps) => {
  let titleText = text;
  if (isPhysicalDoc) {
    titleText = `${text}: ${DOC_MESSAGE}`;
  } else if (documentNumber) {
    titleText = `${text}: ${documentNumber}`;
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent,
        width: boxWidth,
        height:'100%'
      }}
    >
      {text.includes(":") ? (
        <Typography
          sx={{ fontSize: "14px", width: isPhysicalDoc ? "100%" : "75%" }}
        >
          <span style={{ fontWeight: 400 }}>{text.split(":")[0]}:</span> &nbsp;
          <span style={{ fontWeight: isPhysicalDoc ? 500 : 600 }}>
            {isPhysicalDoc && !isKycPagePhysicalSubmited ? `${DOC_MESSAGE}` : text.split(":")[1]}
          </span>
          <br/>
          {isKycPagePhysicalSubmited && <span style={{ fontWeight: 500 }}>{DOC_MESSAGE}</span>}
        </Typography>
      ) : (
        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 500,
            width: isPhysicalDoc ? "100%" : "75%",
          }}
          title={titleText}
        >
          {isPhysicalDoc ? (
            <>
              <Typography
                component="span"
                sx={{ fontSize: "14px", fontWeight: "400" }}
              >
                {text}:
              </Typography>
              <Typography
                component="span"
                sx={{ fontSize: "14px", fontWeight: "600" }}
                marginLeft={2}
              >
                {isKycPagePhysicalSubmited && <br />}
                {DOC_MESSAGE}
              </Typography>
            </>
          ) : (
            <>
              <Typography
                component="span"
                sx={{ fontSize: "14px", fontWeight: 400 }}
              >
                {text}:
              </Typography>

              {documentNumber && (
                <Typography
                  component="span"
                  sx={{ fontSize: "14px", fontWeight: 600 }}
                  marginLeft={2}
                >
                  {documentNumber}
                </Typography>
              )}
            </>
          )}
        </Typography>
      )}

      {!isPhysicalDoc && (
        <Button
          startIcon={<VisibilityIcon sx={{ color: disabled ? undefined : "#1A407D" }} />}
          size="large"
          sx={{
            textTransform: "none",
            color: "#1A407D",
            fontWeight: 400,
            fontSize: "14px",
            border: `1px solid ${disabled ? "#BDBDBD" : "#1A407D"}`,
            borderRadius: "8px",
            px: 2,
          }}
          onClick={() => onView(name)}
          disabled={disabled}
        >
          View
        </Button>
      )}
    </Box>
  );
};

export default ReviewInput;