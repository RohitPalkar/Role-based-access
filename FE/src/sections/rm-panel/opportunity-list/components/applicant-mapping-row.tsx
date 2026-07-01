import type { FormikProps } from 'formik';

import { getIn } from 'formik';
import React, { useMemo, useCallback } from 'react';

import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Box, Grid, Button, FormLabel, Typography, FormControl } from '@mui/material';

import { applicantCountConstant } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

interface SelectOption {
  name: string;
  value: string | number;
}

interface ApplicantMappingRowProps {
  formik: FormikProps<any>;
  unitName?: string;
  applicantsPath?: string;
  applicantKeys?: string[];
  applicants?: Record<string, string | null>;
  applicantOptions?: SelectOption[];
  isDisabled?: boolean;
  canAdd?: boolean;
  canRemove?: boolean;
  readOnly?: boolean;
  isIndividualFlow?: boolean;
}

const ApplicantMappingRow: React.FC<ApplicantMappingRowProps> = React.memo(
  (
    {
      formik,
      unitName = '',
      applicantsPath = '',
      applicantKeys = ['applicant1', 'applicant2', 'applicant3', 'applicant4'],
      applicants = {},
      applicantOptions = [],
      isDisabled = false,
      canAdd = true,
      canRemove = true,
      readOnly = false,
      isIndividualFlow = true,
    }: ApplicantMappingRowProps = {} as ApplicantMappingRowProps
  ) => {
    const jsonValue = uiText.applicantMapping;
    const unitApplicants = useMemo<Record<string, string | null>>(() => {
      if (readOnly) return applicants || {};
      return (getIn(formik.values, applicantsPath) as Record<string, string | null>) || {};
    }, [applicants, applicantsPath, formik.values, readOnly]);

    const visibleApplicants = useMemo<string[]>(
      () => applicantKeys.filter((key) => unitApplicants[key] !== null),
      [unitApplicants, applicantKeys]
    );

    const handleAddApplicant = useCallback(() => {
      const emptyField = applicantKeys.find((key) => unitApplicants[key] === null);
      if (emptyField) {
        formik.setFieldValue(`${applicantsPath}.${emptyField}`, '');
      }
    }, [unitApplicants, applicantsPath, formik, applicantKeys]);

    const handleRemoveApplicant = useCallback(
      (field: string) => {
        const applicantsCopy = { ...getIn(formik.values, applicantsPath) } as Record<
          string,
          string | null
        >;
        const indexToRemove = applicantKeys.indexOf(field);

        if (indexToRemove === -1) return;

        for (let i = indexToRemove; i < applicantKeys.length - 1; i += 1) {
          applicantsCopy[applicantKeys[i]] = applicantsCopy[applicantKeys[i + 1]];
        }

        applicantsCopy[applicantKeys[applicantKeys.length - 1]] = null;
        formik.setFieldValue(applicantsPath, applicantsCopy);
      },
      [applicantsPath, formik, applicantKeys]
    );

    const maxApplicants = applicantKeys.length;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={12} md={3} lg={3}>
          <Typography
            sx={{
              color: '#1c252e',
              fontSize: '14px',
              fontWeight: '500',
              lineHeight: '22px',
            }}
          >
            {unitName}
          </Typography>
        </Grid>

        {/* Applicants Section */}
        <Grid item xs={12} sm={12} md={9} lg={9}>
          <Grid container spacing={3}>
            {visibleApplicants.map((field, index) => (
              <Grid key={field} item xs={12} sm={6} md={4} lg={4}>
                <FormControl fullWidth>
                  <FormLabel
                    sx={{
                      color: '#1c252e',
                      fontSize: '14px',
                      fontWeight: '500',
                      lineHeight: '22px',
                      mb: '6px',
                    }}
                  >
                    {index === 0 ? (
                      <span>
                        {isIndividualFlow
                          ? jsonValue.labels.primaryApplicant
                          : jsonValue.labels.authorizedSignatory}
                      </span>
                    ) : (
                      <span>
                        {index + 1}
                        {`${applicantCountConstant?.numberKeys[index + 1]} `}
                        {isIndividualFlow
                          ? jsonValue.labels.applicant
                          : jsonValue.labels.authorizedSignatory}
                      </span>
                    )}
                    {index === visibleApplicants.length - 1 && canRemove && index !== 0 && (
                      <RemoveCircleIcon
                        sx={{
                          color: '#ff0000',
                          height: '20px',
                          width: '20px',
                          verticalAlign: 'middle',
                          marginLeft: 2,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRemoveApplicant(field)}
                      />
                    )}
                  </FormLabel>

                  {readOnly ? (
                    <Typography
                      sx={{
                        border: '1px solid #00000061',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        background: '#ffffff00',
                        color: '#00000061',
                      }}
                    >
                      {unitApplicants?.[field]}
                    </Typography>
                  ) : (
                    <Box sx={{
                      '& .MuiInputBase-input': {
                        height: '8.5px !important',
                      },
                    }}>
                      <FormikAutocomplete
                        name={`${applicantsPath}.${field}`}
                        options={(index === 0
                          ? applicantOptions.filter((opt: any) => !opt?.isMinor)
                          : applicantOptions
                        ).map((opt) => ({
                          value: opt.value,
                          label: opt.name,
                        }))}
                        placeholder="Select"
                        formik={formik}
                        disabled={isDisabled}
                      />
                    </Box>
                  )}
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Add Button */}
        {visibleApplicants.length < maxApplicants && canAdd && (
          <Grid item xs={12} sm={12} md={12} lg={12} display="flex" justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAddApplicant}
              sx={{
                textTransform: 'none',
                borderRadius: 1,
                borderColor: '#1A407D',
                padding: '8px 20px',
                color: '#1A407D',
                '&:hover': {
                  borderColor: '#1A407D',
                },
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {jsonValue.buttons.addApplicant}
            </Button>
          </Grid>
        )}
      </Grid>
    );
  }
);

export default ApplicantMappingRow;
