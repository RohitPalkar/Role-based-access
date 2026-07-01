import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import {
  it,
  vi,
  expect,
  describe,
  afterEach,
  beforeEach,
} from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from '@testing-library/react';

import {
  createTheme,
  ThemeProvider,
} from '@mui/material/styles';

import EOIManagerForm from './EOIManagerForm';

// MUI + userEvent + Yup re-renders are slow under jsdom; raise per-test timeout for this suite.
vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 });

// ---------------- MOCKS ----------------

vi.mock('src/hooks/use-redux', () => ({
  useAppSelector: (selector: any) =>
    selector({
      common: {
        cities: [],
        brands: [],
        unMappedProjects: [],
      },

      eoiManager: {
        loading: false,
        developmentTypes: [],
        inventoryTypes: [],
        campaignDetails: null,
      },
    }),
}));

vi.mock(
  'src/hooks/use-role-based-permissions',
  () => ({
    useRoleBasedPermissions: () => ({
      userRole: 'Super User (BI Team)',
    }),
  })
);

vi.mock(
  'src/redux/actions/admin/common-actions',
  () => ({
    fetchBrands: () => ({
      type: 'fetchBrands',
    }),

    fetchCitiesByBrandId: () => ({
      type: 'fetchCitiesByBrandId',
    }),

    fetchUnmappedProjectByBrandIdAndCityId:
      () => ({
        type:
          'fetchUnmappedProjectByBrandIdAndCityId',
      }),
  })
);

vi.mock(
  'src/redux/actions/admin/eoi-manager-actions',
  () => ({
    createCampaign: () => ({
      type: 'createCampaign',
    }),

    updateCampaign: () => ({
      type: 'updateCampaign',
    }),

    getEOICampaignById: () => ({
      type: 'getEOICampaignById',
    }),

    fetchInventoryTypes: () => ({
      type: 'fetchInventoryTypes',
    }),

    fetchDevelopmentTypes: () => ({
      type: 'fetchDevelopmentTypes',
    }),
  })
);

vi.mock(
  'src/redux/actions/rm-panel/dashboard-actions',
  () => ({
    searchSalesTeamDropdown: () => ({
      type: 'searchSalesTeamDropdown',
    }),
  })
);

vi.mock(
  'src/components/hook-form/rhf-editor',
  () => ({
    RHFEditor: () => (
      <div data-testid="mock-editor">
        Mock Editor
      </div>
    ),
  })
);

vi.mock('src/layouts/dashboard/main', () => ({
  DashboardContent: ({ children }: any) => (
    <div data-testid="dashboard-content">
      {children}
    </div>
  ),
}));

// ---------------- GOOGLE MAPS MOCK ----------------

vi.mock(
  'src/components/google-maps-autocomplete/GoogleMapsAutocomplete',
  () => ({
    __esModule: true,

    default: ({
      name,
      formik,
      label,
      required,
      onSelect,
    }: any) => (
      <div
        data-testid={`google-maps-${name}`}
      >
        <label htmlFor={`input-${name}`}>
          {label}
        </label>

        <input
          id={`input-${name}`}
          type="text"
          data-testid={`input-${name}`}
          value={formik.values[name] || ''}
          onChange={(e) =>
            formik.setFieldValue(
              name,
              e.target.value
            )
          }
          onBlur={() =>
            formik.setFieldTouched(name, true)
          }
          required={required}
        />

        <button
          type="button"
          data-testid={`select-${name}`}
          onClick={() =>
            onSelect({
              areaName: 'Test Venue',
              mapLink:
                'https://maps.google.com/test',
            })
          }
        >
          Select
        </button>

        {formik.touched[name] &&
          formik.errors[name] && (
            <span
              data-testid={`error-${name}`}
            >
              {formik.errors[name]}
            </span>
          )}
      </div>
    ),
  })
);

// ---------------- TEST SETUP ----------------

const theme = createTheme();

function createMockStore() {
  return configureStore({
    reducer: {
      test: () => ({}),
    },
  });
}

