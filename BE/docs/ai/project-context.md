# Project Context

Puravankara **backend API** (`puravankara-engine`): NestJS service for booking forms, sales-portal APIs, incentive dashboard, EOI/vouchers, inventory, payments, agreements, and CRM integrations. React sales portal is a **separate client** — not in this repo.

**Governance (mandatory):** `.opencode/agents/governance-agent.md` · **SDLC discipline:** `.opencode/agents/_sdlc-rules.md` · **Machine-readable map:** `docs/ai/context-map.json`

## Stack

- **Runtime:** Node.js ≥ 22.14.0, TypeScript 5.x, NestJS 10.x, CommonJS (`tsconfig` relaxed strictness — match peers).
- **HTTP:** REST; global prefix `api` (non-prod: `api/{NODE_ENV}`); envelope `{ success, response, errors }` via `src/interceptors/transform.interceptor.ts`.
- **DB:** MySQL + TypeORM (`synchronize: false`); entities barrel `src/entities/index.ts`; schema only via `src/migrations/` (~158 timestamped files).
- **Cache / async:** Redis (`cache-manager-ioredis`); BullMQ (`@nestjs/bullmq`); queue audit via `src/modules/queue_audit/`.
- **Realtime:** Socket.io on `WS_PORT` — `src/websocket/ws.main.ts` + Redis adapter (separate process from HTTP `src/main.ts`).
- **Auth:** Azure AD SAML + JWT — `src/modules/sso/`; guards under `src/modules/sso/gaurds/` (historical spelling).
- **Docs / PDF:** EJS in `src/templates/` (copied to `dist/` on build); Puppeteer, `pdf-lib`, `src/modules/pdf/`.
- **Observability:** Winston `src/logger/logger.ts`, Sentry `@sentry/nestjs`.
- **Integrations:** AWS S3/SES, SFDC, Razorpay, Leegality, Decentro, WhatsApp, Google APIs — use existing modules; config via `CustomConfigService.getDecrypted()`.

## Commands

| Command | Use |
|---------|-----|
| `npm run build` | Compile + copy `src/templates` → `dist/` |
| `npm run start:dev` | Watch mode (HTTP) |
| `npm run start:prod` | `node dist/main` |
| `npm run test` | Unit tests (`rootDir: src`, `*.spec.ts`) |
| `npm run test:e2e` | E2E (`NODE_ENV=test`, `test/jest-e2e.json`) |
| `npm run test:cov` | Coverage (SonarQube per README) |
| `npm run lint` / `npm run format` | ESLint + Prettier on changed `.ts` |
| `npm run migration:create -- src/migrations/<Name>` | New migration scaffold |
| `npm run migration:run` / `migration:revert` | Apply / revert last migration |

## Folder Map

**Cross-cutting (not feature modules):**

- `src/config/` — env, `typeorm.config.ts`, `constants.ts`
- `src/middleware/` — sanitize, decrypt guard, CORS, user-request
- `src/filters/`, `src/interceptors/`, `src/validations/`
- `src/utils/`, `src/helpers/`, `src/enums/`, `src/infra/`
- `src/templates/` — EJS/HTML for PDF and email layouts
- `src/websocket/` — WS app + gateways + Redis adapter
- `test/` — E2E specs

**Feature domains under `src/modules/`:**

- **Bookings & documents:** `bookings`, `booking_documents`, `referrals`, `project_terms`, `form_amendment_requests` — also uses `leegality`, `pdf`, `decentro`, `sfdc`, `payments`
- **Agreements & e-sign:** `agreement_signature_form` — uses shared `leegality`, `pdf`
- **E-sign (shared):** `leegality` — consumed by `bookings`, `agreement_signature_form`, `decentro`
- **PDF (shared):** `pdf` — consumed by `bookings`, `agreement_signature_form`, `eoi_manager/voucher_forms`, `sales`
- **KYC / identity:** `decentro` (DigiLocker, GST) — tied to `bookings`, `leegality`; not payment gateways
- **Incentives:** `incentives/` — `incentive_policy`, `incentive_booking`, `incentive_payouts`, `incentive_reports`, `incentive_dashboard`, `incentive_booking_overrides`, `booster_master`, `leaderboard`, `sap`, `admin_reports`
- **EOI / vouchers:** `eoi_manager/` — `voucher_forms`, `eoi_management`, `eoi_campaign`, `batch_manager`, `channel_partner`; cross-links `payments`, `inventory-unit`
- **Inventory:** `inventory-unit` — unit blocking/mapping; tied to `voucher_forms`
- **Payments:** `payments` (Razorpay/EaseBuzz) — tied to `bookings`, `voucher_forms`
- **CRM:** `sfdc`, `sfdc_logs`
- **Masters:** `masters/` — brands, projects, phases, city/region/country, `company_master`
- **Users & access:** `users`, `roles`, `sso`, `sales`, `user_finance`, `salary_upload`
- **Site visits:** `site_visit_crud`, `site_visit_logIn`
- **Platform / comms:** `aws`, `notifications`, `email_templates`, `whatsapp`, `google`, `crons`, `queue_audit`, `ws_publisher`, `user_activity_logs`, `sentry`

