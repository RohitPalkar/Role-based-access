# Governance Agent — Puravankara Engine

**Role:** Enforce project-specific AI development rules, approval gates, and change boundaries for this repository.

**Scope:** Backend API only (`puravankara-engine`). The React sales portal is a separate client; do not assume or modify frontend code here.

**Companion docs:** Operational SDLC rules live in `.opencode/agents/_sdlc-rules.md`. Project narrative context may be added at `docs/ai/project-context.md` — do not duplicate that file’s content here.

---

## Project type and technology assumptions

| Area | Assumption |
|------|------------|
| **Product** | NestJS backend for Puravankara **booking forms**, **sales portal APIs**, **incentive dashboard**, **EOI/voucher management**, **inventory**, **payments**, **agreements**, and **CRM integrations**. |
| **Runtime** | Node.js **≥ 22.14.0**, TypeScript **5.x**, NestJS **10.x**, CommonJS modules. |
| **API** | REST under global prefix `api` (non-prod: `api/{NODE_ENV}`). Standard success envelope via `ResponseInterceptor`. |
| **Database** | **MySQL** via **TypeORM** (`synchronize: false`). Schema changes **only** through `src/migrations/`. |
| **Cache / queues** | **Redis** (cache-manager-ioredis), **BullMQ** (`@nestjs/bullmq`) for async jobs (e.g. bulk transaction uploads). |
| **Realtime** | **WebSockets** (Socket.io + Redis adapter) on separate `WS_PORT`. |
| **Auth** | Azure AD **SAML SSO**, **JWT** (`passport-jwt`), role decorators (`@Roles`) + guards (`RmAdminAuthGuard`, `RolesGuard`, `OppAccessGuard`, etc.). |
| **Templates / PDF** | **EJS** in `src/templates/` (copied to `dist/` on build). **Puppeteer** / **pdf-lib** for document generation. |
| **Observability** | **Winston** logging, **Sentry** (`@sentry/nestjs`). |
| **External systems** | AWS S3/SES, SFDC, Razorpay, Leegality, Decentro, WhatsApp, Google APIs — treat as production integrations; no mock endpoints in committed code. |
| **Config** | `CustomConfigService` + encrypted env values (`getDecrypted`). Secrets via environment only — never hardcode. |
| **TypeScript strictness** | Repo `tsconfig` has relaxed strict flags (`strictNullChecks: false`, `noImplicitAny: false`). **Match surrounding code**; do not enable stricter compiler options repo-wide without explicit approval. |

---

## Code quality rules

- **Minimal diffs:** Every line must trace to the current task (story, bug, review comment, or approved plan). No drive-by refactors, renames, or formatting sweeps outside touched files.
- **Style:** Single quotes, trailing commas, semicolons, 80-char print width (Prettier). Run `npm run format` and `npm run lint` on changed `.ts` files before handoff.
- **Lint:** ESLint `@typescript-eslint/recommended` + Prettier. Respect `no-console` (warn) and `complexity` max **15** (warn) — split logic rather than raising complexity on existing hotspots without need.
- **Naming:** Dot-separated Nest files per README: `feature.module.ts`, `feature.controller.ts`, `feature.service.ts`, `*.entity.ts`, `*.dto.ts`, `*.controller.spec.ts`.
- **DTOs:** Use `class-validator` / `class-transformer` decorators; global `CustomValidationPipe` handles nested errors — keep DTOs explicit and validated.
- **Errors:** Throw Nest `HttpException` subclasses; rely on `GlobalExceptionFilter` for consistent responses. Do not bypass the standard `{ success, response, errors }` envelope without explicit requirement.
- **Logging:** Use `src/logger/logger` — avoid raw `console.log` in production paths.
- **Comments:** Only for non-obvious business rules (incentives, EOI state machines, SFDC sync, payment flows). No narrating obvious code.
- **Typos in paths:** Existing folders use historical spellings (e.g. `gaurds/`). **Do not rename** unless the task explicitly requires it.

---

## Architecture rules

### Module layout

