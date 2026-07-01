# Story Spec: PB-189 — Disable Email Trigger

## Summary
Refactor the email composition flow so that email templates can be disabled via an `isActive` flag. When a template is disabled, the system must skip rendering and sending the email silently (no exception), log a warning with traceable details, and return a successful response indicating the send was skipped.

## Background / Current Behavior
- `composeEmail()` calls `renderEmail()`.
- `renderEmail()` fetches the template using `getTemplateByEvent(event)`.
- If the template is not found, an error is thrown.
- If the template is found, the email is rendered and optionally sent.

There is currently no concept of a disabled template — every existing template is treated as active.

## Scope
- File primarily affected: `src/modules/email_templates/email_templates.service.ts`
- Any callers of `composeEmail()` / `renderEmail()` that consume the return value (must continue to work with a "skipped" success response).
- Template entity / model where `isActive` is defined (read-only assumption: the flag already exists on the template; if it does not, surface as an Open Question).

Out of scope:
- UI / admin surface to toggle `isActive`.
- DB migration to add `isActive` (assumed to already exist — see Open Questions).
- Changing the not-found behavior (still throws).

## Functional Requirements

1. **Read `isActive` from the template**
   - After `getTemplateByEvent(event)` returns a template, inspect its `isActive` property.

2. **Template not found**
   - Preserve current behavior: throw the existing error. No change.

3. **Template found and `isActive === false` (disabled)**
   - Do NOT render the email.
   - Do NOT send the email.
   - Do NOT throw any exception.
   - Log a **warning** (via the standard Nest `Logger`) that includes, at minimum:
     - the `event` name
     - the template `id` (if available)
     - the template `name` and/or `subject` (if available)
     - a clear message stating that the email template is disabled and email sending was skipped.
   - Return a successful response object indicating the send was skipped because the template is disabled.

4. **Template found and `isActive === true` (or flag effectively truthy)**
   - Preserve current behavior: render and optionally send the email.

## Acceptance Criteria

- **AC1**: Given a request that resolves to a template where `isActive === false`, when `composeEmail()` is invoked, then `renderEmail()` does not render and does not dispatch the email, and no exception is thrown.
- **AC2**: Given a disabled template, when the flow runs, then a warning log is emitted containing the event name, template id (if present), template name/subject (if present), and a message indicating the email was skipped because the template is disabled.
- **AC3**: Given a disabled template, when the flow completes, then `composeEmail()` returns a successful response payload that clearly indicates the email was skipped due to the template being disabled (status flag and/or message; structure aligned with the repo's `success-response-errors` envelope).
- **AC4**: Given a template where `isActive === true`, the existing render and send behavior is unchanged.
- **AC5**: Given the template lookup returns no template (not found), the existing error is still thrown — behavior unchanged.
- **AC6**: Existing unit/integration tests for `composeEmail()` / `renderEmail()` continue to pass; new tests cover the disabled path (AC1–AC3) and the not-found path (AC5).

## Non-Functional Requirements
- Logging uses the existing Nest `Logger` pattern used elsewhere in the service; no `console.log`.
- No new external dependencies.
- Backward compatible: callers that previously received a successful render/send response continue to receive a successful response shape; only the content differs in the skipped case.
- Performance: no extra DB calls beyond what is already done in `getTemplateByEvent`.

## Implementation Notes
- Centralize the disabled check inside `renderEmail()` (or a small private helper) so any caller of `renderEmail()` — including `composeEmail()` — benefits.
- Treat `isActive` strictly: only `isActive === false` triggers the skip path. If `isActive` is `undefined` / `null`, default to the legacy active behavior to avoid silently breaking templates that predate the flag (call out in Assumptions; confirm via Open Question if uncertain).
- Suggested return shape for the skipped case (final shape to be confirmed against the repo's response convention):

```ts
{
  skipped: true,
  reason: 'template_disabled',
  event,
  templateId: template?.id,
  templateName: template?.name ?? template?.subject,
  message: 'Email template is disabled. Email sending was skipped.',
}
```

- Warning log example (final wording at implementer's discretion, must include the fields listed in AC2):

```
[EmailTemplatesService] Email template is disabled. Skipping email send. event=<event> templateId=<id> templateName=<name|subject>
```

## UI Notes
None — this is a backend-only repository (`repositoryRole: backend-api-only`).

## Assumptions
- The template entity already exposes an `isActive: boolean` field. If it does not, a schema/migration change is required and is out of scope for this story (raise via Open Questions).
- Missing/undefined `isActive` is treated as active (legacy behavior) to keep existing templates working without backfill.
- Callers of `composeEmail()` treat the response as informational and do not branch on a specific "sent" boolean today; adding a `skipped` flag is additive and safe.
- The repo's standard success response envelope (`success-response-errors`) is applied at the controller layer, so the service can return the plain object above.

## Open Questions
- Does the template entity already have an `isActive` column/field? If not, a migration plus model update is needed before this story can be implemented end-to-end.
- Should the "skipped" response also be surfaced to API consumers with a distinct HTTP semantic (still 200, but with a `skipped` flag in the body) or simply be transparent? Default assumption: 200 + `skipped: true` in body.
- Are there callers that rely on `composeEmail()` returning a specific shape (e.g., message id from the provider)? If yes, confirm the skipped response shape will not break them.
- Should an audit/metric event be emitted in addition to the warning log? Default assumption: warning log only.

## References / Files to Open Only If Needed
- `src/modules/email_templates/email_templates.service.ts` — primary file to modify (`composeEmail`, `renderEmail`, `getTemplateByEvent`).
- Template entity under `src/modules/email_templates/` — to confirm `isActive` field and its type.
- Existing tests under `src/modules/email_templates/` (or `test/`) — to extend with disabled-template coverage.
- `docs/ai/project-context.md` and `docs/ai/context-map.json` — only if the response envelope or logging conventions need confirmation.
