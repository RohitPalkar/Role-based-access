import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import uiText from 'src/locales/langs/en/common.json';

const { view } = uiText.internalOfficeMemo;

type Props = {
  sourceInSAP: string;
  sourceInSalesforce: string;
  agreementDone: string;
  referrerPaid: string;
  refereePaid: string;
};

const commonCellStyles = {
  px: 2,
  borderRight: '1px dashed',
  borderColor: '#DADADA',
};

const SourceDetailsCard = ({
  sourceInSAP,
  sourceInSalesforce,
  agreementDone,
  referrerPaid,
  refereePaid,
}: Props) => (
  <Card sx={{ p: 2 }}>
    <Grid container alignItems="center">
      
      <Grid item xs sx={{ ...commonCellStyles, px: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {view.sourceInSAP}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {sourceInSAP || 'N/A'}
        </Typography>
      </Grid>

      <Grid item xs sx={commonCellStyles}>
        <Typography variant="body2" color="text.secondary">
          {view.sourceInSalesforce}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {sourceInSalesforce || 'N/A'}
        </Typography>
      </Grid>

      <Grid item xs sx={commonCellStyles}>
        <Typography variant="body2" color="text.secondary">
          {view.agreementDone}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {agreementDone || 'N/A'}
        </Typography>
      </Grid>

      <Grid item xs sx={commonCellStyles}>
        <Typography variant="body2" color="text.secondary">
          {view.referrerPaid}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {referrerPaid || 'N/A'}
        </Typography>
      </Grid>

      <Grid item xs sx={{ px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {view.refereePaid}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {refereePaid || 'N/A'}
        </Typography>
      </Grid>
    </Grid>
  </Card>
);

export default SourceDetailsCard;