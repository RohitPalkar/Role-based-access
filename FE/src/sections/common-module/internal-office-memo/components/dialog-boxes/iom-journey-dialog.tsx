import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Stack,
  Dialog,
  Divider,
  IconButton,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { formatDateIST } from 'src/utils/helper';

import { fetchIomAgeingDetails } from 'src/services/common-module/iom-details-service';

import { Iconify } from 'src/components/iconify';

type Props = {
  open: boolean;
  onClose: () => void;
  row?: any;
};

export function IomJourneyDialog({ open, onClose, row }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAgeingData = async () => {
      setLoading(true);
      if (open && row?.id) {
        try {
          const response = await fetchIomAgeingDetails(String(row.id));
          // Depending on actual response structure:
          const payloadData = response?.response?.data || response?.data || response;
          setData(payloadData || null);
        } catch (error) {
          console.error(error);
          setData(null);
        } finally {
          setLoading(false);
        }
      }
    };

    if (open) {
      fetchAgeingData();
    } else {
      setData(null);
    }
  }, [open, row?.id]);

  const summary = data?.summary || {};
  const timeline = data?.timeline || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          IOM Journey: {summary.iomNo || row?.iomNo || '-'}
        </Typography>
        <IconButton onClick={onClose}>
          <Iconify icon="eva:close-fill" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* IOM Details Card */}
            <Card sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                IOM Details
              </Typography>
              <Stack direction="row" spacing={3} divider={<Divider orientation="vertical" flexItem />}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sales Order ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {summary.salesOrderId || '-'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Project
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {summary.projectName || '-'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {summary.customerName || '-'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    IOM Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {summary.submittedAt ? formatDateIST(summary.submittedAt) : '-'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ageing
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, mb: 1 }}>
                    {summary.ageingInDays ?? 0} Days
                  </Typography>
                </Box>
              </Stack>
            </Card>

            {/* Journey Timeline Card */}
            <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Journey Timeline
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: 'success.main', width: 16 }} />
                    <Typography variant="caption">Completed</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify icon="eva:radio-button-on-fill" sx={{ color: 'warning.main', width: 16 }} />
                    <Typography variant="caption">In Progress</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify icon="eva:radio-button-off-fill" sx={{ color: 'text.disabled', width: 16 }} />
                    <Typography variant="caption">Pending</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Iconify icon="eva:close-circle-fill" sx={{ color: 'error.main', width: 16 }} />
                    <Typography variant="caption">Rejected</Typography>
                  </Stack>
                </Stack>
              </Box>
              
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {timeline.length > 0 ? timeline.map((item: any, index: number) => {
                  let bg = '#F4F6F8'; // default completed
                  let icon = 'eva:checkmark-circle-2-fill';
                  let iconColor = 'success.main';
                  
                  if (item.status?.includes('REJECTED')) {
                    bg = '#FFEBEE';
                    icon = 'eva:close-circle-fill';
                    iconColor = 'error.main';
                  } else if (item.isCurrentStage) {
                    bg = '#FFF8E1';
                    icon = 'eva:radio-button-on-fill';
                    iconColor = 'warning.main';
                  }

                  return (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        bgcolor: bg,
                        borderRadius: 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '40%' }}>
                        <Iconify 
                          icon={icon} 
                          sx={{ color: iconColor }} 
                        />
                        <Box>
                          <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                            {item.status ? item.status.replace(/_/g, ' ').toLowerCase() : item.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.durationInHours ? `${item.durationInHours} hours` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ width: '30%' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Completed On</Typography>
                        <Typography variant="subtitle2">
                          {item.completedOn ? formatDateIST(item.completedOn) : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ width: '30%' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Completed By</Typography>
                        <Typography variant="subtitle2">
                          {item.completedBy?.name || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No timeline data available.
                  </Typography>
                )}
              </Box>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
