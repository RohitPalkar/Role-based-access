import { Grid , Card, Divider, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

type UnitDetailsCardProps = {
  unitNo?: string | number;
  floor?: string | number;
  configuration?: string;
  areaSBA?: string | number;
  agreementValue?: string | number;
};

export const UnitDetailsCard = ({
  unitNo = '-',
  floor = '-',
  configuration = '-',
  areaSBA = '-',
  agreementValue = '-',
}: UnitDetailsCardProps) => {
  const labels = uiText.EOIJson.mapAndConvertEOI.label.unitCard;

  const textStyle = { fontSize: '14px', fontWeight: 400, mb: 0.5 };
  const dataStyle = { fontSize: '14px', fontWeight: 600 };
  const dividerStyle = { borderColor: '#919EAB33', mb: 1 };

  return (
    <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
    <Card
      sx={{
        px: 3,
        py: 2,
        backgroundColor: '#919EAB0D',
        borderRadius: '10px',
        boxShadow: 'none',
      }}
    >
      <Typography component="span" sx={textStyle}>
        {labels.unitNo}: &nbsp;
      </Typography>
      <Typography component="span" sx={dataStyle}>
        {unitNo}
      </Typography>
      <Divider sx={dividerStyle} />

      <Typography component="span" sx={textStyle}>
        {labels.floor}: &nbsp;
      </Typography>
      <Typography component="span" sx={dataStyle}>
        {floor}
      </Typography>
      <Divider sx={dividerStyle} />

      <Typography component="span" sx={textStyle}>
        {labels.configuration}: &nbsp;
      </Typography>
      <Typography component="span" sx={dataStyle}>
        {configuration}
      </Typography>
      <Divider sx={dividerStyle} />

      <Typography component="span" sx={textStyle}>
        {labels.areaSBA}: &nbsp;
      </Typography>
      <Typography component="span" sx={dataStyle}>
        {areaSBA ? `${areaSBA} Sq.ft.` : ''}
      </Typography>
      <Divider sx={dividerStyle} />

      {/* <Typography component="span" sx={textStyle}>
        {labels.agreementValue}: &nbsp;
      </Typography>
      <Typography component="span" sx={dataStyle}>
        {agreementValue}
      </Typography>
      <Divider sx={{ borderColor: '#919EAB33' }} /> */}
    </Card>
    </Grid>
  );
};
