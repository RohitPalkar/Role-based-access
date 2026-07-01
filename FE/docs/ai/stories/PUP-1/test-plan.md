# PUP-1 — Test Plan: Restrict Booking Access Until Signature Upload is Completed

| Field | Value |
|-------|--------|
| **Story** | PUP-1 |
| **Spec** | [spec.md](./spec.md) |
| **Implementation plan** | [implementation-plan.md](./implementation-plan.md) |
| **Framework** | Vitest + jsdom (`vite.config.ts`, `src/test/setup.ts`) |
| **Run command** | `yarn test:run` (see `docs/ai/context-map.json`) |

## Purpose

Define automated and manual verification for gating RM panel booking access on `signatureImage` from the post-login `users/details` response, without asserting implementation-specific wiring before production files land.

**Constraints for this document phase:** no production edits; no new dependencies; reuse Vitest colocated `*.test.ts` / `*.test.tsx` patterns only.

---

## Test pyramid

| Layer | Priority | Scope |
|-------|----------|--------|
| **Unit (pure)** | **P0 — required** | `isSignaturePresent` — null, empty, whitespace, valid values |
| **Unit (dialog wrapper)** | P1 — optional | `SignatureRequiredDialog` — message, Upload/Cancel actions via `ConfirmDialog` |
| **Unit (hook)** | **Defer** | `useSignatureBookingGate` — Redux/router coupling; cover indirectly via component tests or manual |
| **Component (guard / login prompt)** | P1 — optional | `SignatureBookingRouteGuard`, `SignatureBookingLoginPrompt` — after props and hook stabilize |
| **Component (layout / nav)** | **Defer** | `RmPanelDashboardLayout` nav `disabled` — heavy providers; manual AC-4 |
| **Integration (auth / Redux refresh)** | **Defer** | `auth-provider`, `signature-utils`, `profile-settings` refresh — no existing precedent; manual AC-6 |
| **Manual / E2E** | **P0** | Post-login dialog, tab disable, route block, upload unlock, no-regression path |

---

## What to test (by acceptance criteria)

| AC | Description | Automated | Manual |
|----|-------------|-----------|--------|
| AC-1 | `users/details` checked for `signatureImage` after login | Indirect via `isSignaturePresent` on auth user shape | Login → Redux `state.auth.user.signatureImage` populated from API |
| AC-2 | Missing signature → `ConfirmDialog` with upload message | Optional RTL on `SignatureRequiredDialog` | Login without signature → dialog once per session |
| AC-3 | Upload CTA → Profile Settings (`/rm-panel/profile/settings`) | Optional RTL: Upload click calls `onUpload` / navigates | Click Upload → lands on profile settings (in-app path, not hardcoded dev host) |
| AC-4 | Booking tab disabled until signature uploaded | — | Bookings nav item disabled when `!hasSignature`; enabled when present |
| AC-5 | Direct booking routes → same dialog, content blocked | Optional RTL on `SignatureBookingRouteGuard` | Deep link `/rm-panel/bookings`, pre/post booking forms → dialog, no booking UI |
| AC-6 | After upload + refresh, booking unlocked | — | Upload on settings → `checkUserSession` / refresh → tab enabled, routes render |
| AC-7 | Users with signature unchanged | `isSignaturePresent` true cases | Login with signature → no dialog, Bookings works as today |

---

## P0 — Unit tests: `isSignaturePresent`

**Production file (implementer creates):** `src/utils/signature-booking.ts`  
**Test file:** `src/utils/signature-booking.test.ts` (starter with `it.todo` exists pre-implementation)

**Convention reference:** `src/utils/inventory-block-timer.test.ts`, `src/utils/helper.test.ts` — plain `describe` / `it`, `vitest` imports, no DOM.

### Function contract (from implementation plan)

```ts
export function isSignaturePresent(signatureImage?: string | null): boolean
```

- Return `false` for `null`, `undefined`, `''`, and strings empty after `.trim()`.
- Return `true` for any other non-empty string (e.g. S3 path, URL fragment).

### Cases (implementer fills assertions)

