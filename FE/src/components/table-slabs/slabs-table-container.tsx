import React from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Select,
  Divider,
  useTheme,
  MenuItem,
  TextField,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';

import { formatSlabNumber } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

interface IPropsBottom {
  readonly item: any;
  readonly index: number;
  // eslint-disable-next-line react/no-unused-prop-types
  readonly remove?: (index: number) => void;
  readonly isEditable?: boolean;
  // eslint-disable-next-line react/no-unused-prop-types
  readonly launchRequired?: any;
  // eslint-disable-next-line react/no-unused-prop-types
  readonly sustenanceRequired?: any;
}
interface IPropsHeader {
  readonly isEditable?: boolean;
  readonly adminStyling?: boolean;
}

export function IncentiveStructureHeader(props: IPropsHeader) {
  const { isEditable = false, adminStyling = false } = props;
  return (
    <Grid container sx={{ backgroundColor: '#F4F6F8', mt: 2 }} className="targetValueCont">
      <Grid
        className="srTblRow"
        item
        xs={0.5}
        sx={{
          textAlign: 'center',
          alignContent: 'center',
          borderRight: '1px solid #DADADA',
          px: 0,
          py: 4,
        }}
      >
        {adminStyling && <Typography>Sr #</Typography>}
      </Grid>
      <Grid
        className="srTblRowContent"
        item
        xs={isEditable ? 11 : 11.5}
        sx={{ textAlign: 'center' }}
      >
        <Grid container>
          <Grid item xs={12} sx={{ textAlign: 'center', p: 2, borderBottom: '1px solid #DADADA' }}>
            <Typography variant="body2" sx={{ fontSize: adminStyling ? '14px': '16px', fontWeight: adminStyling ? 'inherit' : 600}}>
              {adminStyling ? uiText?.incentiveStructure?.form?.create?.targetSalesValue : uiText?.incentiveStructure?.form?.create?.incentiveSlabStructure}
            </Typography>
          </Grid>
          <Grid item xs={adminStyling ? 5.7 : 6} sx={{ textAlign: 'center', p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: adminStyling ? '14px': '16px', fontWeight: adminStyling ? 'inherit' : 600 }}>
                  {uiText?.incentiveStructure?.form?.create?.launchProject}
                </Typography>
              </Grid>

            </Grid>
          </Grid>
          <Grid item xs={adminStyling ? 6.3 : 6} sx={{ textAlign: 'center', p: 2, borderLeft: '1px solid #DADADA' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: adminStyling ? '14px': '16px', fontWeight: adminStyling ? 'inherit' : 600 }}>
                  {uiText?.incentiveStructure?.form?.create?.substanceProject}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {isEditable && (
        <Grid
          item
          xs={0.5}
          sx={{ textAlign: 'center', alignContent: 'center', borderLeft: '1px solid #DADADA' }}
        />
      )}
    </Grid>
  );
}

export function IncentiveStructureBottom(props: IPropsBottom) {
  const { item, index, remove, isEditable = false, launchRequired, sustenanceRequired } = props;
  const theme = useTheme();
  return (
    <Box key={item?.id || index} className="tblShowContentWrapper">
      <Grid container spacing={2} mb={2} mt={1} className="tblShowContent">
        <Grid
          item
          xs={0.5}
          sx={{ textAlign: 'center', alignContent: 'center' }}
          className="firstSR"
        >
          <Typography variant="body2">{index + 1}</Typography>
        </Grid>
        <Grid
          item
          xs={isEditable ? 11 : 11.5}
          sx={{ textAlign: 'center' }}
          className="firstShowData"
        >
          {/* wrap="nowrap" add later when vertical border needed */}
          <Grid container spacing={2}  >   
            {/* Launch */}
            {/* need to change later when vertical border added change xs={6} -> xs={5.9} */}
            <Grid item xs={6} sx={{ textAlign: 'center' }}> 
              <Grid container spacing={2}>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6} sx={{ pl: '0 !important' }}>
                  {' '}
                  <Box sx={{ ml: { xs: 1.5, md: 2 } }}>
                    {isEditable ? (
                      <Field.Text
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        name={`slabs.${index}.launchStartRange`}
                        label={uiText.incentiveStructure.form.label.startRange}
                        required={!!launchRequired}
                      />
                    ) : (
                      <TextField
                        disabled
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        helperText=""
                        label={uiText.incentiveStructure.form.label.startRange}
                        defaultValue={item?.launchStartRange || ''}
                      />
                    )}
                  </Box>
                </Grid>

                <Grid item xs={6} sm={6} md={6} lg={6} xl={6} sx={{ pl: '0 !important' }}>
                  <Box sx={{ ml: { xs: 1.5, md: 2 } }}>
                    {isEditable ? (
                      <Field.Text
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        name={`slabs.${index}.launchEndRange`}
                        label={uiText.incentiveStructure.form.label.endRange}
                        required={!!launchRequired}
                      />
                    ) : (
                      <TextField
                        disabled
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        helperText=""
                        label={uiText.incentiveStructure.form.label.endRange}
                        defaultValue={item?.launchEndRange || ''}
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
                  {isEditable ? (
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      label={uiText.incentiveStructure.form.label.Incentive}
                      name={`slabs.${index}.launchIncentivePercentage`}
                      required={!!launchRequired}
                    />
                  ) : (
                    <TextField
                      disabled
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      label={uiText.incentiveStructure.form.label.Incentive}
                      helperText=""
                      defaultValue={item?.launchIncentivePercentage || ''}
                    />
                  )}
                </Grid>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
                  {isEditable ? (
                    <Field.Text
                      name={`slabs.${index}.launchMinBookings`}
                      label={uiText.incentiveStructure.form.label.minimumBookings}
                      placeholder={uiText.incentiveStructure.form.label.minimumBookingsPlaceholder}
                      inputProps={{ maxLength: 3 }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      disabled
                      helperText=""
                      label={uiText.incentiveStructure.form.label.minimumBookings}
                      defaultValue={item?.minimumBookings || ''}
                    />
                  )}
                </Grid>
              </Grid>
            </Grid>

            {/* <Grid
              item
              md={0.2}
              sx={{
                display: {xs: 'flex' },
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  borderLeft: '1px dashed',
                  borderColor: 'divider',
                }}
              />
            </Grid> */}

            {/* Substance */}
            <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6} sx={{ pl: '0 !important' }}>
                  <Box sx={{ ml: { xs: 1.5, md: 2 } }}>
                    {isEditable ? (
                      <Field.Text
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        name={`slabs.${index}.sustenanceStartRange`}
                        label={uiText.incentiveStructure.form.label.startRange}
                        required={!!sustenanceRequired}
                      />
                    ) : (
                      <TextField
                        disabled
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        helperText=""
                        label={uiText.incentiveStructure.form.label.startRange}
                        defaultValue={item?.sustenanceStartRange || ''}
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6} sx={{ pl: '0 !important' }}>
                  <Box sx={{ ml: { xs: 1.5, md: 2 } }}>
                    {isEditable ? (
                      <Field.Text
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        name={`slabs.${index}.sustenanceEndRange`}
                        label={uiText.incentiveStructure.form.label.endRange}
                        required={!!sustenanceRequired}
                      />
                    ) : (
                      <TextField
                        disabled
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                        }}
                        helperText=""
                        label={uiText.incentiveStructure.form.label.endRange}
                        defaultValue={item?.sustenanceEndRange || ''}
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
                  {isEditable ? (
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      label={uiText.incentiveStructure.form.label.Incentive}
                      name={`slabs.${index}.sustenanceIncentivePercentage`}
                      required={!!sustenanceRequired}
                    />
                  ) : (
                    <TextField
                      disabled
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      label={uiText.incentiveStructure.form.label.Incentive}
                      helperText=""
                      defaultValue={item?.sustenanceIncentivePercentage || ''}
                    />
                  )}
                </Grid>
                <Grid item xs={6} sm={6} md={6} lg={6} xl={6}>
                  {isEditable ? (
                    <Field.Text
                      name={`slabs.${index}.sustenanceMinBookings`}
                      label={uiText.incentiveStructure.form.label.minimumBookings}
                      placeholder={uiText.incentiveStructure.form.label.minimumBookingsPlaceholder}
                      inputProps={{ maxLength: 3 }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      disabled
                      helperText=""
                      label={uiText.incentiveStructure.form.label.minimumBookings}
                      defaultValue={item?.minimumBookings || ''}
                    />
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {isEditable && (
          <Grid item xs={0.5} alignContent="start" sx={{ textAlign: 'center' }}>
            {index > 0 && (
              <Iconify
                icon="solar:trash-bin-trash-bold"
                onClick={() => remove?.(index)}
                cursor="pointer"
                color={theme.palette.error.main}
                sx={{ mt: 2 }}
              />
            )}
          </Grid>
        )}
      </Grid>
      <Divider sx={{ borderStyle: 'dashed' }} />
    </Box>
  );
}

export interface MappedSlabItem {
  id?: string | number;
  launchStartRange?: number | string;
  launchEndRange?: number | string;
  launchIncentivePercentage?: number | string;
  launchMinBookings?: number | string;
  sustenanceStartRange?: number | string;
  sustenanceEndRange?: number | string;
  sustenanceIncentivePercentage?: number | string;
  sustenanceMinBookings?: number | string;
}

interface IncentiveStructureTableBodyProps {
  readonly slabs: MappedSlabItem[];
}

const BORDER_COLOR = '#DADADA';

export function IncentiveStructureTableBody({ slabs }: IncentiveStructureTableBodyProps) {
  if (!slabs?.length) return null;

  return (
    <>
      {/* Column headers row - match header structure, borders, and responsive behavior */}
      <Box sx={{ backgroundColor: '#F4F6F8', borderBottom: `1px solid ${BORDER_COLOR}` }} className="tblShowContentWrapper">
        <Grid container spacing={0} className="tblShowContent" sx={{ flexWrap: 'nowrap' }}>
          <Grid item xs={0.5} sx={{ textAlign: 'center', alignContent: 'center', py: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 40 }} className="firstSR">
            <Typography variant="body2" sx={{ fontSize: '14px' }}>Sr #</Typography>
          </Grid>
          <Grid item xs={11.5} sx={{ textAlign: 'center', minWidth: 750 }} className="firstShowData">
            <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
              <Grid item xs={6} sx={{ p: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 325, borderTop: `1px solid ${BORDER_COLOR}` }} className="launchCol">
                <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.incentiveStructure?.form?.label?.slabRange}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 80, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.incentiveStructure?.form?.label?.incentiveRate}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.incentiveStructure?.form?.label?.minimumBookings}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={6} sx={{ p: 1.5, minWidth: 325, borderTop: `1px solid ${BORDER_COLOR}` }} className="sustenanceCol">
                <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.incentiveStructure?.form?.label?.slabRange}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 80, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.incentiveStructure?.form?.label?.incentiveRate}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText.incentiveStructure?.form?.label?.minimumBookings}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
      {/* Data rows - borders match header, same responsive min-widths */}
      {slabs?.map((item, index) => {
        if (item == null) return null;
        return (
        <Box key={item?.id ?? index} className="tblShowContentWrapper">
          <Grid container spacing={0} className="tblShowContent" sx={{ borderBottom: `1px dashed ${BORDER_COLOR}`, flexWrap: 'nowrap' }}>
            <Grid item xs={0.5} sx={{ textAlign: 'center', alignContent: 'center', py: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 40 }} className="firstSR">
              <Typography variant="body2">{index + 1}</Typography>
            </Grid>
            <Grid item xs={11.5} sx={{ textAlign: 'center', minWidth: 750 }} className="firstShowData">
              <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                {/* Launch Columns */}
                <Grid item xs={6} sx={{ textAlign: 'center', borderRight: `1px solid ${BORDER_COLOR}`, py: 1.5, minWidth: 325 }} className="launchCol">
                <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                  <Grid item xs={4} sx={{ borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {'<'} {formatSlabNumber(item?.launchStartRange ?? '-')} Cr. - {formatSlabNumber(item?.launchEndRange ?? '-')} Cr.
                    </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 80, flex: '1 1 0' }}>
                      <Typography variant="body2">
                        {item?.launchIncentivePercentage !== '' && item?.launchIncentivePercentage != null
                          ? `${formatSlabNumber(item.launchIncentivePercentage)}%`
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ px: 1, minWidth: 100, flex: '1 1 0' }}>
                      <Typography variant="body2">{formatSlabNumber(item?.launchMinBookings)}</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Sustenance Columns */}
                <Grid item xs={6} sx={{ textAlign: 'center', py: 1.5, minWidth: 325 }} className="sustenanceCol">
                  <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                    <Grid item xs={4} sx={{ borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {'<'} {formatSlabNumber(item?.sustenanceStartRange ?? '-')} Cr. - {formatSlabNumber(item?.sustenanceEndRange ?? '-')} Cr.
                    </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 80, flex: '1 1 0' }}>
                      <Typography variant="body2">
                        {item?.sustenanceIncentivePercentage !== '' && item?.sustenanceIncentivePercentage != null
                          ? `${formatSlabNumber(item.sustenanceIncentivePercentage)}%`
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ px: 1, minWidth: 100, flex: '1 1 0' }}>
                      <Typography variant="body2">{formatSlabNumber(item?.sustenanceMinBookings)}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      );
      })}
    </>
  );
}

