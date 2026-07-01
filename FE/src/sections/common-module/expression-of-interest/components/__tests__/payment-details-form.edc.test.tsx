import * as yup from 'yup';
import { Form, Formik } from 'formik';
import userEvent from '@testing-library/user-event';
import { it, vi, expect, describe, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

import { Button } from '@mui/material';

import { EOIPaymentMode, EOIFinanceStatus } from 'src/utils/constant';

vi.setConfig({ testTimeout: 15000, hookTimeout: 15000 });

vi.mock('src/hooks/use-redux', () => ({
  useAppSelector: (selector: any) =>
    selector({
      expressonOfInterest: {
        voucherData: { voucherId: null },
      },
    }),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
}));

vi.mock('src/redux/actions/rm-panel/upload-actions', () => ({
  deleteImage: () => ({ type: 'deleteImage' }),
}));

vi.mock('src/redux/actions/rm-panel/eoi-actions', () => ({
  deletePaymentDetails: () => ({ type: 'deletePaymentDetails' }),
}));

vi.mock('src/components/dropzone/NewDropzone', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dropzone" />,
}));

vi.mock('../transaction-card', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-transaction-card" />,
}));

const lastFourDigitsRule = yup
  .string()
  .when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
    mode === EOIPaymentMode.OFFLINE && method === 'EDC MACHINE'
      ? schema
          .required('Last 4 digits of card are required')
          .matches(/^\d{4}$/, 'Please enter the last 4 digits of the card (numbers only)')
      : schema.notRequired()
  );

const validationSchema = yup.object({
  transactions: yup.array().of(
    yup.object().shape({
      lastFourDigits: lastFourDigitsRule,
    })
  ),
});

const makeTransaction = (overrides: Record<string, any> = {}) => ({
  id: null,
  paymentMode: EOIPaymentMode.OFFLINE,
  paymentMethod: 'EDC MACHINE',
  chequeDDNumber: '',
  transactionNumber: '111111111111',
  bankName: '',
  date: '2025-01-01T00:00:00.000Z',
  amount: '100',
  paymentProof: 'proof.png',
  status: EOIFinanceStatus.UNVERIFIED,
  isPaid: false,
  lastFourDigits: '',
  ...overrides,
});

async function renderForm({
  initialTransaction,
  onSubmit,
}: {
  initialTransaction: ReturnType<typeof makeTransaction>;
  onSubmit?: (values: any) => void;
}) {
  // Import after vi.mock so module mocks are applied
  const { default: PaymentDetailsForm } = await import('../payment-details-form');

  return render(
    <Formik
      initialValues={{ transactions: [initialTransaction] }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        onSubmit?.(values);
      }}
    >
      {(formik) => (
        <Form>
          <PaymentDetailsForm moreDetailsFormik={formik} isCreate={false} />
          <Button type="submit">submit</Button>
        </Form>
      )}
    </Formik>
  );
}

describe('PaymentDetailsForm - EDC MACHINE last 4 digits field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Last 4 Digits of Card field when EDC MACHINE is selected', async () => {
    await renderForm({ initialTransaction: makeTransaction() });

    expect(await screen.findByText(/Last 4 Digits of Card/i)).toBeInTheDocument();
    const boxes = screen.getAllByRole('textbox', {
      name: /Last 4 Digits of Card digit \d/i,
    });
    expect(boxes).toHaveLength(4);
  });

  it('hides and clears the field when payment method changes away from EDC MACHINE', async () => {
    const user = userEvent.setup();
    await renderForm({
      initialTransaction: makeTransaction({ lastFourDigits: '1234' }),
    });

    expect(await screen.findByText(/Last 4 Digits of Card/i)).toBeInTheDocument();

    const chequeRadio = screen.getByRole('radio', { name: /Cheque\/DD/i });
    await user.click(chequeRadio);

    await waitFor(() => {
      expect(screen.queryByText(/Last 4 Digits of Card/i)).not.toBeInTheDocument();
    });

    const edcRadio = screen.getByRole('radio', { name: /EDC Machine/i });
    await user.click(edcRadio);

    await screen.findByText(/Last 4 Digits of Card/i);
    const boxes = screen.getAllByRole('textbox', {
      name: /Last 4 Digits of Card digit \d/i,
    }) as HTMLInputElement[];
    boxes.forEach((box) => {
      expect(box.value).toBe('');
    });
  });

  it('shows the required validation message on submit when the field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    await renderForm({
      initialTransaction: makeTransaction({ lastFourDigits: '' }),
      onSubmit,
    });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText('Last 4 digits of card are required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('passes the typed 4 digits through Formik onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    await renderForm({
      initialTransaction: makeTransaction(),
      onSubmit,
    });

    const boxes = (await screen.findAllByRole('textbox', {
      name: /Last 4 Digits of Card digit \d/i,
    }));

    await user.click(boxes[0]);
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    await user.keyboard('4');

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.transactions[0].lastFourDigits).toBe('1234');
  });
});
