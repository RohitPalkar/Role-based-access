import React, { useState, useEffect } from 'react';

import { Box, Radio, Button, RadioGroup, Typography, FormControlLabel } from '@mui/material';

import { GATEWAY } from 'src/utils/payment';

import uiText from 'src/locales/langs/en/common.json';

import { ConfirmDialog } from 'src/components/custom-dialog';

import razorPayIcon from '../../../assets/icons/razorpay.svg';
import warningCircle from '../../../assets/icons/warning-circle.svg';
import easeBuzzIcon from '../../../assets/icons/Easebuzz Logo Unit - White Text.svg';

// ----------------------------------------------------------------------

interface PaymentFailedModalProps {
  open: boolean;
  onClose?: () => void;
  onProceed?: (gateway: GATEWAY) => void;
  allowedGateways?: GATEWAY[];
  /** Reference: hide gateway choice and retry only `retryGateway` (single-gateway campaign or locked retry). */
  singleGatewayMode?: boolean;
  /** Gateway used when `singleGatewayMode` is true. */
  retryGateway?: GATEWAY | null;
}

const PaymentFailedModal: React.FC<PaymentFailedModalProps> = ({
  open,
  onClose,
  onProceed,
  allowedGateways = [GATEWAY.RAZORPAY, GATEWAY.EASEBUZZ],
  singleGatewayMode = false,
  retryGateway = null,
}) => {
  const jsonValue = uiText.EOIJson.createEOI.form.moreDetails;
  const modalCopy = jsonValue.paymentDetails.paymentFailedModal;

  const [selectedGateway, setSelectedGateway] = useState<GATEWAY>(GATEWAY.RAZORPAY);

  useEffect(() => {
    if (!open) return;
    if (singleGatewayMode && retryGateway) {
      setSelectedGateway(retryGateway);
      return;
    }
    if (allowedGateways.includes(GATEWAY.RAZORPAY)) {
      setSelectedGateway(GATEWAY.RAZORPAY);
    } else if (allowedGateways[0]) {
      setSelectedGateway(allowedGateways[0]);
    }
  }, [open, singleGatewayMode, retryGateway, allowedGateways]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedGateway(event.target.value as GATEWAY);
  };

  const handleProceed = () => {
    const gateway = singleGatewayMode && retryGateway != null ? retryGateway : selectedGateway;
    onProceed?.(gateway);
    onClose?.();
  };

  return (
    <ConfirmDialog
      open={open}
      topIcon={warningCircle}
      onClose={onClose}
      showCloseButton
      showCancel={false}
      title={modalCopy.title}
      centerTitle
      content={
        <Box>
          {singleGatewayMode ? (
            <Typography sx={{ fontSize: '14px', textAlign: 'justify' }}>
              {modalCopy.descSingle ?? 'Payment failed. Would you like to retry?'}
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: '14px', textAlign: 'justify' }}>
                {modalCopy.desc}
              </Typography>
        

              <RadioGroup
                row
                value={selectedGateway}
                onChange={handleChange}
                sx={{ gap: 2, pl: 1 }}
              >
                {allowedGateways.includes(GATEWAY.EASEBUZZ) && (
                  <FormControlLabel
                    value={GATEWAY.EASEBUZZ}
                    control={
                      <Radio
                        sx={{
                          color: '#1A407D',
                          '&.Mui-checked': { color: '#1A407D' },
                        }}
                      />
                    }
                    label={<img src={easeBuzzIcon} alt="Easebuzz" />}
                  />
                )}
                {allowedGateways.includes(GATEWAY.RAZORPAY) && (
                  <FormControlLabel
                    value={GATEWAY.RAZORPAY}
                    control={
                      <Radio
                        sx={{
                          color: '#1A407D',
                          '&.Mui-checked': { color: '#1A407D' },
                        }}
                      />
                    }
                    label={<img src={razorPayIcon} alt="Razorpay" />}
                  />
                )}
              </RadioGroup>
            </>
          )}
        </Box>
      }
      action={
        <Button
          variant="contained"
          onClick={handleProceed}
          sx={{
            height: '44px',
            minWidth: { xs: '120px', lg: '204px' },
            borderRadius: '8px',
            textTransform: 'none',
            background: '#1A407D',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#092552' },
          }}
        >
          {singleGatewayMode ? modalCopy.retry : modalCopy.button}
        </Button>
      }
    />
  );
};

export default PaymentFailedModal;