## Architecture Rules

- **Wiring:** Register app-level modules in `src/app.module.ts`; global guards `DecryptRequestGuard`, `ThrottlerGuard`; middleware chain: user-request → response-catch → CORS → helper → sanitize.
- **Feature layout:** `src/modules/<feature>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, optional `dto/`, `entities/`, `processors/`, `interfaces/`.
- **Controllers:** Thin; delegate to services; mirror peer routes for `@UseGuards`, `@Roles`, `@ExposeFields`, `@SkipEncryption` / `@SkipDecryption` in same module.
- **DTOs:** `class-validator` / `class-transformer`; global `CustomValidationPipe` + `ValidationPipe` whitelist.
- **Entities:** Feature-local `entities/`; export in `src/entities/index.ts` when TypeORM global discovery needs them.
- **Migrations:** Never `synchronize: true`; never edit applied migrations — add new timestamped file.
- **Queues:** `@Processor` in `processors/`; queue names from `src/config/constants.ts` (e.g. `BULK_TRANSACTION_UPDATE_QUEUE`); use `QueueAuditModule` when peers audit jobs.
- **Events / cron:** `@nestjs/event-emitter` and `@nestjs/schedule` via `src/modules/crons/` patterns.
- **Encryption:** Optional AES-256-GCM (`ENABLE_ENCRYPTION`); respect global decrypt/response encryption unless peer uses skip decorators.
- **Role-based fields:** `src/utils/role-based-filter.utils.ts`, `agreement-field-permissions.ts` — do not widen exposure without spec.
- **Historical paths:** Keep `gaurds/`, `site_visit_logIn`, known typo filenames unless task renames them.

## Testing Rules

- **Unit:** Jest, co-located `*.spec.ts`; `@nestjs/testing` with `useValue` mocks; `moduleNameMapper` `src/` → `<rootDir>/`.
- **E2E:** `test/*.e2e-spec.ts`, `npm run test:e2e`.
- **Mocks:** External IO (Puppeteer, S3, SFDC, Razorpay, HTTP) — no real DB/Redis/AWS in unit tests.
- **When required / optional / skip:** See governance **Testing expectations** table.
- **Focused run:** `npm run test -- --testPathPattern=<module>`

## Styling and Component Rules

- **No React/UI** in this repo.
- **EJS:** Booking/voucher previews under `src/templates/bookings/`, `src/templates/vouchers/`; email layouts `src/templates/email_layouts/`.
- **PDF/email:** Generated via services (`pdf`, `leegality`, module services) + EJS; build must copy templates to `dist/`.
- **Code style:** Prettier 80 cols, single quotes, trailing commas — align with `.eslintrc.js` / governance.

## Common Paths

| Task | Open first |
|------|------------|
| New REST endpoint | Peer `*.controller.ts` + `*.service.ts` in same `src/modules/<feature>/` |
| New entity / column | Feature `entities/`, `src/entities/index.ts`, new `src/migrations/<timestamp>-*.ts` |
| Auth / roles | `src/modules/sso/`, `src/modules/sso/gaurds/`, `src/modules/roles/` |
| Queue job | `src/config/constants.ts`, feature `processors/`, `src/modules/queue_audit/` |
| Bulk EOI transactions | `src/modules/eoi_manager/eoi_management/` — see `docs/PE-483-bulk-transaction-api-flow.md` |
| Config / secrets | `src/config/custom-config.service.ts` — `getDecrypted()`, not raw env for credentials |
| Global HTTP behavior | `src/main.ts`, `src/app.module.ts` |
| WS event publish | `src/modules/ws_publisher/`, `src/websocket/` |
| Error / response shape | `src/filters/global-exception.filter.ts`, `src/interceptors/transform.interceptor.ts` |

## Deeper Docs

- `README.md` — setup, encryption, migrations, naming, deploy notes
- `docs/PE-483-bulk-transaction-api-flow.md` — BullMQ bulk transaction upload flow (EOI)

## Agent Notes

- **Read order:** `_sdlc-rules.md` → `governance-agent.md` → `context-map.json` (optional) → this file → task artifact.
- **Scope:** Backend only; minimal diffs; one primary module per task unless specified.
- **Mirror peers** in the same module for guards, DTOs, specs, encryption skips.
- **Hotspots (extra regression care):** `incentives/`, `eoi_manager/`, `payments/`, `inventory-unit/`, `sfdc/`, `agreement_signature_form/`.
- **Do not:** commit/push/migrate shared DBs unless asked; rename `gaurds/`; repo-wide strict TS or lint sweeps; duplicate governance here.
