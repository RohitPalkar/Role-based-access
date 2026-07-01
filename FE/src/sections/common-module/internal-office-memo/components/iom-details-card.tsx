import React from 'react';

import {
  Box,
  Grid,
  Card,
  Button,
  Divider,
  Typography,
  CircularProgress,
} from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { Label } from 'src/components/label';

import exportIcon from '../../../../assets/icons/export.svg';

const { view } = uiText.internalOfficeMemo;

type IomDetailsCardProps = Readonly<{
  iomId: string;
  status: string;
  statusColor?: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  generatedOn: string;
  iomDate: string;
  createdBy: string;
  isExporting?: boolean;
  onExport?: () => void;
  showDeviation?: boolean;
  showPendingVerification?: boolean;
  isEdited?: boolean;
}>;

const IomDetailsCard = ({
  iomId,
  status,
  statusColor = 'warning',
  generatedOn,
  iomDate,
  createdBy,
  isExporting = false,
  onExport,
  showDeviation = false,
  showPendingVerification = false,
  isEdited = false,
}: IomDetailsCardProps) => {
  const hasOverrideBadge = showDeviation || showPendingVerification;
  return (
    <Card sx={{ p: 2 }}>
      {/* Header */}
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '24px', fontWeight: 600 }}>
              {iomId}
            </Typography>

            {isEdited && (
              <Label
                variant="filled"
                color="default"
                sx={{ bgcolor: 'common.black', color: 'common.white' }}
              >
                {view.edited}
              </Label>
            )}

            {showDeviation && (
              <Label
                variant="filled"
                color="default"
                sx={{ bgcolor: 'common.black', color: 'common.white' }}
              >
                {view.deviation}
              </Label>
            )}

            {showPendingVerification && (
              <Label variant="soft" color="warning">
                {view.pendingVerification}
              </Label>
            )}

            {!hasOverrideBadge && status && (
              <Label variant="soft" color={statusColor}>
                {status}
              </Label>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={4} textAlign={{ xs: 'left', md: 'right' }}>
          <Button
            size="large"
            variant="contained"
            className="primaryBtn"
            startIcon={
              isExporting ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : (
                <img src={exportIcon} alt="export-icon" />
              )
            }
            sx={{ width: { xs: '100%', md: '160px' } }}
            disabled={isExporting}
            onClick={onExport}
          >
            {isExporting ? uiText.eoiPreview.exporting : uiText.eoiPreview.export}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2, borderColor: '#DADADA' }} />

      {/* Info Section */}
      <Grid container alignItems="center">
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary">
            {view.generatedOn}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {generatedOn}
          </Typography>
        </Grid>

        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary">
            {view.iomDate}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {iomDate}
          </Typography>
        </Grid>

        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary">
            {view.createdBy}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {createdBy}
          </Typography>
        </Grid>
      </Grid>
    </Card>
  );
};

export default IomDetailsCard;