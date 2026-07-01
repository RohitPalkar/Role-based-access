import { toast } from 'sonner';
import { useState } from 'react';

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

import { useAppDispatch } from 'src/hooks/use-redux';

import { interpolate } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { sendBankDetailsEmailAction } from 'src/redux/actions/rm-panel/bank-details-actions';

// ----------------------------------------------------------------------

interface ShareBankDetailsDialogProps {
  readonly open: boolean;
  readonly campaignId: number;
  readonly onClose: () => void;
  readonly title?: string;
  readonly isGroupShare?: boolean;
  readonly setEmailLists?: any;
  readonly handleSend?: () => void;
}

export function ShareBankDetailsDialog({
  open,
  campaignId,
  onClose,
  title = 'Share',
  isGroupShare = false,
  setEmailLists,
  handleSend,
}: ShareBankDetailsDialogProps) {
  const dispatch = useAppDispatch();
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shareDialog } = uiText.bankDetails;
  // Maximum email limit for
  const MAX_EMAILS = 6;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{1,256}$/;
    return emailRegex.test(email.trim());
  };

  const handleAddEmail = () => {
    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) {
      toast.error(shareDialog.toastMsg.required);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      toast.error(shareDialog.toastMsg.ValidEmail);
      return;
    }

    if (emailList.includes(trimmedEmail)) {
      toast.error(shareDialog.toastMsg.duplicateEmail);
      return;
    }

    // Check email limit for bank details
    if (emailList.length >= MAX_EMAILS) {
      toast.error(interpolate(shareDialog.toastMsg.maxEmailId, { maxEmails: String(MAX_EMAILS) }));
      return;
    }
    if (setEmailLists) {
      setEmailLists([...emailList, trimmedEmail]);
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
      toast.error(shareDialog.toastMsg.minEmail);
      return;
    }

    setIsSubmitting(true);

    try {
      const emailIds = emailList;
      const payload = {
        emailIds,
        campaignId,
      };

      const response = await dispatch(sendBankDetailsEmailAction(payload));
      const result = response?.payload as any;

      if (result?.statusCode === 200 || result?.statusCode === 201) {
        toast.success(shareDialog.toastMsg.sendSuccessfully);
        handleClose();
      } else {
        toast.error(result?.message?.message || shareDialog.toastMsg.failedSendEmail);
      }
    } catch (error) {
      console.error(error);
      toast.error(shareDialog.toastMsg.errorWhileSendingEmail);
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
          {title} {shareDialog.title}
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
            {interpolate(shareDialog.desc, { maxEmail: String(MAX_EMAILS) })}
          </Typography>

          <Box>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                label={shareDialog.label.email}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={shareDialog.label.emailPlaceholder}
                variant="outlined"
                size="small"
                disabled={isSubmitting}
              />
              <Button
                variant="contained"
                onClick={handleAddEmail}
                disabled={isSubmitting || emailList.length >= MAX_EMAILS}
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
                {shareDialog.label.add}
              </Button>
            </Stack>
          </Box>

          {emailList.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {interpolate(shareDialog.label.emailRecipents, {
                  count: String(emailList.length),
                  max: String(MAX_EMAILS),
                })}
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
          {uiText.button.cancel}
        </Button>
        <Button
          onClick={isGroupShare ? handleSend : handleSubmit}
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
          {isSubmitting ? shareDialog.label.sending : shareDialog.label.sendLink}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
