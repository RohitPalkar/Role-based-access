import type { FormikProps } from "formik";

import React from "react";

import { Box, Grid, Checkbox, IconButton, Typography } from "@mui/material";

import transferIcon from 'src/assets/icons/start icon.svg';

import { FormikTextField } from "src/components/formik-textfield/formik-textfield";

type SwapFieldRowProps = {
  label: string;
  checkboxName: string;
  currentField: {
    name: string;
    label: string;
  };
  newField: {
    name: string;
    label: string;
  };
  formik: FormikProps<any>;
};

export const SwapFieldRow = ({
  label,
  checkboxName,
  currentField,
  newField,
  formik,
}: SwapFieldRowProps) => {
  const isChecked = Boolean(formik.values[checkboxName]);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Checkbox
          checked={isChecked}
          onChange={(e) =>
            formik.setFieldValue(checkboxName, e.target.checked)
          }
        />
        <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>

      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12} md={5.5} lg={5.5} >
          <FormikTextField
            name={currentField.name}
            label={currentField.label}
            formik={formik}
            disabled
            noGrid
          />
        </Grid>

        <Grid
          item
          xs={12}
          md={1}
          lg={1}
          sx={{ display: "flex", justifyContent: "center" }}
        >
          <IconButton
            sx={{
                backgroundColor: '#1A407D',
                color: 'white',
                borderRadius: '8px',  
                width: { xs: '100%', sm: '100%', md: '100%', lg: 56 },
                height: 48,
                '&:hover': {
                backgroundColor: '#174A9D',
                },
            }}
            >
             <img src={transferIcon} alt="transfer" />
          </IconButton>
        </Grid>

        <Grid item xs={12} md={5.5} lg={5.5}>
          <FormikTextField
            name={newField.name}
            label={newField.label}
            formik={formik}
            disabled
            noGrid
          />
        </Grid>
      </Grid>
    </Box>
  );
};