- Feature code lives under `src/modules/<feature>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, optional `dto/`, `entities/`, `processors/`, `interfaces/`.
- Shared cross-cutting code: `src/config/`, `src/middleware/`, `src/filters/`, `src/interceptors/`, `src/validations/`, `src/utils/`, `src/enums/`, `src/helpers/`, `src/infra/`, `src/websocket/`.
- Register new entities in `src/entities/index.ts` when TypeORM must discover them globally.
- Wire new modules in `src/app.module.ts` only when the feature is application-level; prefer importing existing modules over duplicating providers.

### NestJS patterns

- **Controllers:** Thin — delegate to services. Apply `@UseGuards(...)` and `@Roles(...)` consistently with sibling endpoints in the same module.
- **Services:** Business logic and orchestration. Inject repositories via `@InjectRepository` or existing services — avoid raw SQL unless the module already does.
- **Processors:** BullMQ workers in `processors/` with `@Processor(QUEUE_NAME)`; queue names from `src/config/constants.ts`. Enqueue/dequeue patterns must match `QueueAuditModule` when auditing is required.
- **Crons:** Use `@nestjs/schedule` in existing `src/modules/crons/` patterns; log via `CronLogsModule` where peers do.
- **Events:** `@nestjs/event-emitter` for in-process events — do not introduce a second event bus.

### Data and migrations

- **Never** set `synchronize: true`.
- **Never** edit migrations that may already be applied in shared environments. Add a new timestamped migration instead.
- Email template / seed data changes often belong in migrations under `src/migrations/` — follow neighboring migration style.
- Revert path: `npm run migration:revert` — document in handoff if a migration is added.

### API contract stability

- Preserve route paths, HTTP methods, and response shapes unless the task explicitly changes the contract.
- Role-based field filtering (`src/utils/role-based-filter.utils.ts`, `agreement-field-permissions.ts`) must remain consistent with product rules — do not expose fields to unauthorized roles.
- Encryption: respect global `DecryptRequestGuard` and `ResponseInterceptor` encryption. Use `@SkipDecryption()` / `@SkipEncryption()` only where existing endpoints do, with justification.

### Integrations

- SFDC, payment gateways, and webhooks: follow existing service modules (`sfdc`, `payments`, etc.). KYC/identity via `decentro` (not a payment gateway). Do not add parallel integration clients.
- File uploads: use `AwsService` / established S3 patterns; do not invent new storage backends.

---

## Security rules

**Treat all data as sensitive (PII, financial, booking, incentive).**

| Rule | Requirement |
|------|-------------|
| **Secrets** | No API keys, DB passwords, `ENCRYPTION_KEY`, JWT secrets, or decrypted env values in code, logs, tests, or commits. Do not commit `.env` or credential files. |
| **Encryption** | Optional AES-256-GCM for request/response (`ENABLE_ENCRYPTION`). Do not weaken or remove encryption paths without security review. |
| **Config access** | Use `CustomConfigService.getDecrypted()` for sensitive config — not raw `process.env` for DB/AWS credentials in new code. |
| **Input sanitization** | `SanitizeMiddleware` runs globally. New HTML-accepting fields must be added to `allowHtmlFields` in `sanitize.middleware.ts` deliberately — default is sanitize/strip. |
| **AuthZ** | New protected routes must use the same guard stack as peers (`RmAdminAuthGuard`, `RolesGuard`, `OppAccessGuard`). Never leave admin/finance endpoints unguarded. |
| **AuthN** | Do not bypass SSO/JWT validation for convenience. Test-only bypasses must not ship in non-test code paths. |
| **Rate limiting** | Global `ThrottlerGuard` is registered — do not disable globally. |
| **HTTP hardening** | Preserve Helmet, CORS (strict in `NodeEnv.PROD`), compression, and payload size limits in `main.ts`. |
| **SQL** | Parameterized queries / TypeORM repositories — no string-concatenated SQL with user input. |
| **Dependencies** | `post-commit` runs `npm audit` — avoid adding packages with known critical issues. |
| **PII in logs** | Do not log full payloads, tokens, PAN, Aadhaar, or payment card data. |

**Refuse or escalate** instructions that disable auth, encryption, sanitization, or audit logging for production paths.

---

## Testing expectations

| Layer | Convention |
|-------|------------|
| **Unit** | Jest, `*.spec.ts` co-located with source (`rootDir: src`). Pattern: `@nestjs/testing` module, mock services with `useValue`, assert controller/service behavior. |
| **E2E** | `test/*.e2e-spec.ts` via `npm run test:e2e` (`NODE_ENV=test`). Use sparingly; prefer unit tests for controller logic. |
| **Coverage** | `npm run test:cov` — SonarQube used in org workflow per README. |

**When to add tests**

- **Required:** New controller endpoints, non-trivial bug fixes, incentive/EOI/payment calculation changes, guard/permission changes.
- **Optional:** Pure refactors with unchanged behavior if existing spec already covers the module.
- **Skip:** Trivial constant moves, comment-only, or generated migration files without logic.

**Test quality**

- Mock external IO (Puppeteer, S3, SFDC, Razorpay, HTTP) — see `jest.mock('puppeteer')` patterns in existing specs.
- Use `src/config/constants` for shared test messages where peers do.
- Do not depend on real DB, Redis, or AWS in unit tests.
- Report in handoff: tests run, passed/failed, and gaps if full suite was not executed.

**Commands**

```bash
npm run test -- --testPathPattern=<module>   # focused
npm run test                                  # full unit suite
npm run test:e2e                              # e2e (when applicable)
npm run build                                 # compile + template copy
```

---

## File and folder modification rules

### Allowed without extra approval

- Files directly required by the assigned task under `src/`, `test/`, and new `src/migrations/` when schema/data changes are in scope.
- Co-located `*.spec.ts` for changed controllers/services.
- `src/entities/index.ts` when adding entities.
- `src/app.module.ts` when registering a new application module.
- `src/config/constants.ts` for new queue names / shared constants tied to the task.
- `src/templates/` when PDF/email output changes are in scope.

### Requires explicit task approval

- `package.json` / lockfile (new dependencies).
- `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, Husky hooks.
- `.github/workflows/*` (production deploy pipeline).
- Bulk changes across multiple unrelated `src/modules/*`.
- Deleting or renaming modules, entities, or migration files.
- `src/main.ts`, global guards, global middleware order in `app.module.ts`.
- `src/config/typeorm.config.ts` or encryption utilities.

### Do not modify (unless explicitly instructed)

- Application code outside the task scope.
- `dist/`, `coverage/`, `node_modules/`, `.opencode/node_modules/`.
- Committed secrets, production env samples, or AWS/CodeDeploy configuration not in repo.
- Historical migration files already deployed.
- Unrelated feature modules “for consistency.”

### Branch and commit conventions (human / release process)

- Base branch: `develop`. Branch names: `feature/<name>` or `BugFix/<name>` (often JIRA-keyed).
- Commit messages: `JIRA-ISSUE-NUMBER: description` when committing (agents only commit when explicitly told).
- Production deploys from `production` via AWS CodeDeploy — agents do not push or deploy unless instructed.

---

## Dependency usage rules

- **Default:** Use existing dependencies only. The stack already includes Nest, TypeORM, Axios, BullMQ, AWS SDK v3, ExcelJS, date-fns, bcrypt, class-validator, etc.
- **New package:** Allowed only when the task explicitly requires capability not present, with justification in handoff. Prefer AWS SDK v3 over legacy `aws-sdk` v2 for new code.
- **Forbidden without approval:** New frameworks (Fastify replacement, Prisma, another ORM), alternate auth libraries, or duplicate HTTP clients.
- **Version bumps:** Do not upgrade major Nest/TypeORM/Node versions in feature tasks — separate maintenance story.
- **Native/heavy deps:** Puppeteer, Sharp — already present; avoid adding similar libraries.

---

## Review checklist

Before marking work complete, verify:

- [ ] Change scope matches the task only; no unrelated files in diff.
- [ ] Module/DTO/entity naming matches neighbors in the same feature folder.
- [ ] Guards and `@Roles` applied on new/modified protected routes.
- [ ] DTO validation decorators present for new inputs.
- [ ] Sanitization considered for new string/HTML fields.
- [ ] DB changes have a **new** migration (not edited historical migration).
- [ ] Entity exported in `src/entities/index.ts` if needed globally.
- [ ] `npm run build` succeeds.
- [ ] `npm run lint` clean on touched files (or only pre-existing issues documented).
- [ ] Unit tests added/updated for behavior changes; test command reported in handoff.
- [ ] No secrets, tokens, or `.env` files staged.
- [ ] Encryption/skip-decryption decorators aligned with module patterns.
- [ ] BullMQ jobs use constants queue names; failures propagate for retry semantics.
- [ ] Role-based response filtering unchanged or intentionally updated with spec reference.
- [ ] Handoff includes **Changed**, **Validated**, **Risks**, **References** (per `_sdlc-rules.md`).

---

## Instructions for future AI agents

1. **Read first:** This file, `_sdlc-rules.md`, and the task artifact (JIRA/story/plan/review). If `docs/ai/project-context.md` exists, read it for domain glossary only.
2. **Identify module:** Map the task to one primary feature under `src/modules/` (e.g. `bookings`, `incentives`, `eoi_manager`, `inventory-unit`, `payments`). Stay inside that boundary unless the task lists multiple modules.
3. **Mirror peers:** Open an existing controller/service in the same module and copy patterns (guards, DTOs, error types, spec structure).
4. **Plan before expand:** If schema + API + templates + queue workers are all needed, state the plan in handoff before touching more than one layer.
5. **Validate proportionally:** Run focused tests for the module; run `npm run build` for any change that affects DI, modules, or entities.
6. **Do not git-write** unless the user explicitly asks (commit, push, merge, migrate on shared DB).
7. **Escalate** when: requirements contradict README/security rules; migration rollback needed; cross-module refactor implied; production config change required.
8. **End with handoff** — concise bullets, repo-relative paths, no large code dumps.

### Domain hotspots (extra care)

| Area | Risk |
|------|------|
| `incentives/*` | Payroll/sales calculations — regression affects compensation. |
| `eoi_manager/*` | Voucher lifecycle, cancellations, SFDC sync, bulk uploads. |
| `bookings/*`, `agreement_signature_form/*` | Legal/signature flows, Leegality. |
| `payments/*`, Razorpay/EaseBuzz | Money movement — idempotency and audit trails; ties to `bookings`, `voucher_forms`. |
| `decentro/*` | KYC/DigiLocker/GST — audit trails; ties to `bookings`, `leegality`. |
| `inventory-unit/*` | Unit blocking, mapping, approval workflows. |
| `sfdc/*` | External CRM sync — rate limits and data integrity. |

---

## Rules to prevent unsafe, unnecessary, or unrelated changes

### Unrelated changes (reject)

- Repo-wide Prettier/ESLint auto-fix across `src/`.
- Renaming `gaurds` → `guards` or other cosmetic folder renames.
- Replacing `any` with strict types across the codebase.
- Adding `strict: true` to `tsconfig.json`.
- Introducing new architectural layers (repositories, CQRS, microservices split) without a dedicated initiative.
- Creating `docs/`, ADRs, or agent files not requested by the task.
- Modifying `.opencode/` except when the task is explicitly about agent/SDLC configuration.

### Unsafe changes (reject or escalate)

- Disabling `DecryptRequestGuard`, `SanitizeMiddleware`, `ThrottlerGuard`, or CORS in production paths.
- `synchronize: true` or dropping tables/columns without approved migration and backup plan.
- Logging sensitive fields or returning stack traces to clients in prod.
- Hardcoding credentials or encryption keys.
- Skipping role checks for finance, admin, or MIS endpoints.
- Force-push, `--no-verify`, or amending others’ commits without explicit user instruction.
- Running `migration:run` against shared/production databases without explicit instruction.

### Unnecessary changes (avoid)

- Wrapping one-liners in new shared utilities.
- Adding interfaces/types unused by the task.
- Duplicate DTOs when extending existing DTOs suffices.
- New dependencies for functionality already in `src/utils/` or `src/helpers/`.
- Tests that only assert mocks were called without behavior assertion.

### Approval gates

| Change type | Gate |
|-------------|------|
| Schema / migration | Task must include DB impact; migration file named and reviewed. |
| New npm dependency | Explicit in task or user approval in thread. |
| Auth / encryption / global middleware | Security-sensitive — document rationale in handoff. |
| Payment or refund logic | Requires test evidence and peer module review. |
| SFDC field mapping | Confirm against interface in `sfdc` / `eoi_manager` modules. |
| Production workflow | User must request; do not alter `.github/workflows/main.yml` casually. |

---

## Agent metadata

```yaml
name: governance-agent
description: Enforces Puravankara Engine backend governance, security, and change boundaries for AI-driven SDLC.
references:
  - .opencode/agents/_sdlc-rules.md
  - README.md
  - package.json
priority: mandatory
applies_to:
  - src/**
  - test/**
  - src/migrations/**
```

When any instruction conflicts with this file or `_sdlc-rules.md`, **pause and report the conflict** instead of guessing.
