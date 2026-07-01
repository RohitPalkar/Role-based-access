import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';

import React, { useState } from 'react';

import { Box, Card, Grid, Button, Typography, CircularProgress } from '@mui/material';

import { UnitSwappingService } from 'src/services/unit-swapping-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { OpportunitySelectionDialog } from 'src/components/opportunity-selection-dialog';

import swapArrow from '../../../../../public/assets/icons/swapIcon.svg';

interface UnitInfo {
  unitNumber?: string;
  projectName?: string;
  unitType?: string;
  area?: string;
  price?: string;
}

interface UnitSwapComponentProps {
  readonly cancelledUnit?: UnitInfo;
  readonly newUnit?: UnitInfo;
  readonly onClose?: () => void;
}

export function UnitSwapComponent({ cancelledUnit, newUnit, onClose }: UnitSwapComponentProps) {
  const [selectedCancelledUnit, setSelectedCancelledUnit] = useState<Opportunity | null>(null);
  const [selectedNewUnit, setSelectedNewUnit] = useState<Opportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'cancelled' | 'new'>('cancelled');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const isBothSelected = !!selectedCancelledUnit && !!selectedNewUnit;

  const handleOpenDialog = (type: 'cancelled' | 'new', isEdit = false) => {
    setDialogType(type);
    setIsEditMode(isEdit);
    setDialogOpen(true);
  };

  const handleSelectOpportunity = (opportunity: Opportunity) => {
    if (dialogType === 'cancelled') {
      setSelectedCancelledUnit(opportunity);
    } else {
      setSelectedNewUnit(opportunity);
    }
    setDialogOpen(false);
  };

  const performSwap = async () => {
    setIsLoading(true);
    try {
      const payload = {
        sourceOppId: selectedCancelledUnit!.Id,
        targetOppId: selectedNewUnit!.Id,
      };

      const response = await UnitSwappingService.swapUnits(payload);
      // Success handling with toast - use response message if available
      const successMessage =
        response?.response?.message ||
        `Unit swap successful! ${selectedCancelledUnit!.unitno} has been swapped with ${selectedNewUnit!.unitno}.`;

      toast.success(successMessage);

      const route = `/rm-panel/bookings/pre-booking-form/${selectedNewUnit!.Id}`;
      window.location.href = `${window.location.origin}${route}`;
    } catch (error: any) {
      // Extract error message from the error object
      let errorMessage = 'Failed to swap units. Please try again.';

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors?.message) {
        errorMessage = error.response.data.errors.message;
      }

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!selectedCancelledUnit || !selectedNewUnit) {
      toast.warning('Please select both cancelled and new units before proceeding.');
      return;
    }

    // Validation: Check if same unit is selected for both
    if (selectedCancelledUnit.Id === selectedNewUnit.Id) {
      toast.error('Cannot swap the same unit. Please select different units.');
      return;
    }

    // Compare enquiry reference numbers
    const cancelledEnqRef = selectedCancelledUnit.enqrefno;
    const newEnqRef = selectedNewUnit.enqrefno;

    if (cancelledEnqRef === newEnqRef) {
      // Same enquiry reference numbers - proceed directly
      await performSwap();
    } else {
      // Different enquiry reference numbers - show confirmation dialog
      setConfirmDialogOpen(true);
    }
  };

  const handleConfirmDifferentEnquiry = async () => {
    setConfirmDialogOpen(false);
    await performSwap();
  };

  const handleCancelConfirmation = () => {
    setConfirmDialogOpen(false);
  };

  const renderUnitBox = (
    title: string,
    selectedOpportunity: Opportunity | null,
    isCancelled = false
  ) => {
    const isSelected = !!selectedOpportunity;

    return (
      <Card
        sx={{
          minHeight: isSelected ? 'auto' : 'calc(100vh - 200px)',
          border: '1px solid',
          borderColor: 'grey.300',
          px: 2,
          py: 4,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Label Tab */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            bgcolor: '#E6ECFF',
            color: '#00368C',
            px: 1.5,
            py: 0.5,
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          {title}
        </Box>

        {/* Edit Icon */}
        {isSelected && (
          <Box
            onClick={() => handleOpenDialog(isCancelled ? 'cancelled' : 'new', true)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: 1.5, // same as 12px
              border: '1px solid #D5DAE1',
              backgroundColor: '#F8F9FB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: '#F8F9FB', // prevent hover color change
              },
            }}
          >
            <Iconify icon="eva:edit-2-outline" width={16} height={16} color="#1A237E" />
          </Box>
        )}

        <Grid
          container
          spacing={1}
          sx={{
            flexGrow: 1,
            mt: 0.5,
            ...(isSelected
              ? {}
              : {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '100%',
                }),
          }}
        >
          {isSelected ? (
            <>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Enquiry No
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.enqrefno || '—'}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Unit Number
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.unitno || '—'}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Project
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.Project || '—'}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Applicant
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.Name || '—'}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Booking Stage
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.Bokkingstage || '—'}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.2,
                    py: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    fontSize: 14,
                  }}
                >
                  {selectedOpportunity?.status || '—'}
                </Box>
              </Grid>
            </>
          ) : (
            <Grid
              item
              xs={12}
              sx={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                No Unit Selected Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {`Select the ${title.toLowerCase()} to ${
                  isCancelled ? 'be swapped' : 'proceed with the swap'
                }`}
              </Typography>
              <Button
                variant="contained"
                className="primaryBtn"
                onClick={() => handleOpenDialog(isCancelled ? 'cancelled' : 'new', false)}
              >
                Select Unit
              </Button>
            </Grid>
          )}
        </Grid>
      </Card>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '85vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Grid container spacing={3} sx={{ flexGrow: 1}}>
        <Grid item xs={12} md={5.5}>
          {renderUnitBox('Cancelled Unit', selectedCancelledUnit, true)}
        </Grid>

        <Grid item xs={12} md={1} display="flex" justifyContent="center" alignItems="center">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'grey.300',
              bgcolor: 'white',
              boxShadow: 1,
            }}
          >
            <img
              src={swapArrow}
              alt="Swap Arrow"
              width={20}
              height={20}
              style={{ objectFit: 'contain' }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={5.5}>
          {renderUnitBox('New Unit', selectedNewUnit)}
        </Grid>
      </Grid>

      {/* Footer with Confirm & Next button */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.default',

          p: 2,
          mt: 'auto',
          textAlign: 'right',
        }}
      >
        <Button
          variant="contained"
          disabled={!isBothSelected || isLoading}
          onClick={handleConfirmSwap}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            minWidth: 160,
            bgcolor: isBothSelected ? 'primary.main' : 'grey.500',
            color: 'common.white',
            '&.Mui-disabled': {
              bgcolor: 'grey.300',
              color: 'common.white',
            },
            '&:hover': {
              backgroundColor: 'primary.main',
              boxShadow: 'none',
            },
          }}
        >
          {isLoading ? 'Processing...' : 'Confirm & Next'}
        </Button>
      </Box>

      {/* Opportunity Selection Dialog */}
      <OpportunitySelectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleSelectOpportunity}
        title={`Select ${dialogType === 'cancelled' ? 'Cancelled' : 'New'} Unit`}
        selectedOpportunity={dialogType === 'cancelled' ? selectedCancelledUnit : selectedNewUnit}
        isCancelledUnit={dialogType === 'cancelled'}
        status={dialogType === 'new' ? 'New' : undefined}
        isEditMode={isEditMode}
      />

      {/* Confirmation Dialog for Different Enquiry References */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirmation}
        title="Different Enquiry IDs"
        content={
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The selected units have different enquiry IDs:
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Cancelled Unit:</strong> {selectedCancelledUnit?.enqrefno || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>New Unit:</strong> {selectedNewUnit?.enqrefno || '—'}
              </Typography>
            </Box>
            <Typography variant="body2">Do you still want to continue with the swap?</Typography>
          </Box>
        }
        action={
          <Button
            variant="contained"
            onClick={handleConfirmDifferentEnquiry}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              background: '#1A407D',
              minWidth: {
                xs: '120px',
                lg: '204px',
              },
              height: '48px',
              margin: '0',
              '&:hover': {
                backgroundColor: 'primary.main',
                boxShadow: 'none',
              },
            }}
          >
            {isLoading ? 'Processing...' : 'Yes'}
          </Button>
        }
      />
    </Box>
  );
}