| # | Input | Expected |
|---|--------|----------|
| 1 | `undefined` | `false` |
| 2 | `null` | `false` |
| 3 | `''` | `false` |
| 4 | `'   '` (whitespace only) | `false` |
| 5 | `'\t\n'` | `false` |
| 6 | `'signatures/user-123.png'` | `true` |
| 7 | `' https://example.com/sig.png '` (non-empty after trim) | `true` |

### Implementation notes for tests

- Pure function only — **no** Redux, router, or API mocks.
- Do **not** assert S3 URL construction or image loading; only presence semantics.
- Align with existing `User.signatureImage?: string` in `src/redux/type.tsx` (optional field).

### Example assertion sketch (post-implementation)

```ts
// TODO: replace with real import once signature-booking.ts exists
// import { isSignaturePresent } from './signature-booking';
// expect(isSignaturePresent(null)).toBe(false);
// expect(isSignaturePresent('path/to/sig.png')).toBe(true);
```

---

## P1 — Optional RTL: `SignatureRequiredDialog`

**File:** `src/components/signature-booking-gate/signature-required-dialog.tsx`  
**Test file:** `src/components/signature-booking-gate/signature-required-dialog.test.tsx` (create only when wrapper is stable)

**Why optional:** Repo has limited RTL coverage outside batch-manager; dialog is a thin `ConfirmDialog` wrapper. Value is in asserting copy and action wiring.

### Behaviours to cover (after implementation)

| Scenario | Assert |
|----------|--------|
| Dialog open | Message visible (TODO: query by i18n key `signatureBooking.dialog.message` or rendered text) |
| Upload click | `onUpload` called once |
| Cancel / dismiss | `onClose` called; **no** `onUpload` |
| Upload label | Button role/name matches locale `signatureBooking.dialog.upload` (TODO: exact string after `common.json` keys land) |

### Mocking strategy

- Render with `ThemeProvider` + `createTheme()` (see `batch-listing-dialog-box.test.tsx`).
- Pass controlled props: `open={true}`, `onClose={vi.fn()}`, `onUpload={vi.fn()}`.
- **Do not** mock `ConfirmDialog` — test through it for integration confidence.

---

## P1 — Optional RTL: `SignatureBookingRouteGuard`

**File:** `src/components/signature-booking-gate/signature-booking-route-guard.tsx`  
**Test file:** `src/components/signature-booking-gate/signature-booking-route-guard.test.tsx`

### Behaviours to cover (after implementation)

| Scenario | Assert |
|----------|--------|
| `hasSignature === true` | Child content rendered (e.g. `getByText('child-marker')`) |
| `hasSignature === false` | Child **not** rendered; signature dialog open |
| Upload from guard | TODO: assert `navigate` called with `paths.profile.settings` or `onUpload` handler |

### Mocking strategy

- `vi.mock('src/hooks/use-signature-booking-gate', () => ({ ... }))` — return controllable `hasSignature`, dialog state.
- Wrap with `MemoryRouter` if guard uses `useNavigate` internally.
- Child: simple `<motion.div>child-marker</motion.div>` or `<span>child-marker</span>`.

---

## P1 — Optional RTL: `SignatureBookingLoginPrompt`

**File:** `src/components/signature-booking-gate/signature-booking-login-prompt.tsx`

### Behaviours to cover (after implementation)

| Scenario | Assert |
|----------|--------|
| Authenticated, no signature, first mount | Dialog opens once |
| Same session, re-render | Dialog **not** shown again (TODO: mock `sessionStorage` / ref flag per implementation) |
| User has signature | Dialog never opens |
| Dismiss | Dialog closes; booking still blocked (TODO: assert no navigation to bookings) |

**Note:** Session-once logic is implementation-specific — use TODO placeholders until `sessionStorage` key or `useRef` pattern is confirmed.

---

## Explicitly out of scope (automated)

| Area | Reason |
|------|--------|
| `auth-provider.tsx` decrypt / `users/details` fetch | No auth provider tests in repo; AC-1 manual + code review |
| `auth-slice.ts` typing | Trivial type extension; no reducer logic change expected |
| `refresh-user-details.ts` (optional extract) | Axios + decrypt; defer unless pure helpers extracted |
| `signature-utils.ts` Redux dispatch after upload | Integration with API; AC-6 manual |
| `profile-settings.tsx` success handlers | Form + upload flow; AC-6 manual |
| `rm-panel-dashboard-layout.tsx` nav clone + `disabled` | Full layout + nav-section; AC-4 manual |
| `rm-panel-routes.tsx` route wiring | Router config; AC-5 manual deep links |
| `config-nav-dashboard.tsx` / `paths.ts` | Constants only |
| `ConfirmDialog` itself | Reused unchanged per spec |
| Other roles (sales-tl, sales-rsh, admin bookings) | Out of scope per implementation plan |
| `eoi-records/pre-booking-form/:id` | Excluded unless product expands scope (plan open question) |

