import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Chip,
  Stack,
  Button,
  Dialog,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { sendBookingFormEmail } from 'src/redux/actions/rm-panel/dashboard-actions';

// ----------------------------------------------------------------------

interface ShareFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly opportunityId: string;
  readonly formType: 'booking' | 'referral';
  readonly title?: string;
  readonly isGroupShare?:boolean
  readonly setEmailLists?:any;
  readonly handleSend?:()=>void;
}


export function ShareFormDialog({
  open,
  onClose,
  opportunityId,
  formType,
  title = 'Share',
  isGroupShare=false,
  setEmailLists,
  handleSend
}: ShareFormDialogProps) {

  const dispatch = useAppDispatch();
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { opportunity } = useAppSelector((state) => state.dashboard);
  const bookingEmail = opportunity?.data?.Cmail;
  const referrerEmail = opportunity?.data?.EmailAddress;
  // Maximum email limit for booking forms
  const MAX_EMAILS_BOOKING = 6;

  // Pre-populate emails based on form type when dialog opens
  useEffect(() => {
    if (open) {
      const initialEmails: string[] = [];

      if (formType === 'booking' && bookingEmail && validateEmail(bookingEmail)) {
        initialEmails.push(bookingEmail);
      } else if (formType === 'referral' && referrerEmail && validateEmail(referrerEmail)) {
        initialEmails.push(referrerEmail);
      }

      setEmailList(initialEmails);
    }
  }, [open, formType, bookingEmail, referrerEmail]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{1,256}$/;
    return emailRegex.test(email.trim());
  };

  const handleAddEmail = () => {
    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) {
      toast.error('Please enter an email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emailList.includes(trimmedEmail)) {
      toast.error('Email address already added');
      return;
    }

    // Check email limit for booking forms
    if (formType === 'booking' && emailList.length >= MAX_EMAILS_BOOKING) {
      toast.error(`Maximum ${MAX_EMAILS_BOOKING} email addresses allowed for booking forms`);
      return;
    }
    if(setEmailLists){
    setEmailLists([...emailList, trimmedEmail])
    }

    setEmailList([...emailList, trimmedEmail]);
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailList(emailList?.filter((email) => email !== emailToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddEmail();
    }
  };

  const handleSubmit = async () => {
    if (emailList.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const emailIds = emailList.join(',');
      const payload = {
        oppId: opportunityId,
        formType,
        emailIds,
      };

      const response = await dispatch(sendBookingFormEmail(payload));
      const result = response?.payload as any;

      if (result?.error === null) {
        toast.success(
          `${formType === 'booking' ? 'Booking' : 'Referral'} form email sent successfully`
        );
        handleClose();
      } else {
        toast.error(
          result?.message?.message || `Failed to send ${formType} form email. Please try again.`
        );
      }
    } catch (error) {
      console.error(error)
      toast.error('An error occurred while sending the email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmailInput('');
    setEmailList([]);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 300,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Typography variant="h6" component="div">
          {title} {formType === 'booking' ? 'Booking Form Link' : 'Referral Form Link'}
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Enter email address to share the {formType} form (Maximum of 6 email addresses are allowed)

          </Typography>

          <Box>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                label="Email Address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter email address"
                variant="outlined"
                size="small"
                disabled={isSubmitting}
              />
              <Button
                variant="contained"
                onClick={handleAddEmail}
                disabled={
                  isSubmitting || (formType === 'booking' && emailList.length >= MAX_EMAILS_BOOKING)
                }
                startIcon={<AddIcon />}
                color="primary"
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  '&:hover': {
                    backgroundColor: '#092552',
                    color: '#fff',
                  },
                }}
              >
                Add
              </Button>
            </Stack>
          </Box>

          {emailList.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Email Recipients ({emailList.length}
                { `/${MAX_EMAILS_BOOKING}`})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {emailList.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => handleRemoveEmail(email)}
                    deleteIcon={<CloseIcon />}
                    variant="outlined"
                    size="small"
                    disabled={isSubmitting}
                    sx={{
                      backgroundColor: '#1A407D',
                      color: '#FFFFFF',
                      '&:hover': {
                        backgroundColor: '#174A9D',
                      },
                      '& .MuiChip-deleteIcon': {
                        fontSize: '18px',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} variant="outlined" disabled={isSubmitting} color="primary">
          Cancel
        </Button>
        <Button
          onClick={isGroupShare? handleSend : handleSubmit}
          variant="contained"
          disabled={isSubmitting || emailList.length === 0}
          color="primary"
          sx={{
            '&:hover': {
              backgroundColor: '#092552',
              color: '#fff',
            },
          }}
        >
          {isSubmitting
            ? 'Sending...'
            : `Send Link`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
