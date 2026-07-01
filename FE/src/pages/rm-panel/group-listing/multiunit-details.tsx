import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';
import type { CreateMultiBookingGroupPayload } from 'src/services/rm-panel/multi-unit-service';

import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { ArrowBackIosNew } from '@mui/icons-material';
import { Box, Grid, Button, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { PAYMENT_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { setCreateStep } from 'src/redux/slices/rm-panel/multi-unit-slice';
import { editMultiBookingGroupThunk, createMultiBookingGroupThunk } from 'src/redux/actions/rm-panel/multi-unit-actions';

import { toast } from 'src/components/snackbar';
import { FilledButton } from 'src/components/buttons/FilledButton';
import BoxCheckInput from 'src/components/box-check-input/BoxCheckInput';
import ReusableInputBase from 'src/components/reusable-input-base/ReusableInputBase';

// ----------------------------------------------------------------------

interface MultiUnitDetailsProps {
  readonly selected?: Opportunity[];
  readonly setSelected?: React.Dispatch<React.SetStateAction<Opportunity[]>>;
}

export function MultiUnitDetails({ selected = [], setSelected }: MultiUnitDetailsProps) {
  const metadata = { title: 'Puravankara | Dashboard' };
  const jsonValue = uiText.multiunit;

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isNextLoading, setIsNextLoading] = useState(false);
  const location = useLocation();
  const { editMultiBookings } = useAppSelector((state) => state.multiUnit);
  const { groupDetails } = editMultiBookings?.data || {};
  const isEditMultiUnit = location.pathname.includes('/edit-multi-unit');

  const validationSchema = Yup.object({
    groupName: Yup.string().required(jsonValue.validation.groupName.required),
    bookingAmount: Yup.number()
      .typeError(jsonValue.validation.amount.number)
      .positive(jsonValue.validation.amount.positive)
      .when('paymentType', ([paymentType], schema) =>
        paymentType === PAYMENT_OPTIONS?.[0]?.value
          ? schema.required(jsonValue.validation.amount.required)
          : schema.notRequired()
      ),
    noOfUnits: Yup.number()
      .required(jsonValue.validation.noOfUnits.required)
      .positive(jsonValue.validation.noOfUnits.positive)
      .integer(jsonValue.validation.noOfUnits.integer),
    paymentType: Yup.string().required(jsonValue.validation.paymentMethod.required),
  });

  const formik = useFormik({
    initialValues: {
      groupName: '',
      bookingAmount: '',
      noOfUnits: 0,
      paymentType: 'lumpsump',
    },
    validationSchema,
    onSubmit: (values) => {},
  });

  const handleOnChange = (e: any, index: number, key: any, list: any) => {
    const selectedValue: string = list[index]?.value;
    formik.setFieldValue('paymentType', selectedValue);
  };
  useEffect(() => {
    if (selected?.length > 0) {
      
      formik.setFieldValue('noOfUnits', selected?.length);
    }
    const totalAmount = selected?.reduce((sum, item) => sum + (item?.Amount || 0), 0);
    formik.setFieldValue('bookingAmount', totalAmount);

    if (totalAmount === 0 && groupDetails) {
      formik.setFieldValue('bookingAmount', groupDetails?.amount || '');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (groupDetails && isEditMultiUnit) {
      formik.setFieldValue('groupName', groupDetails?.groupName || '');
      formik.setFieldValue('paymentType', groupDetails?.paymentMethod || 'lumpsump');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDetails]);

  const handleCreateGroup = async () => {
    try {
      await formik.validateForm();
      if (Object.keys(formik.errors).length > 0) {
        toast.error('Please fill all required fields.');
        return;
      }

      const payload: CreateMultiBookingGroupPayload = {
        groupName: formik.values.groupName,
        noOfUnits: formik.values.noOfUnits,
        groupedOppoId: selected?.map((item) => item.Id) || [],
        paymentMethod: formik.values.paymentType,
        ...(formik.values.paymentType === PAYMENT_OPTIONS?.[0]?.value
          ? { amount: formik.values.bookingAmount ? Number(formik.values.bookingAmount) : 0 }
          : {}),
      };

      setIsNextLoading(true);
      let res: any;
      if (isEditMultiUnit && groupDetails?.id) {
        res = await dispatch(
          editMultiBookingGroupThunk({ id: groupDetails.id, ...payload })
        ).unwrap();
      } else {
        res = await dispatch(createMultiBookingGroupThunk(payload)).unwrap();
      }

      if (res?.success) {
        setIsNextLoading(false);
        formik.setFieldValue('id', res?.data?.id || '');
        toast.success(res?.response?.message || jsonValue.messages.success);
        formik.setErrors({});
        formik.setTouched({});
        if (setSelected) setSelected([]);
        navigate('/rm-panel/group-list');
      }
    } catch (err: any) {
      setIsNextLoading(false);
      console.error('❌ Create failed:', err);
      toast.error(`${jsonValue.messages.error}: ${err || 'Unknown error'}`);
    }
  };
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <form onSubmit={formik.handleSubmit}>
        <Typography
          sx={{
            fontSize: '24px',
            fontWeight: 700,
            textAlign: 'center',
            m: 2,
            color: 'rgba(26, 64, 125, 1)',
          }}
        >
          RM Panel
        </Typography>

        <Box
          sx={{
            p: '26px 39px',
            border: '1px solid rgba(26, 64, 125, 0.3)',
            borderRadius: 2,
            m: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={12}>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', mb: 2 }}>
                {isEditMultiUnit
                  ? jsonValue.actionMenu.editGroup
                  : jsonValue.actionMenu.createGroup}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                {jsonValue.labels.groupName}
              </Typography>
              <ReusableInputBase
                fieldName="groupName"
                placeholder={`Enter ${jsonValue.labels.groupName}`}
                {...formik.getFieldProps('groupName')}
                error={formik.errors.groupName}
                touched={formik.touched.groupName}
                maxLength={50}
              />
            </Grid>

            <Grid item xs={12} md={12}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                How are the applicants going to pay the booking amount for each unit?
              </Typography>
              <BoxCheckInput
                field={{
                  name: 'paymentType',
                  required: true,
                  readonly: isEditMultiUnit,
                  options: PAYMENT_OPTIONS,
                  grid: true,
                  xsCol: 12,
                  smCol: 6,
                  mdCol: 6,
                  lgCol: 6,
                  handleOnChange,
                }}
                formik={formik}
              />
            </Grid>

            {formik.values.paymentType === PAYMENT_OPTIONS?.[0]?.value && (
              <Grid item xs={12} md={4}>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {jsonValue.labels.amount} paid in Lumpsum
                </Typography>
                <ReusableInputBase
                  fieldName="bookingAmount"
                  placeholder={`Enter ${jsonValue.labels.amount} paid in Lumpsum`}
                  {...formik.getFieldProps('bookingAmount')}
                  error={formik.errors.bookingAmount}
                  touched={formik.touched.bookingAmount}
                  maxLength={50}
                />
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                {jsonValue.labels.noOfUnits}
              </Typography>
              <ReusableInputBase
                fieldName="noOfUnits"
                placeholder={`Enter ${jsonValue.labels.noOfUnits}`}
                {...formik.getFieldProps('noOfUnits')}
                error={formik.errors.noOfUnits}
                touched={formik.touched.noOfUnits}
                maxLength={50}
                disabled
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'end',
              gap: '1.5rem',
              mt: 2,
            }}
          >
            <Button
              type="button"
              onClick={() => dispatch(setCreateStep(0))}
              startIcon={<ArrowBackIosNew />}
              sx={{ height: '48px', width: '157px', border: '1px solid #1A407D', color: '#1A407D' }}
            >
              Previous
            </Button>

            <FilledButton
              type="submit"
              onClick={handleCreateGroup}
              label={isEditMultiUnit ? jsonValue.actionMenu.edit : jsonValue.actionMenu.submit}
              isLoading={isNextLoading}
              height="48px"
              width="157px"
            />
          </Box>
        </Box>
      </form>
    </>
  );
}