function renderEOIManagerForm() {
  const store = createMockStore();

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <EOIManagerForm />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

function getVenueLinkInput() {
  return screen.getAllByLabelText('Venue Link')[0];
}

function getAgreementDocLinkInput() {
  return screen.getAllByLabelText('Agreement Doc Link')[0];
}

async function selectLaunchStage(user: any) {
  const launchRadio = screen.getByLabelText('Launch');
  await user.click(launchRadio);
}

// ---------------- CLEANUP ----------------

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------- TESTS ----------------

describe(
  'EOIManagerForm - Venue Fields',
  () => {
    describe('Venue Name Field', () => {
      it(
        'renders venue name field with required label',
        () => {
          renderEOIManagerForm();

          expect(
            screen.getByTestId(
              'google-maps-venueName'
            )
          ).toBeInTheDocument();

          expect(
            screen.getByText('Venue Name')
          ).toBeInTheDocument();
        }
      );

      it(
        'updates venue name value on input change',
        async () => {
          const user = userEvent.setup();

          renderEOIManagerForm();

          const venueNameInput =
            screen.getByTestId(
              'input-venueName'
            );

          await user.type(
            venueNameInput,
            'Test Venue Name'
          );

          await waitFor(() => {
            expect(
              venueNameInput
            ).toHaveValue(
              'Test Venue Name'
            );
          });
        }
      );
    });

    describe('Venue Map Link Field', () => {
      it(
        'renders venue map link field with label',
        () => {
          renderEOIManagerForm();

          const inputs =
            screen.getAllByLabelText(
              'Venue Link'
            );

          expect(inputs[0]).toBeInTheDocument();
        }
      );

      it(
        'shows validation error for invalid URL',
        async () => {

          renderEOIManagerForm();

          const venueLinkInput =
            screen.getAllByLabelText(
              'Venue Link'
            )[0];

          fireEvent.change(venueLinkInput, {
            target: { value: 'invalid-url' },
          });

          fireEvent.blur(venueLinkInput);

          await waitFor(() => {
            expect(
              screen.getByText(
                'Please enter a valid venue link'
              )
            ).toBeInTheDocument();
          });
        }
      );

      it('accepts valid URL for venue map link', async () => {
        renderEOIManagerForm();

        const venueLinkInput = getVenueLinkInput();
        fireEvent.change(venueLinkInput, {
          target: { value: 'https://maps.google.com/test' },
        });
        fireEvent.blur(venueLinkInput);

        await waitFor(() => {
          expect(venueLinkInput).toHaveValue('https://maps.google.com/test');
          expect(
            screen.queryByText('Please enter a valid venue link')
          ).not.toBeInTheDocument();
        });
      });

      it('does not show error when venue map link is empty on blur', async () => {
        renderEOIManagerForm();

        const venueLinkInput = getVenueLinkInput();
        fireEvent.blur(venueLinkInput);

        expect(
          screen.queryByText('Please enter a valid venue link')
        ).not.toBeInTheDocument();
      });

      it('limits venue map link to 100 characters', () => {
        renderEOIManagerForm();

        const venueLinkInput =
          screen.getAllByLabelText(
            'Venue Link'
          )[0] as HTMLInputElement;

        const longUrl = `https://maps.google.com/${'a'.repeat(
          150
        )}`;

        venueLinkInput.value = longUrl;

        expect(
          venueLinkInput.value.length
        ).toBeGreaterThan(100);
      });

      describe(
        'Google Maps Autocomplete Selection',
        () => {
          it(
            'updates venue name and map link on selection',
            async () => {
              const user = userEvent.setup();

              renderEOIManagerForm();

              const selectButton =
                screen.getAllByTestId(
                  'select-venueName'
                )[0];

              await user.click(selectButton);

              await waitFor(() => {
                const venueNameInput =
                  screen.getByTestId(
                    'input-venueName'
                  );

                const venueLinkInput =
                  screen.getAllByLabelText(
                    'Venue Link'
                  )[0];

                expect(
                  venueNameInput
                ).toHaveValue(
                  'Test Venue'
                );

                expect(
                  venueLinkInput
                ).toHaveValue(
                  'https://maps.google.com/test'
                );
              });
            }
          );
        }
      );
    });

    describe('Agreement Doc Link Field', () => {
      it('does not render agreement doc link field initially', () => {
        renderEOIManagerForm();

        expect(
          screen.queryByLabelText('Agreement Doc Link')
        ).not.toBeInTheDocument();
      });

      it('renders agreement doc link field when launch stage is selected', async () => {
        const user = userEvent.setup();

        renderEOIManagerForm();

        await selectLaunchStage(user);

        await waitFor(() => {
          expect(
            screen.getByLabelText('Agreement Doc Link')
          ).toBeInTheDocument();
        });
      });

      it('shows validation error for invalid agreement doc link URL', async () => {
        const user = userEvent.setup();

        renderEOIManagerForm();

        await selectLaunchStage(user);

        const agreementInput =
          getAgreementDocLinkInput();

        fireEvent.change(agreementInput, {
          target: { value: 'invalid-url' },
        });

        fireEvent.blur(agreementInput);

        await waitFor(() => {
          expect(
            screen.getByText(
              'Please enter a valid agreement doc link'
            )
          ).toBeInTheDocument();
        });
      });

      it('accepts valid agreement doc link URL', async () => {
        const user = userEvent.setup();

        renderEOIManagerForm();

        await selectLaunchStage(user);

        const agreementInput =
          getAgreementDocLinkInput();

        fireEvent.change(agreementInput, {
          target: {
            value:
              'https://example.com/agreement.pdf',
          },
        });

        fireEvent.blur(agreementInput);

        await waitFor(() => {
          expect(agreementInput).toHaveValue(
            'https://example.com/agreement.pdf'
          );

          expect(
            screen.queryByText(
              'Please enter a valid agreement doc link'
            )
          ).not.toBeInTheDocument();
        });
      });

      it('does not show validation error when agreement doc link is empty', async () => {
        const user = userEvent.setup();

        renderEOIManagerForm();

        await selectLaunchStage(user);

        const agreementInput =
          getAgreementDocLinkInput();

        fireEvent.blur(agreementInput);

        expect(
          screen.queryByText(
            'Please enter a valid agreement doc link'
          )
        ).not.toBeInTheDocument();
      });
    });
  });
