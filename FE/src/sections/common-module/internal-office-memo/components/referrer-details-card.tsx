import React from 'react';

import { Card, Grid, IconButton, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

const { view } = uiText.internalOfficeMemo;

export type ReferrerDetailsData = {
  customerName: string;
  project: string;
  unitNo: string;
  mobileNo?: string | null;
  bpCode?: string | null;
  location?: string | null;
  bookingDate?: string | null;
  pinelabsId?: string | null;
};

type Props = {
  title?: string;
  data: ReferrerDetailsData;
  showEdit?: boolean;
  onEdit?: () => void;
  showCreate?: boolean;
  onCreate?: () => void;
};

const hasDisplayValue = (value?: string | null): value is string =>
  Boolean(value?.trim());

const ReferrerDetailsCard = ({
  title = view.referrerDetails,
  data,
  showEdit = false,
  onEdit,
  showCreate = false,
  onCreate,
}: Props) => {
  const rows = [
    { label: view.customerName, value: data.customerName },
    ...(hasDisplayValue(data.mobileNo)
      ? [{ label: view.mobileNo, value: data.mobileNo }]
      : []),
    ...(hasDisplayValue(data.bpCode)
      ? [{ label: view.bpCode, value: data.bpCode }]
      : []),
    { label: view.project, value: data.project },
    ...(hasDisplayValue(data.location)
      ? [{ label: view.location, value: data.location }]
      : []),
    { label: view.unitNo, value: data.unitNo },
    ...(hasDisplayValue(data.bookingDate)
      ? [{ label: view.bookingDate, value: data.bookingDate }]
      : []),
  ];

  let headerAction: React.ReactNode = null;

  if (showCreate) {
    headerAction = (
      <IconButton size="small" onClick={onCreate} color="default">
        <Iconify icon="solar:add-circle-bold" width={20} />
      </IconButton>
    );
  } else if (showEdit) {
    headerAction = (
      <IconButton size="small" onClick={onEdit} color="default">
        <Iconify icon="solar:pen-bold" width={20} />
      </IconButton>
    );
  } else if (hasDisplayValue(data.pinelabsId)) {
    headerAction = (
      <Label color="secondary" variant="soft">
        {data.pinelabsId}
      </Label>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Grid item>
          <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
            {title}
          </Typography>
        </Grid>
        <Grid item>{headerAction}</Grid>
      </Grid>

      {/* Rows */}
      <Grid container spacing={2}>
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            {/* Label */}
            <Grid item xs={6}>
              <Typography color="text.secondary" sx={{ fontSize: '14px' }}>
                {row.label}
              </Typography>
            </Grid>

            <Grid item xs={6} textAlign="right">
              <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>
                {row.value}
              </Typography>
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
    </Card>
  );
};

export default ReferrerDetailsCard;