/** Booster slab structure for RM - single header row: Sr # | Launch Projects | Reward (same structure as data rows) */
export function BoosterSlabStructureHeader() {
  return (
    <Box sx={{ backgroundColor: '#F4F6F8', mt: 2, borderBottom: `1px solid ${BORDER_COLOR}` }} className="tblShowContentWrapper">
      <Grid container spacing={0} className="tblShowContent" sx={{ flexWrap: 'nowrap' }}>
        <Grid
          item
          xs={0.5}
          sx={{
            borderRight: `1px solid ${BORDER_COLOR}`,
            minWidth: 40,
          }}
          className="firstSR"
        />
        <Grid item xs={11.5} sx={{ textAlign: 'center', minWidth: 750 }} className="firstShowData">
          <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
            <Grid
              item
              xs={6}
              sx={{
                textAlign: 'center',
                borderRight: `1px solid ${BORDER_COLOR}`,
                py: 2,
                minWidth: 325,
              }}
              className="launchCol"
            >
              <Typography variant="body2" sx={{ fontSize: '16px', fontWeight: 600 }}>
                {uiText?.boosterStructure?.form?.create?.targetSalesValue }
              </Typography>
            </Grid>
            <Grid
              item
              xs={6}
              sx={{ textAlign: 'center', py: 2, minWidth: 325, borderLeft: `1px solid ${BORDER_COLOR}` }}
              className="sustenanceCol"
            >
              <Typography variant="body2" sx={{ fontSize: '16px', fontWeight: 600 }}>
                {uiText?.boosterStructure?.form?.create?.reward ?? 'Reward'}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

interface BoosterSlabItem {
  id?: number;
  startRange?: string | number;
  endRange?: string | number;
  rewardType?: string;
  rewardValue?: string | number;
}

interface BoosterSlabTableBodyProps {
  readonly slabs: BoosterSlabItem[];
}

export function BoosterSlabTableBody({ slabs }: BoosterSlabTableBodyProps) {
  if (!slabs?.length) return null;

  return (
    <>
      {/* Column headers row - Sr # | Slab Range | Reward Type | Reward Name */}
      <Box sx={{ backgroundColor: '#F4F6F8', borderBottom: `1px solid ${BORDER_COLOR}` }} className="tblShowContentWrapper">
        <Grid container spacing={0} className="tblShowContent" sx={{ flexWrap: 'nowrap' }}>
          <Grid item xs={0.5} sx={{ textAlign: 'center', alignContent: 'center', py: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 40 }} className="firstSR">
            <Typography variant="body2" sx={{ fontSize: '14px' }}>Sr #</Typography>
          </Grid>
          <Grid item xs={11.5} sx={{ textAlign: 'center', minWidth: 750 }} className="firstShowData">
            <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
              <Grid item xs={6} sx={{ p: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 325 }} className="launchCol">
                <Typography variant="body2" sx={{ fontSize: '14px' }}>
                  {uiText?.incentiveStructure?.form?.label?.slabRange}
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ p: 1.5, minWidth: 325, borderLeft: `1px solid ${BORDER_COLOR}` }} className="sustenanceCol">
                <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                  <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.boosterStructure?.form?.label?.rewardType ?? 'Reward Type'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', px: 1, minWidth: 100, flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontSize: '14px' }}>
                      {uiText?.boosterStructure?.form?.label?.rewardName ?? 'Reward Name'}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
      {/* Data rows */}
      {slabs?.map((item, index) => {
        if (item == null) return null;
        let rewardDisplay: string;
        if (item?.rewardType === 'Percentage') {
          rewardDisplay = `${formatSlabNumber(item?.rewardValue ?? '-')}%`;
        } else if (item?.rewardType === 'Cash Prize') {
          rewardDisplay = `₹${formatSlabNumber(item?.rewardValue ?? '-')}`;
        } else {
          rewardDisplay = String(item?.rewardValue ?? '-');
        }
        return (
          <Box key={item?.id ?? index} className="tblShowContentWrapper">
            <Grid container spacing={0} className="tblShowContent" sx={{ borderBottom: `1px dashed ${BORDER_COLOR}`, flexWrap: 'nowrap' }}>
              <Grid item xs={0.5} sx={{ textAlign: 'center', alignContent: 'center', py: 1.5, borderRight: `1px solid ${BORDER_COLOR}`, minWidth: 40 }} className="firstSR">
                <Typography variant="body2">{index + 1}</Typography>
              </Grid>
              <Grid item xs={11.5} sx={{ textAlign: 'center', minWidth: 750 }} className="firstShowData">
                <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                  <Grid item xs={6} sx={{ textAlign: 'center', borderRight: `1px solid ${BORDER_COLOR}`, py: 1.5, minWidth: 325 }} className="launchCol">
                    <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                      <Grid item xs={12} sx={{ borderRight: 'none', px: 1, minWidth: 100, flex: '1 1 0' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {'<'} {formatSlabNumber(item?.startRange ?? '-')} Cr. - {formatSlabNumber(item?.endRange ?? '-')} Cr.
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'center', py: 1.5, minWidth: 325, borderLeft: `1px solid ${BORDER_COLOR}` }} className="sustenanceCol">
                    <Grid container spacing={0} sx={{ flexWrap: 'nowrap' }}>
                      <Grid item xs={6} sx={{ borderRight: `1px solid ${BORDER_COLOR}`, px: 1, minWidth: 100, flex: '1 1 0' }}>
                        <Typography variant="body2">{item?.rewardType ?? '-'}</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ px: 1, minWidth: 100, flex: '1 1 0' }}>
                        <Typography variant="body2">{rewardDisplay}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </>
  );
}

export function IncentiveStructureBoosterHeader() {
  return (
    <Grid container sx={{ backgroundColor: '#F4F6F8', mt: 2 }} className="secondHeaderScroll">
      <Grid
        className="secondSr"
        item
        xs={1}
        sx={{ textAlign: 'center', alignContent: 'center', borderRight: '1px solid #DADADA', p: 2 }}
      >
        <Typography>Sr #</Typography>
      </Grid>
      <Grid
        className="secondCnt"
        item
        xs={5}
        sx={{ textAlign: 'center', borderRight: '1px solid #DADADA', p: 2 }}
      >
        <Typography variant="body2">
          {uiText?.incentiveStructure?.form?.create?.launchProject ?? 'Launch Projects'}
        </Typography>
      </Grid>
      <Grid className="secondReward" item xs={6} sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="body2">Reward</Typography>
      </Grid>
    </Grid>
  );
}

export function IncentiveStructureBoosterBottom(props: IPropsBottom) {
  const { item, index, isEditable = false } = props;

  return (
    <Box key={item?.id || index} className="secondShowDataScroll">
      <Grid container spacing={2} mb={2} mt={1} className="secondShowDataScrollData">
        <Grid item xs={1} sx={{ textAlign: 'center', alignContent: 'center' }} className="secondSr">
          <Typography variant="body2">{index + 1}</Typography>
        </Grid>
        <Grid item xs={5} sx={{ textAlign: 'center' }} className="secondCnt">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                disabled={!isEditable}
                InputProps={{
                  endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                }}
                label={uiText.incentiveStructure.form.label.startRange}
                defaultValue={item?.startRange || ''}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                disabled={!isEditable}
                InputProps={{
                  endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                }}
                label={uiText.incentiveStructure.form.label.endRange}
                defaultValue={item?.endRange || ''}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: 'center' }} className="secondReward">
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Reward</InputLabel>
                <Select
                  value={item?.rewardType || ''}
                  readOnly={!isEditable}
                  IconComponent={KeyboardArrowDownIcon}
                  sx={{ textAlign: 'left' }}
                >
                  <MenuItem value={item?.rewardType || ''}>{item?.rewardType || ''}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={7}>
              <TextField fullWidth disabled={!isEditable} defaultValue={item?.rewardValue || ''} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Divider sx={{ borderStyle: 'dashed' }} />
    </Box>
  );
}
