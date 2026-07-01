import type { AppDispatch } from 'src/redux/store';
import type { IEmployeeListCreateItem } from 'src/types/finance-admin/employee-list';

import { toast } from 'sonner';
import { z as zod } from 'zod';
import { useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Divider, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { updateEmployeeData } from 'src/redux/actions/finance-admin/employee-list-actions';

import { Form, Field } from 'src/components/hook-form';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Props = {
  currentEmployee?: IEmployeeListCreateItem;
  id?: string;
};

const EmployeeListStructureEditCreateForm = ({ currentEmployee, id }: Props) => {
  const [isEditingSalary, setIsEditingSalary] = useState<any>(false);

  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  // @ts-ignore
const { startYearDate, endYearDate } = getMinMaxDateForFilter();
  type NewEmployeeStructureType = zod.infer<ReturnType<typeof NewEmployeeListSchema>>;

  const NewEmployeeListSchema = () =>
    zod
      .object({
        name: zod.string().min(1, { message: uiText.employeeList.form.create.validation.name }),
        email: zod.string().min(1, { message: uiText.employeeList.form.create.validation.email }),
        salary: zod
          .union([zod.string(), zod.number()])
          .optional()
          .refine(
            (value) => {
              if (value !== '****') {
                return typeof value === 'string' ? value.length > 0 : true;
              }
              return true;
            },
            { message: 'Salary is required' }
          )
          .refine(
            (value: any) => {
              const valStr = String(value);
              return value === '****' || !valStr.startsWith('.');
            },
            { message: 'Number must start with a digit (e.g., 0.99 instead of .99)' }
          )
          .refine(
            (value: any) => {
              const valStr = String(value);
              return value === '****' || /^-?\d+(\.\d{1,3})?$/.test(valStr);
            },
            { message: 'Only numbers with up to 3 decimal places are allowed' }
          ),

        accumulatedBalance: zod
          .string()
          .min(1, { message: uiText.employeeList.form.create.validation.accumulatedBalance })
          .refine((value) => !value.startsWith('.'), {
            message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
          })
          .refine((value) => /^-?\d+(\.\d{1,3})?$/.test(value), {
            message: 'Only numbers with up to 3 decimal places are allowed',
          }),
        amount: currentEmployee?.accruals
          ? zod
            .string()
            .min(1, { message: 'Amount is required' })
            .refine((value) => !value.startsWith('.'), {
              message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
            })
            .refine((value) => /^-?\d+(\.\d{1,3})?$/.test(value), {
              message: 'Only numbers with up to 3 decimal places are allowed',
            })
          : zod
            .string()
            .optional() // 👈 Allows empty values
            .refine((value) => !value?.startsWith('.'), {
              message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
            })
            .refine((value) => !value || /^-?\d+(\.\d{1,3})?$/.test(value), {
              message: 'Only numbers with up to 3 decimal places are allowed',
            }),
        date: currentEmployee?.accruals
          ? zod.string().min(1, { message: uiText.employeeList.form.create.validation.date })
          : zod.string().optional(),
        action: currentEmployee?.accruals
          ? zod.string().min(1, { message: uiText.employeeList.form.create.validation.action })
          : zod.string().optional(),
        balance: zod
          .string()
          .min(1, { message: uiText.employeeList.form.create.validation.balance }),
      })
      .refine(
        (data) =>
          data.accumulatedBalance === '0' ||
          Number.parseFloat(data.amount as string) <= Number.parseFloat(data.accumulatedBalance),
        {
          message: 'Amount cannot exceed accumulated balance',
          path: ['amount'],
        }
      );

  const defaultValues: NewEmployeeStructureType = {
    name: '',
    email: '',
    salary: '',
    accumulatedBalance: '',
    amount: '',
    date: '',
    action: '',
    balance: '',
  };

  const methods = useForm<NewEmployeeStructureType>({
    mode: 'onBlur',
    resolver: zodResolver(NewEmployeeListSchema()),
    defaultValues,
    values: currentEmployee
      ? {
        name: currentEmployee.name || '',
        email: currentEmployee.email || '',
        // salary: (currentEmployee?.hasSalary && '****') || '',
        salary: (currentEmployee?.salary) || '',
        action: currentEmployee.finances?.[0]?.action || '',
        date: currentEmployee.finances?.[0]?.date || '',
        accumulatedBalance: currentEmployee.accruals?.toString() || '',
        amount: currentEmployee.finances?.[0]?.amount?.toString() || '',
        balance: currentEmployee.accruals?.toString() || '',
      }
      : defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue,
  } = methods;
  const formValues = watch();

  useEffect(() => {
    if (
      formValues.amount &&
      formValues.action &&
      Number.parseFloat(formValues.accumulatedBalance) >= Number.parseFloat(formValues.amount)
    ) {
      const remainingBalance = (
        Number.parseFloat(formValues.accumulatedBalance) - Number.parseFloat(formValues.amount)
      ).toString();
      setValue('balance', remainingBalance);
    }
  }, [formValues.amount, formValues.action, setValue, formValues.accumulatedBalance]);

  const onSubmit = handleSubmit(async (data) => {
    const payload: any = {
      id,
      employeeDetails: {},
    };
    if (data.accumulatedBalance && data.accumulatedBalance !== '0') {
      payload.employeeDetails = {
        amount: Number.parseFloat(data.amount || '0'),
        date: data.date,
        action: data.action,
      };
    }
    // Include salary ONLY if it was edited (not '****')
    if (isEditingSalary && data.salary !== '****') {
      // @ts-ignore
      payload.employeeDetails.salary = Number.parseFloat(data.salary) || 0;
    }

    await dispatch(updateEmployeeData(payload))
      .unwrap()
      .then(() => toast.success('Employee details updated successfully'));

    router.push(paths.financeAdmin.employeeList.root);
  });

  const handleCancle = () => {
    router.push(paths.financeAdmin.employeeList.root);
  };
  const hasAccumulatedBalance = Number.parseFloat(formValues.accumulatedBalance) > 0;
  return (
    <Box>
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Box
                sx={{
                  mb: 2,
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Text name="name" label={uiText.employeeList.form.label.name} disabled />
                <Field.Text name="email" label={uiText.employeeList.form.label.email} disabled />
                <Field.Text
                  name="salary"
                  label={uiText.employeeList.form.label.salary}
                  // type={isEditingSalary ? 'text' : 'password'} // Show as stars initially
                    type='text'// Show as stars initially
                  onFocus={() => {
                    setIsEditingSalary(true);
                    if (formValues.salary === '****') {
                      setValue('salary', ''); // Remove stars when editing starts
                    }
                  }}
                  onBlur={() => {
                    if (!formValues.salary) {
                      setValue('salary', currentEmployee?.salary ); 
                      setIsEditingSalary(false);
                    }
                  }}
                  // @ts-ignore
                  rules={{
                    required: !currentEmployee?.salary ? 'Salary is required' : false,

                    validate: (value: any) => {
                      if (!value) return !currentEmployee?.salary ? 'Salary is required' : true;

                      if (!/^-?\d+(\.\d{1,3})?$/.test(value))
                        return 'Only numbers with up to 3 decimal places are allowed';
                      if (value.startsWith('.'))
                        return 'Number must start with a digit (e.g., 0.99 instead of .99)';
                      return true;
                    },
                  }}
                />
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Box sx={{ my: 3, }} className="employeeScrollWrapper">
                <Typography variant="body2" sx={{ my: 2 }}>
                  {uiText.employeeList.form.create.accural}
                </Typography>
                <Grid
                  container
                  sx={{ backgroundColor: '#F4F6F8', mt: 2 }}
                  className="employeeNoWrap"
                >
                  <Grid
                    className="employeeHeaderCol employeeNoWrapBgColor"
                    item
                    xs={3}
                    sx={{
                      textAlign: 'center',
                      alignContent: 'center',
                      borderRight: '1px solid #DADADA',
                      p: 2,
                    }}
                  >
                    <Typography variant="body2">
                      {uiText.employeeList.form.create.accumulatedBalance}
                    </Typography>
                  </Grid>
                  <Grid
                    className="employeeHeaderCol employeeNoWrapBgColor"
                    item
                    xs={4.5}
                    sx={{
                      textAlign: 'center',
                      alignContent: 'center',
                      borderRight: '1px solid #DADADA',
                      p: 2,
                    }}
                  >
                    <Typography variant="body2">
                      {uiText.employeeList.form.create.payment}
                    </Typography>
                  </Grid>
                  <Grid
                    className="employeeHeaderCol employeeNoWrapBgColor"
                    item
                    xs={4.5}
                    sx={{
                      textAlign: 'center',
                      alignContent: 'center',
                      borderLeft: '1px solid #DADADA',
                      p: 2,
                    }}
                  >
                    <Typography variant="body2">
                      {uiText.employeeList.form.create.balance}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ width: '100%' }}>
                  <Grid container spacing={2} mb={2} mt={1} className='employeeNoWrap'>
                    <Grid
                      className="employeeTblCol"
                      item
                      xs={3}
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {/* <Grid container spacing={2}>
                        <Grid item xs={10} sx={{ textAlign: 'center' }}> */}
                      <TextField
                        sx={{ width: '100%' }}
                        name="accumulatedBalance"
                        label="Accumulated Balance"
                        value={
                          currentEmployee?.accruals ? `₹ ${currentEmployee?.accruals}` : '0'
                        }
                        disabled
                      />
                      {/* </Grid>
                      </Grid> */}
                    </Grid>
                    <Grid item xs={4.5} sx={{ textAlign: 'center' }} className="employeeTblCol">
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Field.Text
                            name="amount"
                            label={uiText.employeeList.form.label.amount}
                            required={hasAccumulatedBalance}
                            disabled={!hasAccumulatedBalance}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Field.Date
                            name="date"
                            minDate={startYearDate}
                            maxDate={endYearDate}
                            label={uiText.employeeList.form.label.date}
                            required={hasAccumulatedBalance}
                            disabled={!hasAccumulatedBalance}
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={4.5} sx={{ textAlign: 'left' }} className="employeeTblCol">
                      <Grid container alignItems="center">
                        <Grid
                          item
                          xs={6}
                          sx={{ cursor: !hasAccumulatedBalance ? 'not-allowed' : 'default' }}
                        >
                          <Controller
                            name="action"
                            control={methods.control}
                            render={({ field, fieldState }) => (
                              <ControlledAutocomplete
                                required={hasAccumulatedBalance}
                                label={uiText.employeeList.form.label.action}
                                placeholder="Select"
                                value={field.value || ''}
                                options={[
                                  { label: 'Retain', value: 'retain' },
                                  { label: 'Write Off', value: 'write_off' },
                                ]}
                                onChange={(value) => field.onChange(value)}
                                disabled={!hasAccumulatedBalance}
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          {/* <Field.Text sx={{ ml: 2 }} name="balance" label="Balance" disabled>
                          {hasAccumulatedBalance
                            ? formValues?.balance && `${Number(formValues.balance).toFixed(2)}`
                            : '—'}
                        </Field.Text> */}
                          <TextField
                            name="balance"
                            label="Balance"
                            sx={{ ml: 2 }}
                            value={
                              hasAccumulatedBalance
                                ? formValues?.balance &&
                                  `₹ ${Number(formValues.balance).toFixed(2)}`
                                : '—'
                            }
                            disabled
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                </Box>
              </Box>
              <Stack sx={{ mt: 3 }} justifyContent="end" gap={2} direction="row">
                <LoadingButton
                  type="button"
                  variant="outlined"
                  loading={isSubmitting}
                  onClick={handleCancle}
                >
                  {uiText.button.cancel}
                </LoadingButton>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  className="primaryBtn"
                  loading={isSubmitting}
                >
                  {uiText.button.submit}
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>
    </Box>
  );
};

export default EmployeeListStructureEditCreateForm;
