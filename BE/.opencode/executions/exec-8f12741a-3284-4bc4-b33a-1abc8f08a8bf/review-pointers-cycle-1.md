# Review Pointers — PB-189 (Cycle 1)

## Scope Reviewed
- `src/modules/email_templates/email_templates.service.ts` (modified — current on-disk hash `11618c06`)
- `src/modules/email_templates/email_templates.service.spec.ts` (new)
- `docs/ai/stories/PB-189/spec.md` (new — story_analyzer artifact, expected per handoff)
- `docs/ai/stories/PB-189/implementation-plan.md` (new — implementation_planner artifact, expected per handoff)
- `.opencode/executions/exec-8f12741a-3284-4bc4-b33a-1abc8f08a8bf/{final-summary.md,review-pointers-cycle-1.md,working-tree.diff}` (orchestrator artifacts)

## Snapshot Note
The `.opencode/.../working-tree.diff` artifact shows file hash `e948368b` (older `new Logger(EmailTemplatesService.name)` + `this.logger.warn` variant), while the live `email_templates.service.ts` is at `11618c06` (project winston `logger.warn`). The budgeted "Selected Diff" matches the live file, so this review is conducted against the on-disk implementation, not the stale `.opencode` diff snapshot.

## AC Verification (against current on-disk code)
- **AC1 (no render / dispatch / throw on disabled)**: `renderEmail()` short-circuits at `src/modules/email_templates/email_templates.service.ts:197-210` with the `SkippedEmail` shape *before* `renderPlaceholders` / `applyLayout`. `composeEmail()` early-returns at `email_templates.service.ts:63-69`, ahead of the `if (recipients?.to)` block (`:71-88`), so `eventEmitter.emitAsync(SEND_EMAIL, …)` is never reached. Covered by `composeEmail — AC1 & AC3 disabled template` (`email_templates.service.spec.ts:100-125`).
- **AC2 (warn log)**: Single `logger.warn(...)` at `email_templates.service.ts:199-201` includes `event=`, `templateId=`, `templateName=`, and the literal `disabled`. `logger` is the winston instance from `src/logger/logger.ts:40-48` (which exposes `.warn`). Covered by `composeEmail — AC2 warning log on disabled` (`email_templates.service.spec.ts:127-146`) via `jest.spyOn(logger, 'warn')`.
- **AC3 (skipped envelope)**: `composeEmail` returns `{ statusCode: SUCCESS, message: 'Email template is disabled. Email sending was skipped.', data: { skipped: true, reason: 'template_disabled', event, templateId, templateName, message } }` (`email_templates.service.ts:63-69` + `:202-209`), aligned with the `{ statusCode, message, data }` envelope used by every other method in this service.
- **AC4 (active path unchanged)**: Active branch still runs `renderPlaceholders` + `applyLayout` and returns `{ subject, body: finalBody }` (`email_templates.service.ts:212-225`); the recipients dispatch path (`:71-88`) is untouched. Covered by both `AC4 active template` cases (with and without recipients). The "with recipients" case asserts `eventEmitter.emitAsync` was invoked once with `EventMessagesEnum.SEND_EMAIL`.
- **AC5 (not-found still throws)**: `getTemplateByEvent` throws `NotFoundException` (`email_templates.service.ts:147-151`); the pre-existing `composeEmail` `try/catch` re-throws as `NotFoundException` (`:94-96`). Covered by `composeEmail — AC5 template not found` (`email_templates.service.spec.ts:148-160`).
- **AC6 (existing tests still pass + new coverage)**: `EmailTemplatesService` public surface is unchanged — `composeEmail` still typed `Promise<any>`, no new public methods, no constructor signature change — so `email_templates.controller.spec.ts` (which mocks the whole service) is unaffected. The new spec adds active (with/without recipients), disabled, not-found, and `renderEmail` union-return cases.

## Type Discrimination Check
- `RenderedEmail = { skipped?: false; subject; body }` and `SkippedEmail = { skipped: true; ... }` (`email_templates.service.ts:22-30`) form a valid discriminated union; the `emailContent.skipped === true` narrowing at `:63` correctly types the remainder of `composeEmail` as `RenderedEmail`, so `emailContent.subject` / `emailContent.body` at `:76-78` are type-safe.
- Strict `=== false` check at `email_templates.service.ts:197` preserves the legacy active path for `undefined` / `null` / `true`, matching the spec's "Implementation Notes" requirement. Confirmed against `EmailTemplate.isActive` (default `true`) at `src/modules/email_templates/entities/email_template.entity.ts:26-27`.

## Caller Impact Check
- Only `src/modules/email_templates/email_templates.controller.ts:53-78` consumes `composeEmail()` (test endpoint + `@OnEvent(COMPOSE_EMAIL)` handler). Neither branches on the response shape — they only forward/return it — so the additive `skipped: true` / `data.skipped` field is backward compatible.

## Extra Changed Files Not In Plan — Reviewed
- `docs/ai/stories/PB-189/spec.md` — `story_analyzer` output referenced by both planner and code-implementer handoffs. Expected, not scope creep.
- `docs/ai/stories/PB-189/implementation-plan.md` — `implementation_planner` primary artifact. Expected, not scope creep.
- `.opencode/executions/exec-8f12741a-3284-4bc4-b33a-1abc8f08a8bf/final-summary.md`, `review-pointers-cycle-1.md`, `working-tree.diff` — SDLC orchestrator artifacts produced by this execution. Expected, not scope creep. The `review-pointers-cycle-1.md` and `final-summary.md` snapshots describe the prior `e948368b` variant; this review supersedes them with the current `11618c06` reality.

No accidental edits, generated/build artifacts, or unrelated module changes detected.

## Findings

Findings: None

## Non-blocking Observations (informational, not must-fix)
1. **Logger pattern deviates from spec/plan wording**: The spec NFR (`docs/ai/stories/PB-189/spec.md:56`) and the plan's Step 1 (`docs/ai/stories/PB-189/implementation-plan.md`) both call for `new Logger(EmailTemplatesService.name)` from `@nestjs/common`. The implementer instead used the project's winston singleton via `import { logger } from '../../logger/logger'` (`email_templates.service.ts:20`, `:199`). Functionally this still satisfies AC2 (`warn` level, all required fields, no `console.log`) and is actually the more prevalent pattern in this repo (~15 services import the winston `logger` vs. ~5 using Nest `Logger`), so it's consistent with the wider codebase convention. Flagged here only because it diverges from the explicit spec/plan choice — auto-fix is not required.
2. **`templateName` is the unrendered template subject** (e.g. `Welcome {NAME}`) at `email_templates.service.ts:198` and propagated into both the warn log and the skipped envelope. This satisfies AC2 ("template name and/or subject … if available") and matches the plan's `name ?? subject` fallback (the `EmailTemplate` entity has no `name` column — `entities/email_template.entity.ts:9-34`), but log/payload consumers will see literal placeholder syntax. Acceptable as-is per the plan.
3. **Active-path tests exercise real disk I/O**: `composeEmail — AC4 active template` runs through `applyLayout`, which calls `fs.readFileSync('src/templates/email_layouts/default.html', 'utf-8')`. The file exists (`src/templates/email_layouts/default.html`), so the test is stable on this checkout, but the spec is therefore not a strict unit test — it depends on the layout file remaining present. Not flagged as a finding since it predates this story's scope.
4. **`composeEmail`'s `try/catch` masks all errors as `NotFoundException`** (`email_templates.service.ts:94-96`) — this is pre-existing behavior, not introduced by this change, and the spec/plan explicitly leaves the not-found path unchanged. Noted for awareness only.
