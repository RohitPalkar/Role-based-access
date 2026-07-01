import { Formik } from 'formik';
import userEvent from '@testing-library/user-event';
import { it, vi, expect, describe, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

import { Grid } from '@mui/material';

import { PointsAdjustmentType } from 'src/utils/constant';

import PointsAdjustmentTypeField from './points-adjustment-type-field';
import { mapDetailsToFormValues, buildIomValidationSchema } from '../iom-form-utils';

vi.setConfig({ testTimeout: 15000, hookTimeout: 15000 });

type FormValues = {
  pointsAdjustmentType: string;
  originalReferralSplitType?: string;
  pointsRatioReferrer: number | '';
  pointsRatioReferee: number | '';
  isDeviation?: boolean;
};

function renderField(initialValues: FormValues, opts: { isEditable?: boolean } = {}) {
  return render(
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {(formik) => (
        <Grid container spacing={2}>
          <PointsAdjustmentTypeField formik={formik as any} isEditable={opts.isEditable ?? true} />
        </Grid>
      )}
    </Formik>
  );
}

/**
 * Renders the field wired up with the real IOM Yup schema so cross-field
 * validation (forbidden 1:1/2:0/0:2 combos, sum != 2) is exercised end-to-end.
 */
function renderFieldWithSchema(
  initialValues: FormValues,
  opts: { validateOnMount?: boolean } = {}
) {
  const fullInitialValues = {
    ...mapDetailsToFormValues(null),
    ...initialValues,
  };
  const validationSchema = buildIomValidationSchema(fullInitialValues);
  return render(
    <Formik
      initialValues={fullInitialValues}
      validationSchema={validationSchema}
      validateOnMount={opts.validateOnMount ?? false}
      onSubmit={() => {}}
    >
      {(formik) => (
        <Grid container spacing={2}>
          <PointsAdjustmentTypeField formik={formik as any} isEditable />
        </Grid>
      )}
    </Formik>
  );
}

describe('PointsAdjustmentTypeField', () => {
  afterEach(() => {
    cleanup();
  });

  it('locks the dropdown when the API returned a fixed split type (1:1)', async () => {
    renderField({
      pointsAdjustmentType: PointsAdjustmentType.ONE_ONE,
      originalReferralSplitType: PointsAdjustmentType.ONE_ONE,
      pointsRatioReferrer: 1,
      pointsRatioReferee: 1,
    });

    const adjustmentInput = screen.getByDisplayValue('1:1') as HTMLInputElement;
    expect(adjustmentInput).toBeDisabled();

    const allOne = screen.getAllByDisplayValue('1') as HTMLInputElement[];
    expect(allOne.length).toBeGreaterThanOrEqual(2);
    allOne.forEach((input) => expect(input).toBeDisabled());
  });

  it('keeps the dropdown editable when the API returned "other" as the split type', async () => {
    renderField({
      pointsAdjustmentType: PointsAdjustmentType.OTHER,
      originalReferralSplitType: 'other',
      pointsRatioReferrer: 1.5,
      pointsRatioReferee: 0.5,
    });

    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('renders the dropdown when no backend value and is editable', async () => {
    renderField({
      pointsAdjustmentType: '',
      originalReferralSplitType: '',
      pointsRatioReferrer: '',
      pointsRatioReferee: '',
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('enables ratio inputs only when Other is selected', async () => {
    const user = userEvent.setup();
    renderField({
      pointsAdjustmentType: '',
      pointsRatioReferrer: '',
      pointsRatioReferee: '',
    });

    const ratioInputs = screen
      .getAllByRole('textbox')
      .filter((el) => (el as HTMLInputElement).getAttribute('name')?.startsWith('pointsRatio'));
    ratioInputs.forEach((input) => expect(input).toBeDisabled());

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    const otherOption = await screen.findByText('Other');
    await user.click(otherOption);

    const ratioInputsAfter = screen
      .getAllByRole('textbox')
      .filter((el) => (el as HTMLInputElement).getAttribute('name')?.startsWith('pointsRatio'));
    ratioInputsAfter.forEach((input) => expect(input).not.toBeDisabled());
  });

  it('disables ratio inputs in read-only (non-editable) mode', async () => {
    renderField(
      {
        pointsAdjustmentType: PointsAdjustmentType.OTHER,
        pointsRatioReferrer: 1.5,
        pointsRatioReferee: 0.5,
      },
      { isEditable: false }
    );

    const allInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    allInputs.forEach((input) => expect(input).toBeDisabled());
  });

  it('hides ratio inputs when Other is selected and deviation is checked', async () => {
    renderField({
      pointsAdjustmentType: PointsAdjustmentType.OTHER,
      pointsRatioReferrer: '',
      pointsRatioReferee: '',
      isDeviation: true,
    });

    const ratioInputs = screen
      .queryAllByRole('textbox')
      .filter((el) => (el as HTMLInputElement).getAttribute('name')?.startsWith('pointsRatio'));
    expect(ratioInputs.length).toBe(0);
  });

  it('accepts decimal user input in Other mode', async () => {
    renderField({
      pointsAdjustmentType: PointsAdjustmentType.OTHER,
      pointsRatioReferrer: '',
      pointsRatioReferee: '',
    });

    const ratioInput = screen
      .getAllByRole('textbox')
      .find(
        (el) => (el as HTMLInputElement).getAttribute('name') === 'pointsRatioReferrer'
      ) as HTMLInputElement;

    fireEvent.change(ratioInput, { target: { value: '1.5' } });
    expect(ratioInput.value).toBe('1.5');
  });

  describe('cross-field error visibility', () => {
    it.each([
      [1, 1],
      [2, 0],
      [0, 2],
    ])(
      'shows the "use the dropdown" error on initial render when Other is mapped with %s:%s',
      async (referrer, referee) => {
        renderFieldWithSchema(
          {
            pointsAdjustmentType: PointsAdjustmentType.OTHER,
            originalReferralSplitType: 'other',
            pointsRatioReferrer: referrer,
            pointsRatioReferee: referee,
          },
          { validateOnMount: true }
        );

        await waitFor(() => {
          expect(screen.getByText('Use the dropdown for 1:1, 2:0, 0:2')).toBeInTheDocument();
        });
      }
    );

    it('shows the "use the dropdown" error when changing only the 1st (referrer) input creates a forbidden combo', async () => {
      renderFieldWithSchema({
        pointsAdjustmentType: PointsAdjustmentType.OTHER,
        originalReferralSplitType: 'other',
        pointsRatioReferrer: 1.5,
        pointsRatioReferee: 0,
      });

      const referrerInput = screen
        .getAllByRole('textbox')
        .find(
          (el) => (el as HTMLInputElement).getAttribute('name') === 'pointsRatioReferrer'
        ) as HTMLInputElement;

      fireEvent.change(referrerInput, { target: { value: '2' } });

      await waitFor(() => {
        expect(screen.getByText('Use the dropdown for 1:1, 2:0, 0:2')).toBeInTheDocument();
      });
    });

    it('keeps the "required" error hidden on mount when ratios are empty (no blur yet)', async () => {
      renderFieldWithSchema(
        {
          pointsAdjustmentType: PointsAdjustmentType.OTHER,
          originalReferralSplitType: 'other',
          pointsRatioReferrer: '',
          pointsRatioReferee: '',
        },
        { validateOnMount: true }
      );

      await waitFor(() => {
        expect(screen.queryByText('Points Ratio is required')).not.toBeInTheDocument();
      });
    });
  });
});
