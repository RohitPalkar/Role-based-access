import { z as zod } from 'zod';
import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import { GridCloseIcon } from '@mui/x-data-grid';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useParams } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import { fetchUserBookings } from 'src/redux/actions/admin/reports-actions';
import { updateUserStatus } from 'src/services/admin-services/reports-service';

import { toast } from 'src/components/snackbar';
import { Form } from 'src/components/hook-form';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

// ----------------------------------------------------------------------

export type UserQuickEditSchemaType = zod.infer<typeof UserQuickEditSchema>;

export const UserQuickEditSchema = zod.object({
  status: zod.string().min(1, { message: 'Status is required!' }),
});

export const USER_STATUS_OPTIONS = [
  { value: 'Paid', label: 'Paid' },
  { value: 'Hold', label: 'Hold' },
];

// ----------------------------------------------------------------------

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  currentUser?: any;
  editIds?: any;
  reset?: any;
  table?: any;
  currentFilters?: any;
}>;

export function UserQuickEditForm({ currentUser, open, onClose, editIds, reset,table,currentFilters }: Props) {
  const dispatch = useAppDispatch();
  const defaultValues = useMemo(
    () => ({
      status: '',
    }),
    []
  );
  const { id } = useParams();

  const methods = useForm<UserQuickEditSchemaType>({
    mode: 'onBlur',
    resolver: zodResolver(UserQuickEditSchema),
    defaultValues,
  });

  const {
    // reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;
  const onSubmit = handleSubmit(async (data) => {
    try {

      await updateUserStatus({ paymentStatus: data?.status, ids: editIds?.join(',') });
      const {  startDate, endDate,  ...rest } = currentFilters;

      const payload = {
      userId:id,
      page: table.page + 1,
      limit: table?.rowsPerPage,
      search: currentFilters.name,
      rmIds: currentFilters.rmIds,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      ...rest,
    };
      dispatch(fetchUserBookings(payload));
      reset();
      onClose();
      toast.success('Status updated successfully!');
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: 720 } }}
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Update payment status
          <IconButton onClick={onClose} sx={{ ml: 1 }}>
            <GridCloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Controller
              name="status"
              control={methods.control}
              render={({ field, fieldState }) => (
                <ControlledAutocomplete
                  required
                  label="Select status"
                  options={USER_STATUS_OPTIONS}
                  value={field.value}
                  onChange={(selectedValues) => {
                    field.onChange(selectedValues);
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <LoadingButton
            className="primaryBtn"
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            Update
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