---

## Starter tests (pre-implementation)

| File | Status |
|------|--------|
| `src/utils/signature-booking.test.ts` | `it.todo` placeholders — **green in CI**, enable when helper lands |
| `src/components/signature-booking-gate/*.test.tsx` | Not created pre-implementation — add when components exist |

**Workflow:** Implementer replaces `it.todo` with real tests as `signature-booking.ts` lands; run targeted test then full suite before PR.

```bash
yarn vitest run src/utils/signature-booking.test.ts
yarn test:run
```

---

## Manual test checklist

Execute after implementation (RM panel user):

1. **Login without `signatureImage`** → post-login dialog appears **once** per session; message requires signature before bookings.
2. **Bookings nav tab** → disabled / not navigable when signature missing.
3. **Direct URL** `/rm-panel/bookings` → same dialog; opportunity list **not** visible.
4. **Direct URL** `/rm-panel/bookings/pre-booking-form/:oppId` and `/rm-panel/bookings/post-booking-form/:oppId` → blocked + dialog.
5. **Upload** → navigates to `/rm-panel/profile/settings` (in-app router, not hardcoded `incentive-dev` host).
6. **Dismiss dialog** → other RM areas usable; booking remains blocked.
7. **Upload signature on settings** → return to bookings → tab enabled, list loads, no dialog.
8. **Login with existing `signatureImage`** → no dialog; Bookings tab and routes work unchanged (AC-7 regression).
9. **Profile settings route** `/rm-panel/profile/settings` → always reachable without guard blocking upload page.

---

## Quality gates

```bash
yarn type-check
yarn lint
yarn fm:check
yarn test:run
```

Targeted during development:

```bash
yarn vitest run src/utils/signature-booking.test.ts
```

---

## File checklist for implementer

| Action | Path |
|--------|------|
| Create helper | `src/utils/signature-booking.ts` |
| **Complete unit tests** | `src/utils/signature-booking.test.ts` |
| Create gate components | `src/components/signature-booking-gate/*` |
| Create hook | `src/hooks/use-signature-booking-gate.ts` |
| Wire layout + routes | `rm-panel-dashboard-layout.tsx`, `rm-panel-routes.tsx` |
| Refresh after upload | `profile-settings.tsx`, `signature-utils.ts`, optional `refresh-user-details.ts` |
| i18n | `src/locales/langs/en/common.json` (`signatureBooking.*`) |
| Optional RTL | `signature-required-dialog.test.tsx`, `signature-booking-route-guard.test.tsx`, `signature-booking-login-prompt.test.tsx` |

---

## Risks for test authors

| Risk | Test mitigation |
|------|-----------------|
| Whitespace-only treated as present | Explicit case #4–5 in `isSignaturePresent` unit tests |
| Dialog shown every render | Login prompt tests mock session flag; manual verify once-per-session |
| Upload navigates to external URL | Manual AC-3; optional RTL assert in-app path constant |
| Redux not updated after signature upload | Manual AC-6; no automated axios mock unless helper extracted |
| Disabled nav prevents click → no dialog on tab | Expected per AC-4; rely on post-login + route guard dialogs |
| `ConfirmDialog` cancel grants booking access | Assert dismiss only calls `onClose`; manual verify booking still blocked |
| Auth user type missing `signatureImage` | Type-only; runtime covered by manual login flows |

---

## Definition of done (testing)

- [ ] All `it.todo` in `signature-booking.test.ts` replaced; file passes.
- [ ] AC-1 signature presence semantics covered by unit cases 1–7.
- [ ] `yarn test:run` green.
- [ ] Manual checklist executed for missing-signature and has-signature paths.
- [ ] Optional component RTL added only if stable and maintained; otherwise manual AC-2, AC-3, AC-5 for dialog and route guard.
