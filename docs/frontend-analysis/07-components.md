# Components Analysis

## Overview

The frontend contains **68+ reusable components** organized into a flat `src/components/` directory. Components follow a **functional React + TypeScript** pattern with MUI theming.

## Component Categories

### UI Primitives

| Component | Purpose |
|-----------|---------|
| `iconify/` | Icon component wrapping Iconify |
| `svg-color/` | SVG icon with CSS color fill |
| `label/` | Status/chip labels |
| `badge/` | Notification badge |
| `logo/` | App logo component |

### Form Components

| Component | Purpose |
|-----------|---------|
| `hook-form/` | Formik integration (RHF-style wrapper) |
| `formik-textfield/` | Formik text input |
| `formik-autocomplete/` | Formik autocomplete dropdown |
| `formik-date-picker/` | Formik date picker |
| `controlled-autocomplete/` | Controlled autocomplete |
| `customautocomplete/` | Custom autocomplete variant |
| `phone-input/` | Phone number input |
| `PhoneInputField/` | Phone input form field |
| `digit-box-input/` | OTP digit input |
| `box-check-input/` | Checkbox input |
| `conditional-radio-button/` | Conditional radio groups |
| `primary-source-conditional-fields/` | Conditional fields for primary source |
| `single-select-dropdown/` | Single-select dropdown |
| `reusable-input-base/` | Reusable input base |

### Data Display

| Component | Purpose |
|-----------|---------|
| `table/` | Generic table component |
| `table-slabs/` | Incentive slab table |
| `data-grid` (MUI X) | Advanced data grid |
| `chart/` | ApexCharts wrapper |
| `header-cards/` | Dashboard header stat cards |
| `listing-cards/` | Card-based listing |
| `empty-content/` | Empty state placeholder |
| `search-not-found/` | No search results |

### Dialogs & Modals

| Component | Purpose |
|-----------|---------|
| `custom-dialog/` | Reusable dialog wrapper |
| `custom-popover/` | Popover menu |
| `share-form-dialog/` | Share form dialog |
| `otp-dialog/` | OTP verification dialog |
| `opportunity-selection-dialog/` | Opportunity selector |
| `image-crop-modal/` | Image cropping |

### Navigation & Filters

| Component | Purpose |
|-----------|---------|
| `nav-section/` | Navigation section (sidebar items) |
| `custom-breadcrumbs/` | Breadcrumb navigation |
| `custom-tabs/` | Tab component |
| `filters-result/` | Active filter display |
| `filters-toolbar/` | Filter toolbar |
| `search-field-toolbar/` | Search toolbar |

### File & Upload

| Component | Purpose |
|-----------|---------|
| `dropzone/` | File drag-and-drop zone |
| `upload/` | File upload component |
| `upload-documents/` | Document upload |
| `upload-more-documents/` | Additional document upload |
| `upload-additonal-documents/` | Extra document upload |
| `spreadsheet-upload/` | Excel/CSV upload |
| `file-thumbnail/` | File preview thumbnail |

### Utilities & Layout

| Component | Purpose |
|-----------|---------|
| `loading-screen/` | Splash screen + loading spinner |
| `Loader/` | Inline loader |
| `progress-bar/` | NProgress-style progress bar |
| `snackbar/` | Toast notification system |
| `scroll-to-top.tsx` | Scroll to top on route change |
| `scrollbar/` | Custom scrollbar |
| `settings/` | Settings drawer (theme, layout) |
| `animate/` | Framer Motion animation components |
| `carousel/` | Image carousel |

### Domain-Specific Components

| Component | Purpose |
|-----------|---------|
| `signature-booking-gate/` | Signature booking gate |
| `office-use/` | Office use fields |
| `referrer-details/` | Referrer details form |
| `share-form-dialog/` | Share form email dialog |
| `documents-received-offline/` | Offline document tracking |
| `qr-code-generator/` | QR code generation |
| `column-manager/` | Column visibility management |
| `read-only-field/` | Read-only display field |
| `date-range-format/` | Date range formatter |
| `google-maps-autocomplete/` | Google Places autocomplete |
| `border-box/` | Border box container |
| `flag-icon/` | Country flag icons |

## Form Handling

**Libraries:** Formik + Yup

```typescript
// Typical form pattern
const formik = useFormik({
  initialValues: { ... },
  validationSchema: Yup.object({ ... }),
  onSubmit: async (values) => {
    await POST(route.CREATE_BOOKING_API, values);
  },
});
```

### Form Components
- `hook-form/` provides a Formik-connected component system
- Wraps MUI form controls with Formik error/helper text binding
- Custom date pickers, autocompletes, and phone inputs

## Loading Screens

| Component | File | Usage |
|-----------|------|-------|
| `SplashScreen` | `src/components/loading-screen/splash-screen.tsx` | Initial app load, route guard checks |
| `LoadingScreen` | `src/components/loading-screen/loading-screen.tsx` | Suspense fallback for route sections |

## Animation

**Library:** Framer Motion

- `src/components/animate/` - Reusable animation variants
- `varBounce`, `varFade`, `varScale`, `varSlide`, `varZoom`
- `MotionContainer` - Groups animated children
- Route page transitions via `motion.div`

## Key Patterns

1. **Small focused components** - Each component handles one concern
2. **MUI styled-components** - Heavy use of `styled()`, `sx`, and `theme` overrides
3. **No component library** - Components are custom-built, not from a third-party UI kit
4. **Forward-ref support** - Components like `RouterLink` use `forwardRef`
5. **Flat structure** - All 68+ components in a single `components/` directory (no sub-categorization)
6. **Minimal prop drilling** - Components read from Redux or context directly
