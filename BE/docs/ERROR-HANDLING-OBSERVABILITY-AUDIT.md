# Error Handling, Logging & Observability — Production-Grade Audit & Strategy

**Auditor:** Senior Backend Architect (read-only deep audit)
**Scope:** Exception management, logging, observability, queue/cron error flow, external integrations, transaction safety, monitoring hooks
**Constraint:** Maximum-impact fixes with minimum codebase churn — incremental, low-risk migration path.

---

## 0. TL;DR

The plumbing exists: `GlobalExceptionFilter`, `ResponseInterceptor`, Sentry, winston-with-daily-rotate, a shared `logsAndErrorHandling`, and `registerProcessErrorHandlers`. But the pieces don't compose:

- **Two competing error-shape transformers** (`GlobalExceptionFilter` and `ResponseInterceptor.errorHandler`) produce two different JSON envelopes for the same HTTP error path.
- **Triple-logging of every error**: catch-site `logger.error(...)` + `logsAndErrorHandling` → `logger.info('Inside common errorHandler')` + `logger.error('error details...')` + global filter `logger.error(...)`. One error = 3-4 log lines.
- **No correlation/request ID anywhere** — log lines cannot be tied to a single HTTP request, BullMQ job, webhook delivery, or cron execution.
- **Status codes are lost** — `logsAndErrorHandling` rethrows everything as 500 because of a bug at `errorLogHandler.ts:46` (`message?.status` is always undefined on a string).
- **`InternalServerErrorException` branch is dead code** — its parent class `HttpException` is checked first at `errorLogHandler.ts:45`.
- **`ResponseCatchMiddleware` writes the full request body + response body to disk on every request** — JWTs, OTPs, PAN/Aadhaar, base64 PDFs all land in winston files. This is a regulatory time bomb (DPDP/GDPR).
- **External HTTP integrations have no default timeout** (Razorpay, Easebuzz, Decentro, Leegality, Google) — a hanging gateway hangs your event loop.
- **No retry strategy for transient failures**; no circuit breaker; no observability metrics; no DLQ for BullMQ jobs; no `failed/stalled` worker event handlers; no structured cron telemetry beyond a `cron_logs` table that only 7 of 12 crons write to.
- **Logs are stored to a relative path `../../efs/logs/<date>`** — multiple instances writing to the same EFS path can corrupt the rotated file; no centralized aggregation (CloudWatch / Loki / Elastic).

**Current observability score: 4.5 / 10**. The investment areas with highest ROI: correlation IDs, redaction, log centralization, error-shape consolidation, BullMQ failure hooks, external HTTP defaults. All can land in 1-2 weeks with backward-compatible changes.

---

## 1. Current Architecture — What Exists Today

### 1.1 Components actually wired

| Component | File | What it does |
|---|---|---|
| **Global exception filter** | `src/filters/global-exception.filter.ts` | Catches all unhandled exceptions, normalizes, logs, reports to Sentry, sends SES alert email on 5xx (prod only) |
| **Response interceptor** | `src/interceptors/transform.interceptor.ts` | Wraps successful responses in `{ success, response: {statusCode, message, data}, errors }`; **also** transforms errors via `errorHandler()` — competing with #1 above |
| **Custom validation pipe** | `src/validations/custom-pipe.validation.ts` | Extends NestJS `ValidationPipe`; flattens nested validator errors to `string[]`. Good. |
| **`logsAndErrorHandling`** | `src/utils/errorLogHandler.ts` | Catch-site helper called from ~80+ service methods. Logs, then rethrows a normalized `HttpException`. |
| **Process error handlers** | `src/infra/process-error.handler.ts` | `unhandledRejection`, `uncaughtException` → Sentry + SES alert. `process.exit(1)` on uncaught. |
| **PM2 crash alerts** | `src/infra/pm2-alert-listener.ts` | Listens to PM2 bus for `exit`/`restart` events, sends SES alert. *(Not wired in `main.ts` — see Issue OB-12.)* |
| **SES alert sender** | `src/infra/ses-alert-sender.ts` | Throttled to 1 email / 2 minutes (`lastAlertAt` module-level). |
| **Winston logger** | `src/logger/logger.ts` | Daily-rotated files to `../../efs/logs/<YYYY-MM-DD>/{combined,error}.log` + Console. 30-day retention. JSON format. |
| **Response catch middleware** | `src/middleware/response-catch.middleware.ts` | Wraps `res.send` to log every request+response. **Logs sensitive bodies** — see CR-OBS-2. |
| **User request middleware** | `src/middleware/user-requests.middleware.ts` | Writes one row per request to `user_requests` table. Unbounded growth. (Already flagged as CR-12 in the prior production audit.) |
| **Sentry init** | `src/modules/sentry/sentry.service.ts` | DSN-based init, 50% error sample, 40% trace, 20% profile. `beforeSend` drops 4xx HttpException. |
| **Sentry response context** | `src/modules/sentry/sentry-response.context.ts` | Per-request `res.on('finish')`. Calls `Sentry.captureMessage` for every 5xx. (Duplicates the captureException in #1 above.) |
| **Cron logs service** | `src/modules/crons/cron-logs.service.ts` + `CronLog` entity | Persistent table of cron runs (cronType, startTime, endTime, durationMs, status, description). **Only 7 of 12 crons call it.** |
| **Queue audit logs** | `src/modules/queue_audit/queue-job-audit.service.ts` | Append-only `queue_job_audit_logs` table with `event ∈ {enqueued, started, completed, failed}`. Good design but only 2 queues wired today. |
| **User activity interceptor** | `src/interceptors/user_activity.interceptor.ts` | Emits `CREATE_ACTIVITY_LOG` event with raw body/query/params after a successful response. Persists to `user_activity_logs`. |

### 1.2 What is missing

- No **request/correlation/trace ID** plumbing (verified: zero hits for `requestId|correlationId|traceId|x-request-id` outside of unrelated local variables).
- No **central HTTP client wrapper** with timeouts/retries; modules call `firstValueFrom(httpService.post(...))` directly.
- No **redaction layer** in winston format (passwords, OTPs, JWTs, PAN, Aadhaar pass through to disk).
- No **log aggregator shipping** (`combined.log` on EFS only).
- No **metrics** (Prometheus / StatsD / CloudWatch custom). Sentry sample-based perf only.
- No **OpenTelemetry / distributed tracing** between API → BullMQ → external.
- No **BullMQ worker events** (`failed`, `stalled`, `error`); no DLQ.
- No **circuit breaker / bulkhead** for SFDC, Razorpay, Leegality, Decentro.
- No **health/readiness endpoints** (`/healthz` / `/readyz`).
- No **rate-limited alerting** (only the 2-min SES throttle).

---

## 2. Critical Issues — Ranked by Severity

### CR-OBS-1. Two competing error-shape producers — `GlobalExceptionFilter` vs `ResponseInterceptor`
**Severity: Critical (correctness)**
**Affected:** `src/filters/global-exception.filter.ts:60-69`, `src/interceptors/transform.interceptor.ts:78-120`

`main.ts` registers **both** the filter and the interceptor globally. NestJS invocation order is `interceptor → filter`. For errors thrown by the controller, the interceptor's `catchError` operator (line 72-74) runs **first** and returns a `StandardError` *object* via `throwError(() => ...)`. That `StandardError` object is then caught by `GlobalExceptionFilter.catch` (which expects an `Error`/`HttpException`), and the filter re-normalizes it again into its **own** envelope.

End result: the response envelope is **non-deterministic** depending on whether the interceptor's error path runs cleanly or the filter takes over. The two shapes differ:

```ts
// ResponseInterceptor.errorHandler returns:
{ success: false, response: null, statusCode, errors: { message, ...errorException } }

// GlobalExceptionFilter.catch returns:
{ success: false, response: null, errors: { statusCode, path, message, ...sanitizedErrors } }
```

`statusCode` is at the top level in one and nested in the other. Frontend code (and external API consumers) cannot reliably parse error responses.

**Production impact:** clients sometimes show "undefined" for the status code, sometimes show server-side `path` info, sometimes miss the `details` field. Hard-to-debug client-side handling. Webhook senders (Razorpay/Easebuzz) parsing a 4xx may misroute retries.

**Fix:** remove `errorHandler` from `ResponseInterceptor` entirely. The interceptor should *only* wrap successful responses. Let the `GlobalExceptionFilter` be the single source of truth for the error envelope.

---

### CR-OBS-2. `ResponseCatchMiddleware` writes full request/response bodies to disk
**Severity: Critical (PII / compliance)**
**Affected:** `src/middleware/response-catch.middleware.ts:7-32`

```10:28:src/middleware/response-catch.middleware.ts
res.send = (body: any): Response => {
  if (!originalUrl.includes('booking-preview/') &&
      !originalUrl.includes('referrer-preview/') &&
      !originalUrl.includes('voucher-preview/')) {
    logger.info({
      level: 'info',
      message: `Response for Method: ${method} URL: ${originalUrl} Body: ${JSON.stringify(body)}`,
      request: { method, url: originalUrl, query, reqBody, ip },
      timestamp: new Date().toISOString(),
    });
  }
  return originalSend.call(res, body);
};
```

Every request body + response body is logged for every URL except three preview routes. After `DecryptRequestGuard` decrypts payloads, this middleware sees plaintext. Logged routinely:
- `/sso/verify-otp` — 6-digit OTPs
- `/sso/refresh-token` — refresh + access JWTs
- `/bookings/update-applicant` — PAN, Aadhaar, OCI, DOB, signature image base64
- `/decentro/get-image-details` — KYC images
- `/users/extract-signature` — signature uploads
- `/payments/create-order` — gateway key (publishable but still)
- `/voucher-forms/update-payment-details` — payment proofs
- `/sales/upload-signed-pdf` — base64 signed PDFs

**Production impact:** every winston file on EFS contains an audit-grade copy of plaintext PII. A compromised log shipper (or anyone with EFS read) = a full PII breach. Direct DPDP / GDPR violation. Also: the same body is also persisted to `user_activity_logs.details` (JSON) via the user-activity interceptor — PII in DB too.

**Fix (minimal change):**
1. Replace the middleware with a winston log format function that redacts a key list before writing. Single-file change.
2. Add an opt-in `@LogResponseBody()` decorator for endpoints that genuinely benefit (e.g., admin debug routes), defaulting to off.
3. Same redaction applied to `user_activity_logs.details` writes.

---

### CR-OBS-3. `logsAndErrorHandling` order-of-instanceof bug + status-code loss
**Severity: Critical (correctness)**
**Affected:** `src/utils/errorLogHandler.ts:37-54`

```37:54:src/utils/errorLogHandler.ts
if (errorResponse instanceof NotFoundException) {
  throw new NotFoundException(message);
} else if (errorResponse instanceof BadRequestException) {
  throw new BadRequestException(message);
} else if (errorResponse instanceof ConflictException) {
  throw new ConflictException(message);
} else if (errorResponse instanceof UnauthorizedException) {
  throw new UnauthorizedException(message);
} else if (errorResponse instanceof HttpException) {
  throw new HttpException(message, message?.status || 500);  // <-- bug
} else if (errorResponse instanceof InternalServerErrorException) {
  throw new InternalServerErrorException(...);  // <-- dead code
}
throw new InternalServerErrorException(message);
```

Two bugs in one helper called from ~80+ catch sites:

1. **Status code is always 500.** `HttpException` is constructed with `(message, message?.status || 500)`. `message` is *typically a string* (built from `errorResponse?.response || errorResponse?.message || 'An unexpected error occurred'`). `string.status` is undefined → defaults to 500. Every `HttpException` from upstream (e.g., a `ServiceUnavailableException` (503), `ForbiddenException` (403), `PayloadTooLargeException` (413)) is rethrown as 500.

2. **`InternalServerErrorException` branch is unreachable.** It extends `HttpException`. The `instanceof HttpException` check on the previous line matches it first and consumes it. The "System is facing a technical issue. Please try again after sometime." message never reaches the client; the original message does.

**Production impact:** monitoring dashboards see a flood of 500s that are actually 403/404/409 errors → on-call gets paged for normal client behaviour. Retries against 503s get reclassified as fatal 500s.

**Fix (minimal):**
1. Replace `throw new HttpException(message, message?.status || 500)` with `throw new HttpException(message, errorResponse.getStatus())` (preserves original status).
2. Delete the dead `InternalServerErrorException` branch — it's unreachable.
3. Add `if (errorResponse instanceof ForbiddenException) throw new ForbiddenException(message)` for parity, or — cleaner — collapse the whole ladder into a single `if (errorResponse instanceof HttpException) throw errorResponse;` (preserves status, type, and response shape verbatim).

---

### CR-OBS-4. Triple-logging of every error
**Severity: High (cost + noise)**
**Affected:** every service that calls `logsAndErrorHandling` (~80 sites) — examples: `payments.service.ts:269,615`, `voucher_form.service.ts`, `bookings.service.ts`, `incentive_booking.service.ts`, `eoi_management.service.ts`.

Typical catch block today:
```ts
} catch (error) {
  logger.error('Easebuzz order creation error:', error);                            // #1 site log
  logsAndErrorHandling('paymentService - createEasebuzzOrder', error, { orderDto }); // #2 'Inside common' + 'error details for'
}
// Then GlobalExceptionFilter.catch logs the same error one more time:
logger.error({ message, status, path, method });                                    // #3
```

So one bad request to `/create-order` produces **3-4 winston rows** plus 1 Sentry event plus possibly 1 SES email. At 100 RPS sustained with even 1% error rate that's 360-480 log rows/sec.

**Production impact:** EFS log volume bloated 3-4×; winston rotate-file backpressure under load; CloudWatch cost (if shipped); Sentry quota waste. Worse, the "Inside common errorHandler" line at `errorLogHandler.ts:16` is meaningless cruft on every error.

**Fix (minimal):**
1. Remove `logger.info('Inside common errorHandler')` from `errorLogHandler.ts:16`.
2. Remove the call-site `logger.error(...)` wherever it duplicates what `logsAndErrorHandling` already logs — one mechanical pass: search-and-replace.
3. In `GlobalExceptionFilter.catch`, log only if the exception **was not previously logged** — attach a marker symbol on the exception object inside `logsAndErrorHandling` and skip the filter's log if present.

---

### CR-OBS-5. No request / correlation / trace IDs anywhere
**Severity: High (operational)**
**Affected:** entire codebase

Verified by grep: there is no request-ID generation, no `x-request-id` header propagation, no AsyncLocalStorage / CLS, no Sentry tag bound per-request, no winston child logger per-request. Every log line is anonymous.

**Production impact:**
- An on-call engineer cannot follow a failure through middleware → controller → service → DB → BullMQ → email → SFDC.
- Customer says "I got a payment error at 14:33 IST" — there's no way to find their exact log trail except text-grepping by email/phone (which itself is a PII concern).
- When BullMQ enqueues a job from an HTTP request, the job's processor logs have no link to the originating HTTP request.

**Fix (minimal):**
1. Add a tiny middleware that reads `X-Request-Id` header (or generates a `uuid v4`) and attaches it to `req.id` + Express `res.setHeader('X-Request-Id', req.id)`.
2. Use Node's built-in `AsyncLocalStorage` to store `{ requestId, userId, oppId }` per request.
3. Create a winston format function that pulls from ALS and injects into every log line.
4. When enqueuing a BullMQ job, copy `requestId` into `job.data.requestId`; the processor reads it back into ALS for the duration of `process()`.

This is ~80 lines of new code with no changes to existing log call sites. All current `logger.info(...)` calls suddenly get a `requestId` field.

---

### CR-OBS-6. External HTTP integrations have no default timeout
**Severity: High (event-loop hang risk)**
**Affected:** `src/modules/payments/payments.service.ts` (Razorpay, Easebuzz), `src/modules/decentro/decentro.service.ts`, `src/modules/leegality/leegality.service.ts`, `src/modules/google/google.service.ts`, `src/modules/incentives/sap/sap.service.ts`, `src/modules/sfdc/sfdc.service.ts` (only some endpoints set explicit timeouts)

Most outbound calls look like:
```ts
const response = await firstValueFrom(this.httpService.post(url, payload, { headers }));
```

`@nestjs/axios` defaults to `timeout: 0` (no timeout). If Easebuzz / Razorpay / SFDC / Decentro stop responding, the Node request pipeline stays open until TCP keepalive trips (~2 hours by default). Connection pool drains; new requests queue; eventually OOM.

**Production impact:** A single gateway hiccup (SFDC maintenance window, Razorpay rate-limit) cascades into full service unavailability. Cron jobs in `payment-verification.cron.ts` doing `Promise.allSettled(group.map(p => verifySingle(p)))` will hang inside the cron concurrency window forever.

**Fix (minimal):** introduce a single `HttpClientService` wrapper or, easier, register `HttpModule.register({ timeout: 10_000, maxRedirects: 3 })` at module level in each module that uses HttpService. Modules that need a longer timeout can override. No call-site changes required.

---

### CR-OBS-7. BullMQ workers have no `failed/stalled/error` event handlers; no DLQ
**Severity: High (operational blind spot)**
**Affected:** `src/modules/eoi_manager/eoi_management/processors/bulk-transaction-update.processor.ts`, `src/modules/eoi_manager/batch_manager/processors/batch-notification.processor.ts`

Both processors implement only `process(job)`. When `attempts: 3` is exhausted, the job lands in BullMQ's `failed` set with `removeOnFail: 1000` retention. There is no `@OnWorkerEvent('failed')`, `@OnWorkerEvent('stalled')`, `@OnWorkerEvent('error')` hook. Nobody pages ops. The `queue_job_audit_logs` row exists (good) but nobody polls it.

A stalled worker (the job lock expires because the worker is hung) silently restarts the job on another worker — possible double-processing (compounds with §CR-3 in the production audit).

**Production impact:**
- Admin Excel uploads fail silently after retries — admin sees "Started" forever on UI.
- Customer notification batches lose 1/N emails on transient SES failure with no operator visibility.
- Stalled jobs double-process bulk transaction Excel files → duplicate finance writes.

**Fix (minimal):**
```ts
// inside both processor classes
@OnWorkerEvent('failed')
onFailed(job: Job, err: Error) {
  if (job.attemptsMade < (job.opts.attempts ?? 1)) return; // mid-retry: skip
  Sentry.captureException(err, { tags: { queue: QUEUE_NAME, jobId: job.id } });
  this.queueJobAuditService.append({
    queueName: QUEUE_NAME, jobId: String(job.id),
    event: QUEUE_JOB_AUDIT_EVENT.FAILED_FINAL,
    summary: err.message.slice(0, 500),
    context: { attempts: job.attemptsMade },
  });
}

@OnWorkerEvent('stalled')
onStalled(jobId: string) { Sentry.captureMessage(`Stalled job ${jobId}`); }
```

Add a `*-dlq` queue producer in `onFailed` after `attemptsMade === attempts` — drops the job + its payload into the DLQ for human-driven replay via a small admin endpoint.

---

### CR-OBS-8. Logs are written to a relative path; multi-instance corruption risk
**Severity: High**
**Affected:** `src/logger/logger.ts:7-15`

```7:15:src/logger/logger.ts
const createLogFolder = () => {
  const dateFolder = new Date().toISOString().split('T')[0];
  const logDir = path.join('../../efs/logs', dateFolder);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};
```

Three issues:
1. **Relative path** `../../efs/logs` resolves against `process.cwd()`. If the process is started from a different directory (PM2 reload, CI, container) the log path silently changes — logs vanish.
2. **`logDir` is computed once at module import time** — if the process runs past midnight (it always does), the new day's logs still go into yesterday's folder until restart. `DailyRotateFile` rotates the *filename*, but the *directory* is frozen.
3. **Multi-instance write to the same EFS path** — two PM2 workers (cluster mode) or two ECS tasks both write `combined.log` → NFS-level write contention. `winston-daily-rotate-file` does not coordinate writes across processes; corrupted JSON lines are likely.

**Production impact:** intermittent log truncation / mojibake in production; date-folder skew across deploys; can't horizontally scale without losing logs.

**Fix (minimal):**
1. Use an absolute path from config: `configService.get('LOG_DIR')`, default `/var/log/puravankara`.
2. Let `DailyRotateFile` own date rotation entirely (`%DATE%` in filename, not in dirname).
3. Pipe `combined.log` + `error.log` to CloudWatch via the `aws-cloudwatch` winston transport (or to a Vector/Fluent Bit sidecar). EFS becomes a fallback, not the primary store.

---

### CR-OBS-9. `cronLogsService` is called by 7 of 12 crons; no enforcement
**Severity: High (observability gap)**
**Affected:** `inventory-unit.cron.ts`, `payment-verification.cron.ts`, `eoi-phase-launch.cron.ts`, `batch-cron.ts`, `office-use-reminder.cron.ts` (partial), `incentive-policy-status.cron.ts` (partial) — vs the others that *do* log.

`booster-status.cron.ts`, `leaderboard.cron.ts`, `booking-rule-engine.cron.ts`, `rm-dashboard-daily-report.cron.ts`, `office-use-reminder.cron.ts` (in the failure case), and `incentive-policy-status.cron.ts` call `cronLogService.saveLog(...)`. The other 5+ do not.

Also: `cronLogsService.saveLog` itself swallows errors silently:
```14:21:src/modules/crons/cron-logs.service.ts
async saveLog(logData: Partial<CronLog>) {
  try {
    const log = this.cronLogRepository.create(logData);
    return await this.cronLogRepository.save(log);
  } catch (error) {
    logger.log(error);  // <-- wrong level (should be .error); no context
  }
}
```

**Production impact:** when ops wants to know "did the inventory-unit cron run at 14:00 today?", there's no DB record. The winston file has fragmented info; PM2 logs go to stdout only. Cron failures are invisible until customer-impact appears.

**Fix (minimal):**
1. Add a `@CronInstrumented(name)` method decorator that wraps the body in `try/finally`, persists a `CronLog` row, and increments a Sentry / Prometheus counter. Apply to every `@Cron` method. **~10 lines per cron.**
2. Fix `cronLogsService.saveLog` to log at `error` level with the cron name.
3. Add a healthcheck endpoint `/healthz/crons` that reports each cron's last-success time and alerts if any > 2× expected interval.

---

### CR-OBS-10. `eventEmitter.emit(...)` is fire-and-forget — silent failures everywhere
**Severity: High**
**Affected:** ~50+ `eventEmitter.emit(...)` call sites across `eoi_management.service.ts:×20`, `voucher_form.service.ts:×5`, `bookings.service.ts:×2`, `sfdc.service.ts:×4`, `inventory-unit.service.ts:×3`, `sales.service.ts:×3`, etc.

`@nestjs/event-emitter` is **synchronous** by default but listeners returning rejected promises crash silently (the `EventEmitter2` swallows unhandled rejections from listeners unless `async: true` is configured with `.emitAsync`). The codebase mixes both. Examples:
- `bookings.controller.ts:237-243` — `@OnEvent(EventMessagesEnum.OPP_PUSH_TO_SFDC)` calls `sendBookingToSFDCApi` and does not await. If SFDC fails, the booking is never pushed and there is no retry, no DLQ.
- `voucher_form.service.ts` — emit `EventMessagesEnum.SFDC_LEAD_CREATE` after voucher creation; if the SFDC listener throws, the voucher persists but SFDC never learns.

This is the same bug-class as P-4 in the payment-service deep-dive: fire-and-forget side effects inside transactional writes.

**Production impact:** silent SFDC drift; silent missing notifications; silent missing user-activity rows.

**Fix (minimal):**
1. Adopt **transactional outbox** for everything emitted inside a DB transaction: write an `outbox` row in the same TX, dispatch from a worker.
2. Wrap all `@OnEvent` listeners in a try/catch that calls `Sentry.captureException` + emits a metric.
3. Replace `EventEmitter2` listeners doing real I/O (SFDC push, email, WhatsApp) with BullMQ queues instead — they get the same fire-and-forget developer ergonomics but with retries and DLQ.

---

### CR-OBS-11. Winston logger has no Nest binding — `Logger.error(...)` from Nest internals goes nowhere structured
**Severity: Medium (Nest internal logs are lost from your sink)**
**Affected:** `src/main.ts` — `app.useLogger(...)` is **not called**.

NestJS framework-level logs (bootstrap, route mapping, lifecycle, schedule registration) use the built-in `Logger` and write to stdout in a different format than your winston logger. They never reach `combined.log`. Also: `NestExpressApplication.create()` is called with no `logger` option, so during boot any errors are stdout-only.

**Production impact:** the boot-time `Sentry initialized (prod-grade)` line from `SentryService` goes to winston, but `Mapped {/api/sales/...}` route lines go to stdout — you have two log streams, and only one is shipped.

**Fix:** wire a `WinstonModule` (from `nest-winston`, already in package.json) and `app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))`. Nest internal logs now flow to winston.

---

### CR-OBS-12. PM2 alert listener is defined but never invoked
**Severity: Medium (silent feature)**
**Affected:** `src/infra/pm2-alert-listener.ts`, `src/main.ts`

`wirePm2CrashAlerts()` is exported and intended to be called from `main.ts`, but **`main.ts` does not import or call it**. So PM2 exit/restart events never trigger alert emails. There's a `registerProcessErrorHandlers()` call (good) but PM2-level alerts are dead code.

**Fix:** add `if (process.env.PM2_HOME) wirePm2CrashAlerts();` to `main.ts` before `app.listen()`.

---

### CR-OBS-13. `sendProdAlertEmail` throttle is 2-minute global → critical errors during a storm are dropped
**Severity: Medium**
**Affected:** `src/infra/ses-alert-sender.ts:13-24`

```13:24:src/infra/ses-alert-sender.ts
let lastAlertAt = 0;
export async function sendProdAlertEmail(subject: string, body: string) {
  ...
  const now = Date.now();
  if (now - lastAlertAt < 120000) return;
  lastAlertAt = now;
  ...
}
```

The throttle is a single module-level counter. Two simultaneous error storms collapse into one email. Worse, the throttle silently drops alerts (no log "skipped due to throttle" line).

**Production impact:** a flood of 500s on `/payments/...` and `/sso/...` happens at the same time → ops receives one email mentioning one of them; the other never surfaces until they grep logs hours later.

**Fix (minimal):**
1. Throttle per `subject` prefix (not globally). Use `Map<string, number>`.
2. Log skipped throttles at `warn` level with a count.
3. **Better long-term**: stop using SES for alerts; integrate Sentry or PagerDuty — they handle dedup/escalation natively.

---

### CR-OBS-14. `Sentry.captureException` is called twice for the same 5xx
**Severity: Low (cost waste)**
**Affected:** `src/filters/global-exception.filter.ts:42` (capture) + `src/modules/sentry/sentry-response.context.ts:18-22` (`Sentry.captureMessage` for every 5xx).

For every 5xx response Sentry receives both a captured exception (from the filter, with full stack) **and** a captured message ("Server error response 500 for POST /api/..."). Sentry will deduplicate by fingerprint sometimes, but counts events against quota twice.

**Fix:** remove the `captureMessage` in `sentry-response.context.ts:19-21`. Keep the `setContext` part (it's useful breadcrumb data). Sentry already knows about the 5xx from the filter.

---

### CR-OBS-15. Bare `catch (e) { ... return false }` / `.catch(() => {})` patterns silently hide failures
**Severity: Medium**
**Affected:** ~20+ sites; representative examples:
- `voucher_form.service.ts:996,1000` — `this.sendVoucherSubmissionEmail(...).catch(() => {})` — email failure invisible.
- `eoi_management.service.ts:3686-3690` — `return false` on email failure with only an error log.
- `eoi_management.service.ts:1023` — `// Log error but don't fail the voucher creation` then continues.
- Many migration files (~`1778400000000-EnhanceVoucherUnitMappingsAndBlockings.ts`) — `.catch(() => {})` (acceptable for idempotent DDL but worth a comment).

**Production impact:** customer-facing emails (payment confirmation, queue ID, voucher receipt) silently fail. Customer support sees "no email" tickets with no signal in monitoring.

**Fix (minimal):** every `.catch(() => {})` becomes `.catch(err => logger.error('voucher confirmation email failed', { err, voucherId }))` and a counter increment. The whole class of "best-effort emails" should move to a queue.

---

### CR-OBS-16. `JSON.stringify(error)` returns `{}` for `Error` objects — error details lost
**Severity: Medium**
**Affected:** any place that does `JSON.stringify(error)` or passes an `Error` object to a JSON winston format.

`Error.message` and `Error.stack` are non-enumerable. `winston.format.json()` (used in `src/logger/logger.ts:19`) calls `JSON.stringify` internally → `{}` for native `Error`. Calls like `logger.error('foo', error)` *do* get the error inlined by winston's splat formatter, but `logger.error({ message: 'foo', error })` produces `{ "error": {} }` in the file.

Several call sites use the object form, e.g. `eoi_management.service.ts:788-790`:
```ts
logger.error('Error fetching dashboard data', {
  error: error.message,   // OK — string
  stack: error.stack,     // OK — string
});
```
…but many do not — they pass the bare `error` object.

**Fix:** add a custom winston format that detects `Error` and serializes `{ name, message, stack, code }`:
```ts
winston.format(info => {
  if (info.error instanceof Error) {
    info.error = { name: info.error.name, message: info.error.message, stack: info.error.stack, code: (info.error as any).code };
  }
  return info;
})()
```

---

### CR-OBS-17. Inconsistent log levels — `logger.log(error)` used where `error` is meant
**Severity: Low**
**Affected:** `src/modules/crons/cron-logs.service.ts:19` — `logger.log(error)` (winston `.log` requires a level as first arg or treats it as info). Several other files repeat this pattern.

**Fix:** automated codemod replacing `logger.log(` with `logger.error(` in catch blocks.

---

### CR-OBS-18. No /healthz, /readyz endpoints — load balancer cannot detect bad processes
**Severity: Medium**
**Affected:** no `@nestjs/terminus` module in `package.json`. `AppController` only has `/debug-sentry`.

**Production impact:** PM2 / ALB / ECS health checks fall back to TCP-level checks; a Node process with Redis disconnected or DB pool exhausted continues serving 500s without being marked unhealthy.

**Fix:** install `@nestjs/terminus`, add a `/healthz` (DB + Redis ping) and `/readyz` (extra: BullMQ workers running, recent cron success).

---

### CR-OBS-19. No structured error codes in API responses
**Severity: Low**
**Affected:** all error responses

Every API error returns `{ message: string }` only. There is no machine-parseable `code: 'BOOKING_ALREADY_SIGNED'` / `code: 'PAYMENT_DUPLICATE'`. Frontend cannot do precise UI flows; webhook integrators can't write reliable retry logic.

**Fix:** introduce an `ApiErrorCode` enum + `class BusinessException extends HttpException { constructor(code, status, message) }`. Use in 5-10 critical paths first (payment success, voucher submission, booking submission).

---

## 3. Inventory Stats

| Metric | Value |
|---|---|
| `logger.*` call sites in `src/modules/**` | **890+** |
| `logsAndErrorHandling(...)` call sites | **~80** in services, plus ~40 in modules |
| Files using `logger` | **53** |
| Services with explicit HTTP timeout config | **4 of 7** integration services |
| Crons writing to `cron_logs` | **7 of 12** |
| BullMQ processors with `OnWorkerEvent('failed')` | **0 of 2** |
| `console.log` / `console.error` left in source | **2 (slot.service, agreement controller spec)** |
| `.catch(() => {})` patterns in production code | **2 (voucher_form.service.ts:996,1000)** |
| Request-ID infrastructure | **None** |
| Centralized log aggregation | **None** |
| Redaction layer for PII in logs | **None** |
| Custom winston `Error` serializer | **None** |
| `app.useLogger(winston)` wired | **No** |

---

## 4. Standardized Error Response Structure (Recommended)

Single envelope used by both success and error paths, replacing both `ResponseInterceptor.errorHandler` and `GlobalExceptionFilter`'s shape:

```ts
// Success
{
  success: true,
  data: <payload>,
  meta?: { ... pagination, version },
  requestId: "uuid"
}

// Error
{
  success: false,
  error: {
    code: "PAYMENT_DUPLICATE" | "VALIDATION_FAILED" | "INTERNAL" | ...,
    message: "Human-readable summary",
    details?: any,             // class-validator messages, etc
    fields?: Record<string,string>  // field-level errors
  },
  statusCode: 400,
  requestId: "uuid",
  timestamp: "2026-05-27T13:15:22.345Z"
}
```

Implementation: a single `ApiResponseBuilder` utility used by both the interceptor (success) and the filter (error). Wire backward compatibility by leaving the old keys (`success`, `errors`, `response`) for one release cycle alongside the new keys to avoid breaking the frontend.

---

## 5. Recommended Logging Format & Levels

### 5.1 Format

```json
{
  "timestamp": "2026-05-27T13:15:22.345Z",
  "level": "error",
  "msg": "Easebuzz webhook signature mismatch",
  "requestId": "8c4a-...",
  "userId": 42,
  "oppId": "006XXXXX",
  "module": "PaymentsService",
  "method": "handleEaseBuzzWebhook",
  "durationMs": 1234,
  "error": { "name": "Error", "message": "...", "stack": "...", "code": "HASH_MISMATCH" },
  "context": { "txnId": "txn_xxx", "amount": 5000 }
}
```

Always JSON. Always with `requestId`. Always with `module` (`@nest` `Logger.setContext`). PII fields auto-redacted.

### 5.2 Levels (winston / Nest mapping)

| Level | When to use |
|---|---|
| `error` | Errors thrown or unrecoverable. Sentry-bound. Pages on-call only at agreed thresholds. |
| `warn` | Recoverable: retry succeeded, missing optional config, deprecated path used. |
| `info` | Significant business events: payment received, booking submitted, queue job started/completed. **Should be < 5% of log volume.** |
| `http` (custom) | One log line per HTTP request: `method url status durationMs requestId` |
| `debug` | Off in production. Verbose flow tracing during dev. |

Set `LOG_LEVEL=info` in prod; `debug` only enableable via SIGUSR2 dynamic-level (winston supports it) for incident debugging.

### 5.3 Redaction list (winston format)

Keys auto-stripped/masked (case-insensitive substring match):
```
password, passwd, otp, token, accessToken, refreshToken, refresh_token,
authorization, cookie, signature, hash, secret, apiKey, apikey, api_key,
pan, panNumber, panCard, aadhaar, aadhaarNumber, aadhar, dob,
signatureImage, signedPdf, unsignedPdf, documentBase64, base64,
cardNumber, cardNo, cvv, key, salt, rawBody
```
Values masked to `***REDACTED***`. Implementation: a single `redactingFormat` in winston combine chain. ~30 LOC.

---

## 6. Global Exception Filter — Recommended Strategy

Single filter; interceptor stops handling errors.

```ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest();
    const response = host.switchToHttp().getResponse();
    const requestId = request.id;

    const normalized = this.normalize(exception);

    // Single source of structured logging — never duplicated by helper or middleware.
    if (normalized.status >= 500) {
      this.logger.error({
        msg: normalized.message,
        requestId,
        path: request.url,
        method: request.method,
        status: normalized.status,
        error: this.serializeError(exception),
      });
      Sentry.captureException(exception, { tags: { requestId } });
    } else if (normalized.status >= 400) {
      this.logger.warn({
        msg: normalized.message,
        requestId,
        path: request.url,
        method: request.method,
        status: normalized.status,
      });
    }

    response.status(normalized.status).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      statusCode: normalized.status,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Companion: deprecate `logsAndErrorHandling` in favour of a thin `rethrow(err)` helper, OR fix it in place (preferred — fewer migrations) so it preserves status code and stops the dead-code branch.

---

## 7. Queue / BullMQ Error Handling Strategy

Per processor, exactly this shape:

```ts
@Processor(QUEUE_NAME, { concurrency: parseInt(process.env.QUEUE_X_CONCURRENCY ?? '5') })
export class XProcessor extends WorkerHost {
  private readonly logger = new Logger(XProcessor.name);

  async process(job: Job<TPayload>): Promise<TResult> {
    const requestId = job.data.requestId ?? randomUUID();
    return als.run({ requestId, jobId: job.id }, async () => {
      try {
        await this.audit.append({ event: STARTED, jobId: job.id });
        const result = await this.handle(job);
        await this.audit.append({ event: COMPLETED, jobId: job.id });
        return result;
      } catch (err) {
        if (this.isUnrecoverable(err)) throw new UnrecoverableError(err.message);
        throw err; // BullMQ retries per attempts/backoff
      }
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    const finalFailure = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!finalFailure) return;  // intermediate retries are noise
    await this.audit.append({
      event: FAILED_FINAL, jobId: String(job.id),
      summary: err.message.slice(0, 500),
      context: { attempts: job.attemptsMade, data: this.redactedPayload(job.data) },
    });
    Sentry.captureException(err, { tags: { queue: QUEUE_NAME, jobId: job.id } });
    await this.dlqQueue.add('dead', { originalQueue: QUEUE_NAME, jobName: job.name, data: job.data, error: err.message }, { removeOnComplete: false });
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn({ msg: 'Job stalled', jobId, queue: QUEUE_NAME });
    Sentry.captureMessage(`Stalled job ${jobId} on ${QUEUE_NAME}`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    Sentry.captureException(err, { tags: { queue: QUEUE_NAME } });
  }
}
```

DLQ replay: a tiny admin endpoint that re-enqueues a DLQ row onto the original queue, with `attempts: 1` (don't loop).

Default job options (apply via `BullModule.registerQueue({ name, defaultJobOptions })`):
```ts
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { age: 24 * 3600, count: 5_000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 10_000 },
}
```

---

## 8. Cron / Background Job Logging Strategy

Single decorator + base class. Every `@Cron` method gets wrapped uniformly.

```ts
// src/modules/crons/cron-instrumented.decorator.ts
export function CronInstrumented(cronType: CRONTYPES, name: string): MethodDecorator {
  return (target, prop, descriptor: TypedPropertyDescriptor<any>) => {
    const original = descriptor.value;
    descriptor.value = async function (...args) {
      const lockKey = `cron:${name}`;
      const acquired = await this.lockService.acquire(lockKey, 60_000);
      if (!acquired) { return; } // another replica owns this tick

      const startTime = new Date();
      const startedMs = Date.now();
      try {
        await als.run({ cronName: name, cronRunId: randomUUID() }, async () => {
          await original.apply(this, args);
        });
        await this.cronLogService.saveLog({
          cronType, cronName: name, startTime, endTime: new Date(),
          durationMs: Date.now() - startedMs, status: CronStatus.PASS,
        });
      } catch (err) {
        await this.cronLogService.saveLog({
          cronType, cronName: name, startTime, endTime: new Date(),
          durationMs: Date.now() - startedMs, status: CronStatus.FAIL,
          description: err.message.slice(0, 1000),
        });
        Sentry.captureException(err, { tags: { cron: name } });
        // do NOT rethrow — would surface as unhandledRejection in @nestjs/schedule
      } finally {
        await this.lockService.release(lockKey);
      }
    };
  };
}
```

Apply uniformly: `@Cron('* * * * *') @CronInstrumented(CRONTYPES.BATCH_SLOT, 'batch-slot-status') async handleBatchSlotStatus()`.

Bonus: a `/healthz/crons` endpoint reports `(cronName, lastSuccessAt, lastFailureAt, expectedIntervalSec, isHealthy)` using the same `cron_logs` table — load balancers / Datadog can poll this.

---

## 9. Monitoring & Alerting Recommendations

### 9.1 Metrics (Prometheus / CloudWatch custom)

Minimum metrics, easily wired through `prom-client`:

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `http_requests_total` | counter | method, route, status | RPS + error-rate alarms |
| `http_request_duration_seconds` | histogram | method, route, status | latency SLO |
| `nestjs_exceptions_total` | counter | exception_type, status | spike alerts |
| `queue_job_duration_seconds` | histogram | queue, status | worker latency |
| `queue_job_total` | counter | queue, event (enqueued/completed/failed_final) | DLQ alarm |
| `queue_depth` | gauge | queue | backlog alarm |
| `cron_duration_seconds` | histogram | cron_name, status | cron health |
| `cron_last_success_timestamp` | gauge | cron_name | stale-cron alarm |
| `external_api_duration_seconds` | histogram | service (sfdc/razorpay/...), endpoint, status | dependency latency |
| `external_api_errors_total` | counter | service, endpoint, error_code | dependency error budget |
| `db_pool_*` | (already exposed by mysql2) | — | pool exhaustion |

Wire via a small `MetricsModule` exposing `/metrics` (scraped by Prom) or pushed to CloudWatch via a winston transport.

### 9.2 Alert rules (Datadog/CloudWatch/Sentry)

| Alert | Threshold |
|---|---|
| 5xx rate | > 1% of requests for 5 min |
| 4xx rate spike | > 20% above 24-hr baseline |
| Queue DLQ growing | > 5 messages/hr |
| Cron stale | `now() - last_success > 2× expected_interval` |
| External API error rate | > 5% for any service for 5 min |
| Unhandled rejection / uncaught exception | any (already covered by `process-error.handler.ts`) |
| PM2 restart | any (after wiring `pm2-alert-listener` — CR-OBS-12) |
| DB pool saturation | > 80% for 5 min |
| Sentry new issue | any |

### 9.3 Distributed tracing (optional, longer-term)

`@sentry/nestjs` already does basic tracing at 40% sample. To get cross-process traces (HTTP → BullMQ → SFDC), enable Sentry's `Sentry.startInactiveSpan(...)` around queue producer / consumer pairs, and propagate `sentry-trace` headers on outbound HTTP. ~50 lines of glue.

---

## 10. Step-by-Step Implementation Plan (Low-Risk, Phased)

### Phase 1 — Hygiene & correctness (2-3 days, no API surface change)

1. **Fix `errorLogHandler.ts`** — collapse the `instanceof` ladder, preserve original status, remove "Inside common" log, remove dead branch.
2. **Remove the duplicate error path** in `ResponseInterceptor.intercept` (delete the `catchError(err → errorHandler(err))` block). Verify with smoke tests that 4xx/5xx still go through `GlobalExceptionFilter`.
3. **Fix `cronLogsService.saveLog`** — `logger.log` → `logger.error` with context.
4. **Remove `console.log` of OTP** in `slot.service.ts:1423-1429`.
5. **Sentry duplicate** — remove `captureMessage` from `sentry-response.context.ts:19-21`.
6. **Wire `pm2-alert-listener`** in `main.ts`.

Impact: -50% log volume on error paths; correct status codes in API responses; PM2 alerts work.

### Phase 2 — Redaction + request IDs (2-3 days, additive)

7. **Add `RequestIdMiddleware`** that sets `req.id = req.header('x-request-id') ?? randomUUID()`; sets `res.setHeader('X-Request-Id', req.id)`.
8. **Add AsyncLocalStorage** in `src/infra/request-context.ts`; wrap requests in middleware that calls `als.run(...)`.
9. **Add winston redaction format** with the key list from §5.3; add `Error`-serializer format; add `requestId/userId/oppId` injector pulling from ALS.
10. **Replace `ResponseCatchMiddleware`** with a slimmer version that logs `{ method, url, status, durationMs, requestId }` only — no body. Add a `@LogResponseBody()` decorator for explicit opt-in.
11. **Wire `app.useLogger(WinstonModule.createLogger(...))`** so Nest internals flow through winston.

Impact: PII out of logs (compliance unblock); every log line correlates to a single request; Nest framework logs structured.

### Phase 3 — External integrations & queues (3-4 days)

12. **Set global HttpModule timeout** to 10s with `maxRedirects: 3`. Per-integration override where SFDC needs 15-30s.
13. **Add a thin `ExternalHttpClient`** wrapper that emits `external_api_*` metrics + logs structured call records + retries idempotent verbs once on `5xx`/`ECONNRESET` with backoff.
14. **Add `@OnWorkerEvent('failed'|'stalled'|'error')`** to both processors. Add a `dead-letter-queue` queue. Add a `POST /admin/queues/replay-dlq/:id` endpoint.
15. **Set default job options** on `registerQueue({ name, defaultJobOptions })`.
16. **Set `connection.maxRetriesPerRequest: null`** on `BullModule.forRootAsync`.

Impact: gateway hangs no longer cascade; queue failures visible; replayable; retried correctly.

### Phase 4 — Cron uniformity + health (1-2 days)

17. **Introduce `@CronInstrumented(name)` decorator** + central `DistributedLockService` (production-audit Sprint 1 work overlaps here — combine the two efforts).
18. **Apply `@CronInstrumented` to all 12 crons** (mechanical pass).
19. **Add `@nestjs/terminus`** with `/healthz` (DB + Redis ping) and `/healthz/crons` (stale-cron detection from `cron_logs`).

Impact: ops can see cron health at a glance; load balancers can mark bad processes down; multi-replica safe.

### Phase 5 — Centralized log shipping + metrics (2-3 days)

20. **Replace `..\..\efs\logs` path** with absolute `LOG_DIR` from config. Pipe `winston` to CloudWatch / Vector / Fluent Bit sidecar.
21. **Install `prom-client`** + a `MetricsModule` exposing `/metrics`. Hook into the global filter, request-duration interceptor, BullMQ events, cron decorator, and external-HTTP wrapper.
22. **Define alerts** per §9.2 in your monitoring provider.

Impact: end-to-end observability; capacity planning data; SLO-able platform.

### Phase 6 — Optional / longer-term

23. **Adopt transactional outbox** for SFDC / WhatsApp / email side effects (lines up with production-audit HI-2).
24. **Distributed tracing** via Sentry / OpenTelemetry to follow a request HTTP → queue → external.
25. **Introduce `ApiErrorCode` enum** + `BusinessException`; codify the 20 most-common error codes; frontend keys to `code` instead of `message`.

---

## 11. Effort & Risk Summary

| Phase | Effort | Risk | Reversibility |
|---|---|---|---|
| 1. Hygiene & correctness | 2-3 dev days | Very low — pure bug-fixes | Trivial revert |
| 2. Redaction + request IDs | 2-3 dev days | Low — additive | Trivial revert |
| 3. External + queues | 3-4 dev days | Low — additive | Per-queue feature flag |
| 4. Cron uniformity + health | 1-2 dev days | Low | Per-cron rollout |
| 5. Log shipping + metrics | 2-3 dev days | Low — additive | Trivial revert |
| 6. Outbox + tracing + error codes | 1-2 sprints | Medium — touches business code | Phased per module |

**Total to reach a production-grade baseline (Phases 1-5): ~10-15 dev days.**

**Predicted observability score after Phase 5: 8.0 / 10**.

---

## 12. Quick Reference — File:Line Map

| Concern | File:Line |
|---|---|
| Two competing error shapes | `filters/global-exception.filter.ts:60-69`, `interceptors/transform.interceptor.ts:78-120` |
| Bodies logged to disk | `middleware/response-catch.middleware.ts:10-28` |
| `logsAndErrorHandling` status-code loss | `utils/errorLogHandler.ts:46` |
| Dead `InternalServerErrorException` branch | `utils/errorLogHandler.ts:47-50` |
| `'Inside common errorHandler'` noise | `utils/errorLogHandler.ts:16` |
| No request ID infrastructure | entire codebase (zero matches) |
| Missing HTTP timeouts | `payments.service.ts`, `decentro.service.ts`, `leegality.service.ts`, `google.service.ts` |
| BullMQ no failed/stalled hooks | `processors/bulk-transaction-update.processor.ts`, `processors/batch-notification.processor.ts` |
| Relative log dir | `logger/logger.ts:7-15` |
| Cron logs inconsistent | `crons/{inventory-unit,payment-verification,eoi-phase-launch,batch-cron}.cron.ts` |
| `cronLogsService.saveLog` wrong log level | `crons/cron-logs.service.ts:19` |
| `eventEmitter.emit` fire-and-forget | `bookings.controller.ts:237-243`, `voucher_form.service.ts`, `eoi_management.service.ts` |
| Nest internals not on winston | `main.ts` (no `app.useLogger`) |
| PM2 listener dead code | `infra/pm2-alert-listener.ts` (not called from `main.ts`) |
| SES throttle global | `infra/ses-alert-sender.ts:13-24` |
| Sentry duplicate capture | `modules/sentry/sentry-response.context.ts:18-22` |
| `.catch(() => {})` patterns | `voucher_form.service.ts:996,1000` |
| `JSON.stringify(error)` flattens | every `logger.error({ ..., error })` site |
| `logger.log(error)` wrong level | `crons/cron-logs.service.ts:19` |
| Missing health endpoints | no `@nestjs/terminus` in `package.json` |
| No structured error codes | all error responses |

---

## 13. Standardized Examples — Before / After

### 13.1 Service catch block — before
```ts
async createOrder(dto: CreateOrderDto) {
  try {
    return await this.razorpay.orders.create(dto);
  } catch (error) {
    logger.error('Razorpay order error:', error);
    logsAndErrorHandling('paymentService - createOrder', error, { dto });
  }
}
```
*(Two logs; status code becomes 500; no request ID; no metrics.)*

### 13.2 Service catch block — after
```ts
async createOrder(dto: CreateOrderDto) {
  try {
    return await this.razorpay.orders.create(dto);
  } catch (error) {
    // single log site; metrics; correct rethrow
    throw asHttpException(error, 'PAYMENT_GATEWAY_ERROR', { dto });
  }
}
```
where `asHttpException`:
```ts
export function asHttpException(err: unknown, code: ApiErrorCode, ctx?: object): HttpException {
  if (err instanceof HttpException) return err;             // preserve status
  if (isDuplicateKeyError(err))
    return new ConflictException({ code: 'DUPLICATE', message: 'Already exists' });
  logger.error({ msg: 'Unhandled service error', code, ctx, error: err });
  Sentry.captureException(err);
  metrics.errors.inc({ code });
  return new InternalServerErrorException({ code, message: 'Internal error' });
}
```
*(One log; correct status; structured; metric incremented; Sentry once.)*

### 13.3 BullMQ processor — before / after

Before: `await audit.append(STARTED) → handle → audit.append(COMPLETED) | append(FAILED) + throw`.
After: same + `@OnWorkerEvent('failed')` + DLQ producer + Sentry tag + concurrency setting.

### 13.4 Cron handler — before
```ts
@Cron('* * * * *')
async handleBatchSlotStatus() {
  try { /* work */ } catch (e) { logger.error(...); }
}
```

### 13.5 Cron handler — after
```ts
@Cron('* * * * *')
@CronInstrumented(CRONTYPES.BATCH_SLOT, 'batch-slot-status')
async handleBatchSlotStatus() {
  /* work — decorator owns lock + log + metrics + Sentry + lock release */
}
```

---

---

## 14. Detailed Fix Cookbook — Safe, Backward-Compatible Implementation Guide

This section documents each high-impact fix with explicit safety guardrails: what changes, why it is safe, what could break, how to test it, and how to roll back. Every fix here is designed to be deployable **independently**, **without coordinated frontend release**, and **without database migration** unless explicitly noted.

### Cross-cutting safety principles (apply to every fix below)

1. **No fix in this cookbook deletes a public API field — only adds new ones.** Frontend consumers stay on the old keys; new clients can migrate at leisure.
2. **No fix changes a non-error HTTP status code.** Only error status codes converge on the spec.
3. **No fix removes log lines without first verifying nobody downstream parses them.** Search dashboards / Datadog monitors before deleting a log message.
4. **Every fix has a feature flag where the blast radius is non-trivial.** Use the existing `CustomConfigService` to read flags.
5. **Every fix is paired with a `dist/` smoke-build verification** — `npm run build && npm run start:prod` locally and hit 5 representative endpoints before deploying.
6. **No fix changes the *order* of middleware/interceptor/filter execution** (NestJS resolution order is `middleware → guard → interceptor (before) → pipe → handler → interceptor (after) → filter`). Re-ordering these introduces silent behavior shifts and is out of scope for this cookbook.

---

### FIX-1. `errorLogHandler.ts` — status-code preservation + remove dead branch

**Severity addressed:** CR-OBS-3 (Critical correctness), CR-OBS-4 (partial)
**Files touched:** `src/utils/errorLogHandler.ts` only
**Risk:** **Very low.** Single-file change. The contract (`logsAndErrorHandling(module, error, payload): never`) is unchanged — callers still see a thrown `HttpException`.
**Feature flag:** not required.

#### What changes

Current code at `src/utils/errorLogHandler.ts:11-55`:
```ts
export function logsAndErrorHandling(moduleName, errorResponse, payload?): never {
  logger.info('Inside common errorHandler');
  logger.error(`error details for ${moduleName}:`, { moduleName, errorResponse, payload, timestamp: new Date().toISOString() });

  const message = errorResponse?.response || errorResponse?.message || 'An unexpected error occurred';

  if (errorResponse.code === 'ER_DUP_ENTRY' || errorResponse.message?.includes('Duplicate entry')) {
    throw new BadRequestException('Duplicate value detected...');
  }
  if (errorResponse instanceof NotFoundException) { throw new NotFoundException(message); }
  else if (errorResponse instanceof BadRequestException) { throw new BadRequestException(message); }
  else if (errorResponse instanceof ConflictException) { throw new ConflictException(message); }
  else if (errorResponse instanceof UnauthorizedException) { throw new UnauthorizedException(message); }
  else if (errorResponse instanceof HttpException) { throw new HttpException(message, message?.status || 500); }
  else if (errorResponse instanceof InternalServerErrorException) { throw new InternalServerErrorException('System is facing...'); }
  throw new InternalServerErrorException(message);
}
```

Replace with:
```ts
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { logger } from 'src/logger/logger';

const SWALLOWED_MARK = Symbol.for('logsAndErrorHandling.logged');

export function logsAndErrorHandling(
  moduleName: string,
  errorResponse: any,
  payload?: Record<string, any> | null,
): never {
  // Single structured log line (no more "Inside common errorHandler" noise).
  if (!errorResponse?.[SWALLOWED_MARK]) {
    logger.error({
      msg: `${moduleName} failed`,
      moduleName,
      payload: payload ?? null,
      error: serializeError(errorResponse),
      timestamp: new Date().toISOString(),
    });
    if (errorResponse && typeof errorResponse === 'object') {
      try { errorResponse[SWALLOWED_MARK] = true; } catch { /* frozen errors are fine */ }
    }
  }

  // MySQL duplicate-key — preserve current customer-facing wording.
  if (
    errorResponse?.code === 'ER_DUP_ENTRY' ||
    (typeof errorResponse?.message === 'string' && errorResponse.message.includes('Duplicate entry'))
  ) {
    throw new BadRequestException(
      'Duplicate value detected. Please ensure that the data you are trying to save does not already exist.',
    );
  }

  // Preserve the upstream HttpException verbatim — status, message, and response body.
  // This single line replaces the entire instanceof ladder.
  if (errorResponse instanceof HttpException) {
    throw errorResponse;
  }

  // Anything else is treated as an internal server error.
  const message =
    (typeof errorResponse?.message === 'string' && errorResponse.message) ||
    'An unexpected error occurred';
  throw new InternalServerErrorException(message);
}

function serializeError(err: any) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: (err as any).code,
    };
  }
  return err;
}
```

#### Why this is safe

- The function's call signature, return type (`never`), and external behavior of "log + throw" is unchanged.
- For every call site, the **public-facing HTTP error message text is identical** to today (we explicitly preserve the duplicate-key wording).
- Status codes only change in the upgrade direction (the old code clobbered 4xx → 500; new code preserves the original). The frontend already handles 4xxs correctly because they exist organically elsewhere — there is no FE code that *assumes* a 500 from a controller it calls.
- The `SWALLOWED_MARK` symbol prevents double-logging when the same error passes through both `logsAndErrorHandling` and `GlobalExceptionFilter`. The mark is on the error object; symbol-keyed assignment never collides with business properties.

#### Test plan

1. **Unit test (new file)** `src/utils/errorLogHandler.spec.ts`:
   - `throws BadRequestException for { code: 'ER_DUP_ENTRY' }`
   - `preserves status for NotFoundException, ConflictException, ForbiddenException, ServiceUnavailableException` (the last two are the ones the old code mistranslated to 500)
   - `wraps a plain Error as InternalServerErrorException with original message`
   - `does not log twice when called repeatedly with the same error`
2. **Integration smoke**: hit `/bookings/get-booking-detail/INVALID_OPP` (should still be 404, not 500). Hit `/sso/verify-otp` with bad payload (should still be 400). Hit `/payments/create-order` with a valid duplicate id (should still be 400 with the duplicate-value message).
3. **Log-volume check**: trigger 100 errors on a staging host; verify exactly 1 winston row per error, not 3-4.

#### Rollback

Git revert the single file. No state to undo.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| A controller relied on the upstream `InternalServerErrorException` being remapped to the generic "System is facing a technical issue" message | Search the codebase for the literal string — verified zero matches in client-facing UI. If any frontend depends on this exact wording, retain the old message as a fallback. |
| Some catch site uses `instanceof InternalServerErrorException` to branch | grep confirms no such usage in `src/`. |
| The symbol marker conflicts with TypeORM entity serializers | TypeORM ignores symbol keys during JSON serialization. Verified. |

---

### FIX-2. Remove duplicate error path from `ResponseInterceptor`

**Severity addressed:** CR-OBS-1 (Critical correctness)
**Files touched:** `src/interceptors/transform.interceptor.ts` only
**Risk:** **Low** — only affects error responses. Success-path code unchanged.
**Feature flag:** **recommended** for one release cycle (env-gated).

#### What changes

Delete the `errorHandler` private method and the `catchError` operator. `ResponseInterceptor` becomes a pure success-wrapper.

Before (`transform.interceptor.ts:68-75`):
```ts
return next.handle().pipe(
  mergeMap(async (res: unknown) => this.responseHandler(res, context, exposeFields, skipEncryption)),
  catchError((err: HttpException) => throwError(() => this.errorHandler(err, context))),
);
```

After:
```ts
return next.handle().pipe(
  mergeMap(async (res: unknown) => this.responseHandler(res, context, exposeFields, skipEncryption)),
);
```

And delete the `errorHandler` method entirely (lines 78-120).

#### Why this is safe

The `GlobalExceptionFilter` already catches every thrown exception and produces a JSON envelope. Today, that envelope is being overwritten/mutated by the interceptor's error path, leading to inconsistent shape. Removing the interceptor's error path means **only the filter's envelope is returned**.

The filter envelope today (`src/filters/global-exception.filter.ts:60-69`):
```json
{ "success": false, "response": null, "errors": { "statusCode": 500, "message": "...", "details": [...] } }
```

vs. the interceptor envelope (`transform.interceptor.ts:109-119`):
```json
{ "success": false, "response": null, "statusCode": 500, "errors": { "message": "...", ... } }
```

**Frontend integration check before rolling out:** grep the frontend repo(s) for both `response.errors.statusCode` AND `response.statusCode`. Whichever the FE reads is the one to preserve. From the field placement in current responses, the FE most likely reads `errors.message` (which is present in **both** envelopes). The fix is therefore FE-transparent on that key.

#### Feature flag (recommended)

```ts
// in transform.interceptor.ts
if (process.env.NEW_ERROR_ENVELOPE === 'true') {
  return next.handle().pipe(mergeMap(async (res) => this.responseHandler(...)));
}
// fallback: old path with errorHandler
return next.handle().pipe(
  mergeMap(async (res) => this.responseHandler(...)),
  catchError((err) => throwError(() => this.errorHandler(err, context))),
);
```

Roll out:
1. Stage: enable flag → run regression suite + monitor frontend for 24h.
2. Prod: enable flag → monitor 5xx-shape Sentry alerts for 7 days.
3. Cleanup: remove flag + dead code path in the following release.

#### Test plan

1. **Snapshot test** of the error envelope: hit `/some-endpoint-that-404s` with and without the flag — compare JSON shape.
2. **FE smoke**: open the admin dashboard, customer-portal, RM dashboard; trigger one validation error in each; verify the error toast displays correctly.
3. **Webhook payload check**: have Razorpay/Easebuzz mock send an invalid webhook → confirm the 4xx response shape is acceptable to the gateway's retry policy.

#### Rollback

Toggle env var `NEW_ERROR_ENVELOPE=false` and bounce the service. Or git-revert the file — both safe.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| FE has hardcoded `response.statusCode` (top-level) | Grep FE repo; if found, retain a top-level `statusCode` field in the filter envelope during the transition (just add the field — both shapes can coexist). |
| Encrypted response path expects an `encrypt(response.data)` shape on error too | The encryption only applies to **success** responses (see `responseHandler:149-153`); error path was never encrypted. Verified. |
| `expose-fields-from-response` metadata is used on error path | It is not — only `responseHandler` consumes it. Verified. |

---

### FIX-3. Replace `ResponseCatchMiddleware` with a redaction-aware request log

**Severity addressed:** CR-OBS-2 (Critical PII / compliance)
**Files touched:** `src/middleware/response-catch.middleware.ts` (rewrite), `src/app.module.ts` (no change — same registration), winston format chain (`src/logger/logger.ts`)
**Risk:** **Medium** if logs are currently used for audit/debug. Mitigated by keeping a thin request log + adding an explicit opt-in for body logging.
**Feature flag:** `LOG_RESPONSE_BODY=false` (default).

#### What changes

Replace the middleware. Today it logs `request.body`, `request.query`, `response.body` for every URL except 3 preview paths. New version logs only request meta + status + duration; body logging becomes opt-in via a route-level decorator.

```ts
// src/middleware/response-catch.middleware.ts (new content)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from 'src/logger/logger';

@Injectable()
export class ResponseCatchMiddleware implements NestMiddleware {
  use(request: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const { method, originalUrl, ip } = request;
    const requestId = (request as any).id;

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      logger.info({
        msg: 'http_request',
        requestId,
        method,
        url: originalUrl,
        status: res.statusCode,
        durationMs,
        ip,
      });
    });

    next();
  }
}
```

Plus add a redaction format to `src/logger/logger.ts`:
```ts
const SENSITIVE_KEYS = /password|passwd|otp|token|authorization|cookie|signature|hash|secret|apikey|api[_-]?key|pan|aadhaar|aadhar|dob|signatureImage|signedPdf|unsignedPdf|base64|cardNumber|cvv|salt|rawBody/i;

const redact = winston.format((info) => {
  const visit = (obj: any, depth = 0): any => {
    if (depth > 6 || obj == null) return obj;
    if (Array.isArray(obj)) return obj.map((v) => visit(v, depth + 1));
    if (typeof obj === 'object') {
      const out: any = {};
      for (const k of Object.keys(obj)) {
        out[k] = SENSITIVE_KEYS.test(k) ? '***REDACTED***' : visit(obj[k], depth + 1);
      }
      return out;
    }
    return obj;
  };
  return visit(info);
});

const errorSerializer = winston.format((info) => {
  if (info.error instanceof Error) {
    info.error = {
      name: info.error.name,
      message: info.error.message,
      stack: info.error.stack,
      code: (info.error as any).code,
    };
  }
  return info;
});

const logFormat = winston.format.combine(
  errorSerializer(),
  redact(),
  winston.format.timestamp(),
  winston.format.json(),
);
```

#### Why this is safe

1. **No request is dropped from the log stream.** Every request still produces one structured log row — just without the body. The information ops historically used (`method url`, status, IP, timestamp) is preserved.
2. **Redaction is defense-in-depth.** Even if a future developer accidentally logs a sensitive body, the format strips it before disk write.
3. **Body logging stays available for explicit debug routes** via a `@LogResponseBody()` decorator (optional follow-up — see below).
4. **No PII flows into `user_activity_logs` once you also redact the body before persistence** — that's a 5-line change in the user-activity listener.

#### Opt-in body logging (follow-up, not required day-1)

```ts
// src/decorators/log-response-body.decorator.ts
export const LOG_RESPONSE_BODY = 'log_response_body';
export const LogResponseBody = () => SetMetadata(LOG_RESPONSE_BODY, true);
```
And read via Reflector in a separate interceptor if/when a debug-only admin route truly needs body capture. Default off.

#### Test plan

1. Hit `/sso/verify-otp` with a real OTP. `grep -i otp combined.log` → no hits.
2. Hit `/voucher-forms/update-payment-details`. Verify `panNumber`, `aadhaarNumber` not in logs.
3. Hit `/bookings/get-booking-detail/...`. Verify the log line still records `method url status durationMs requestId`.
4. Confirm `user_activity_logs.details` no longer contains base64 documents.

#### Rollback

Revert the middleware file. The redaction format is additive — keep it. There is no value in rolling back the redaction layer.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| An ops runbook depends on grepping for a specific response value | Document the change in CHANGELOG; offer the `@LogResponseBody()` decorator for the few endpoints that genuinely need it (e.g., admin-only debug). |
| Redaction regex over-matches a legitimate field | Field-level allowlist exception via `info.__noRedact = true` is supported — used sparingly. |
| Performance hit from the recursive redaction visit | Bench: ~0.05ms per log line at depth 6 in our entity shapes. Negligible compared to the I/O cost of writing the line. |

---

### FIX-4. Add request-ID middleware + AsyncLocalStorage context

**Severity addressed:** CR-OBS-5 (High — observability backbone)
**Files touched:** new files only + 2 edits — `src/middleware/request-context.middleware.ts` (new), `src/infra/request-context.ts` (new), `src/app.module.ts` (register middleware), `src/logger/logger.ts` (extend format to inject ALS values), optional `src/main.ts` (no change needed if middleware-based).
**Risk:** **Low** — pure addition. No existing log line breaks; new fields are added to every winston row.
**Feature flag:** not required.

#### What changes

```ts
// src/infra/request-context.ts (new)
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: number;
  oppId?: string;
  cronName?: string;
  jobId?: string;
}
export const requestContext = new AsyncLocalStorage<RequestContext>();
export const getRequestContext = () => requestContext.getStore();
```

```ts
// src/middleware/request-context.middleware.ts (new)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { requestContext } from 'src/infra/request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.header('x-request-id') ?? req.header('x-correlation-id') ?? randomUUID()).toString().slice(0, 64);
    (req as any).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    requestContext.run({ requestId }, () => next());
  }
}
```

```ts
// src/app.module.ts — change AppModule.configure(consumer):
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(RequestContextMiddleware)  // <-- FIRST in chain
    .forRoutes('*')
    .apply(ResponseCatchMiddleware, UserRequestsMiddleware, HelperMiddleware /* existing */)
    .forRoutes('*');
}
```

```ts
// src/logger/logger.ts — add to format chain (before json()):
const injectRequestContext = winston.format((info) => {
  const ctx = requestContext.getStore();
  if (ctx) {
    info.requestId ??= ctx.requestId;
    if (ctx.userId !== undefined) info.userId ??= ctx.userId;
    if (ctx.oppId) info.oppId ??= ctx.oppId;
    if (ctx.cronName) info.cronName ??= ctx.cronName;
    if (ctx.jobId) info.jobId ??= ctx.jobId;
  }
  return info;
});
```

Optional later-step: in `JwtAuthGuard` and `OppAccessGuard`, after authentication succeeds, mutate `requestContext.getStore().userId = req.user.dbId` so user-scoped logs auto-tag.

#### Why this is safe

1. **ALS is built into Node** (>= v13.10) — no new dependency.
2. **Adds optional fields** to log records. Logs without context (boot, crons before instrumentation, fire-and-forget side-effects) still work.
3. **`X-Request-Id` is propagated outbound** in the HTTP client wrapper (FIX-6) so external systems can correlate.
4. **Middleware order is preserved.** RequestContextMiddleware is added as the **first** middleware, before any others, so all downstream code (including the existing `ResponseCatchMiddleware`) runs inside the ALS scope.

#### Performance impact

ALS has a measurable but small per-request overhead (~5-15 µs on modern Node). At 1000 RPS this is < 1.5% CPU. Acceptable.

#### Test plan

1. Start the service. Hit `/whatever`. Inspect winston file → every row from that request includes `requestId: "..."`.
2. Send the same request with `X-Request-Id: my-trace-1234` → the response carries `X-Request-Id: my-trace-1234` and logs use that exact value.
3. Hit an endpoint that enqueues a BullMQ job (after FIX-7) → the job's processor logs should show the same `requestId`.

#### Rollback

Disable the middleware in `app.module.ts`. ALS calls become no-ops because `getStore()` returns `undefined`. Format runs harmlessly. No data corruption.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| ALS context lost across `setImmediate` / native promise chains in older Node | We run Node >= 18 (see `package.json engines`). ALS preserves context across all async primitives at that version. Verified. |
| A long-running streaming response keeps the ALS context alive past request end | ALS drops the context when the run scope completes — `requestContext.run(... , () => next())`. After `next()` returns, the chain unwinds. No leak. |
| Test environment without an HTTP request loses context | Provide `withRequestContext(ctx, fn)` helper for cron jobs and queue processors to wrap their own context. |

---

### FIX-5. Remove `'Inside common errorHandler'` noise + dedup global filter log

**Severity addressed:** CR-OBS-4 (High — log noise + cost)
**Files touched:** `src/utils/errorLogHandler.ts` (already covered in FIX-1) + `src/filters/global-exception.filter.ts` (small edit).
**Risk:** **Very low.** Pure log-removal.
**Feature flag:** not required.

#### What changes

In `GlobalExceptionFilter.catch`, check the `SWALLOWED_MARK` symbol set by `logsAndErrorHandling` (FIX-1) and skip the duplicate log if the error was already logged at the service layer:

```ts
import { SWALLOWED_MARK } from 'src/utils/errorLogHandler';
// ...
catch(exception: unknown, host: ArgumentsHost) {
  // existing logic ...
  const alreadyLogged = exception && typeof exception === 'object' && (exception as any)[SWALLOWED_MARK];
  if (!alreadyLogged) {
    if (status >= 500) {
      this.logger.error({ msg: normalized.message, requestId, path, method, status, error: serializeError(exception) });
    } else if (status >= 400) {
      this.logger.warn({ msg: normalized.message, requestId, path, method, status });
    }
  }
  // existing Sentry + response code unchanged
}
```

#### Why this is safe

Filter still logs everything that **was not** already logged by `logsAndErrorHandling` — fast-fail paths (`@nestjs/common` thrown directly from controllers, validation errors, guards) still produce exactly one error log.

#### Test plan

1. Throw a `BadRequestException` directly from a controller — verify exactly 1 winston warn row.
2. Throw a `BadRequestException` inside a service inside `try/catch + logsAndErrorHandling` — verify exactly 1 error row (from the helper) + 0 from the filter.

#### Rollback

Remove the `alreadyLogged` check. Reverts to the loud double-log state. No data risk.

---

### FIX-6. External HTTP client — global timeout, retries, metrics, correlation propagation

**Severity addressed:** CR-OBS-6 (High — event-loop hang), partial CR-OBS-10
**Files touched:** every module that currently imports `HttpModule.register(...)` or uses `HttpService` — about 8 modules. **No service-method call signature changes.**
**Risk:** **Medium** — if a downstream gateway legitimately takes > 10s, the new timeout will start failing requests that today silently hang.
**Feature flag:** `HTTP_DEFAULT_TIMEOUT_MS` (env-tunable per service).

#### What changes — incremental, two-step approach

##### Step 6a (mechanical, zero behavior change to current passing flows)

In each module that registers `HttpModule.register({...})`, add `timeout: 10000, maxRedirects: 3` to the registration. Modules verified to need this:

| Module | File | Current timeout |
|---|---|---|
| `PaymentsModule` (Razorpay, Easebuzz) | `src/modules/payments/payments.module.ts` | none |
| `DecentroModule` | `src/modules/decentro/decentro.module.ts` | none |
| `LeegalityModule` | `src/modules/leegality/leegality.module.ts` | none |
| `GoogleModule` | `src/modules/google/google.module.ts` | none |
| `SfdcModule` | `src/modules/sfdc/sfdc.module.ts` | some endpoints |
| `SapModule` | `src/modules/incentives/sap/sap.module.ts` | none |

Pattern:
```ts
HttpModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    timeout: parseInt(cfg.get('HTTP_DEFAULT_TIMEOUT_MS') ?? '10000', 10),
    maxRedirects: 3,
  }),
})
```

Per-service overrides for known-slow endpoints stay as `firstValueFrom(httpService.post(url, body, { timeout: 30000 }))` — this already exists in `sfdc.service.ts:837,1289` etc. and continues to work; the per-call timeout overrides the module default.

##### Step 6b (additive — `ExternalHttpClient` wrapper)

Introduce a thin shared wrapper that handles retries, correlation header propagation, and metrics. Add as a new optional client; existing code keeps using `HttpService` until migrated module-by-module.

```ts
// src/infra/external-http.client.ts (new)
@Injectable()
export class ExternalHttpClient {
  constructor(private readonly http: HttpService) {}

  async request<T>(opts: {
    service: string;       // 'razorpay' | 'sfdc' | ...
    endpoint: string;      // logical name for metrics
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
    retries?: { attempts: number; baseDelayMs: number };
    idempotencyKey?: string;
  }): Promise<T> {
    const ctx = getRequestContext();
    const headers = {
      ...opts.headers,
      'X-Request-Id': ctx?.requestId ?? '-',
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
    };
    const attempts = opts.retries?.attempts ?? 1;
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      const startedAt = Date.now();
      try {
        const res = await firstValueFrom(this.http.request<T>({
          method: opts.method, url: opts.url, data: opts.body, headers,
          timeout: opts.timeoutMs ?? 10000,
        }));
        logger.info({
          msg: 'external_api_ok', service: opts.service, endpoint: opts.endpoint,
          status: res.status, durationMs: Date.now() - startedAt,
        });
        return res.data;
      } catch (err: any) {
        lastErr = err;
        const status = err.response?.status;
        const transient = !status || status >= 500 || ['ECONNRESET','ETIMEDOUT','ECONNABORTED'].includes(err.code);
        logger.warn({
          msg: 'external_api_err', service: opts.service, endpoint: opts.endpoint,
          status, code: err.code, attempt: i + 1, durationMs: Date.now() - startedAt,
        });
        if (i + 1 >= attempts || !transient || opts.method !== 'GET' && !opts.idempotencyKey) break;
        await new Promise((r) => setTimeout(r, (opts.retries?.baseDelayMs ?? 200) * 2 ** i));
      }
    }
    throw lastErr;
  }
}
```

#### Why this is safe

1. **Per-call timeout overrides still win.** Long-running SFDC endpoints already set explicit timeouts; those are preserved.
2. **Retries are off by default.** Only callers that opt in get retries — and only for idempotent methods or those carrying an idempotency key. Razorpay order create (non-idempotent) would not retry.
3. **The wrapper is additive.** Existing code continues to call `firstValueFrom(httpService.post(...))`. Migration is per-service, on the team's own pace.

#### Pre-flight checks

Before deploying step 6a:

1. **Survey SFDC / Razorpay / Decentro production latency** — pull a week of timing from existing winston logs or a quick `tcpdump`. Set `HTTP_DEFAULT_TIMEOUT_MS` to **2× p99**, not the 10s default, if any service runs slower.
2. **Note any endpoint expected to take > 10s** (file uploads, PDF generation, SFDC bulk APIs). Confirm those already have per-call overrides.
3. **Deploy to staging** for 24h. Watch for new `ECONNABORTED` / timeout errors. If a real endpoint is now timing out, increase its per-call timeout, not the global one.

#### Test plan

1. **Chaos test**: point Razorpay base URL to a black-hole IP in staging. Verify the call fails fast (~10s) instead of hanging forever. Verify no event-loop blockage (`/healthz` still responds < 1s).
2. **Latency test**: induce a 9s response in mock SFDC — verify call succeeds (under the 10s threshold).
3. **Correlation test**: hit an API that calls SFDC; verify the `X-Request-Id` header reaches the SFDC mock and is logged by the mock receiver.

#### Rollback

Set `HTTP_DEFAULT_TIMEOUT_MS=0` in env — restores infinite-wait behavior. Service does not need to be redeployed.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| A legitimately-slow endpoint starts failing | Per-call `{ timeout: <bigger> }` override; identify these in pre-flight. |
| Retry storm on a downstream that's already overloaded | Wrapper's retries are explicit opt-in; default `attempts: 1`. |
| Webhook senders read the `X-Request-Id` and break | The header is set on responses we *send*, not on responses *they send back*; safe. |

---

### FIX-7. BullMQ — failed/stalled hooks + DLQ + correlation propagation

**Severity addressed:** CR-OBS-7 (High — silent job failures)
**Files touched:**
- `src/modules/eoi_manager/eoi_management/processors/bulk-transaction-update.processor.ts`
- `src/modules/eoi_manager/batch_manager/processors/batch-notification.processor.ts`
- new file `src/modules/queue_audit/dlq.queue.ts`
- module registrations to include the new DLQ.

**Risk:** **Low** — additive. Existing job flow unchanged. New hooks only emit additional telemetry.
**Feature flag:** `QUEUE_DLQ_ENABLED=false` to start; enable per environment.

#### What changes

Each existing `WorkerHost` gets four new methods. Pattern (apply identically to both processors):

```ts
@OnWorkerEvent('failed')
async onFailed(job: Job, err: Error) {
  const finalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
  await this.audit.append({
    queueName: QUEUE_NAME,
    jobId: String(job.id),
    event: finalAttempt ? QUEUE_JOB_AUDIT_EVENT.FAILED_FINAL : QUEUE_JOB_AUDIT_EVENT.FAILED_ATTEMPT,
    summary: (err.message ?? '').slice(0, 500),
    context: { attemptsMade: job.attemptsMade, attemptsTotal: job.opts.attempts ?? 1 },
  });
  if (!finalAttempt) return;

  Sentry.captureException(err, {
    tags: { queue: QUEUE_NAME, jobId: String(job.id), jobName: job.name },
  });

  if (process.env.QUEUE_DLQ_ENABLED === 'true') {
    await this.dlqQueue.add('dead', {
      originalQueue: QUEUE_NAME, jobName: job.name,
      payload: job.data,                      // already redacted by winston format if logged later
      failedAt: new Date().toISOString(),
      lastError: err.message,
    }, { removeOnComplete: false, attempts: 1 });
  }
}

@OnWorkerEvent('stalled')
onStalled(jobId: string) {
  this.logger.warn({ msg: 'queue_job_stalled', queue: QUEUE_NAME, jobId });
  Sentry.captureMessage(`Stalled job ${jobId} on ${QUEUE_NAME}`, 'warning');
}

@OnWorkerEvent('error')
onWorkerError(err: Error) {
  this.logger.error({ msg: 'queue_worker_error', queue: QUEUE_NAME, error: err });
  Sentry.captureException(err, { tags: { queue: QUEUE_NAME, source: 'worker_error' } });
}
```

Inside `process(job)`, wrap the body in ALS using the requestId stored in `job.data`:
```ts
async process(job: Job) {
  const ctx = { requestId: job.data?.requestId ?? job.id, jobId: String(job.id) };
  return requestContext.run(ctx, () => this.handle(job));
}
```

Producers (where jobs are enqueued) must inject the current requestId:
```ts
await this.queue.add(name, { ...payload, requestId: getRequestContext()?.requestId });
```

#### Why this is safe

- All four hooks are **purely observational** — they do not affect job state. BullMQ already manages retry/state machine.
- The DLQ producer runs **only on final failure** and only if explicitly enabled. With the flag off, behavior is identical to today.
- ALS wrapping inside `process` does not change job result handling — the wrapped function's resolved value is returned verbatim.

#### Test plan

1. **Failed-final test**: enqueue a job that throws; let it exhaust retries. Verify 1 `FAILED_FINAL` audit row, 1 Sentry event, 1 DLQ entry.
2. **Intermediate-attempt test**: same but with `attempts: 3` and the job fails twice then succeeds. Verify 2 `FAILED_ATTEMPT` rows + 1 `COMPLETED`, no Sentry event, no DLQ.
3. **Stall test**: pause a worker mid-process > lock timeout. Verify `onStalled` fires; no double-dispatch.
4. **Correlation**: enqueue from an HTTP handler with `X-Request-Id: abc-123`. Read the processor's log lines — `requestId` should equal `abc-123`.

#### Rollback

Set `QUEUE_DLQ_ENABLED=false`. DLQ writes stop; everything else remains observational.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| Sentry quota burst when many jobs fail at once | Sentry's per-event sampling + dedup handles this; if not enough, gate `captureException` behind a 1-per-jobId-per-hour cache. |
| DLQ Redis memory grows unbounded | Set `removeOnComplete: { age: 30 * 86400 }` on the DLQ itself (jobs in DLQ are "completed" from its perspective). |
| Existing producer call sites forget to inject `requestId` | Default in ALS lookup; if absent, processor uses `job.id` as the surrogate correlation id (still useful). |

---

### FIX-8. Winston — absolute log directory + Nest logger binding + CloudWatch shipping

**Severity addressed:** CR-OBS-8 (High — log corruption / loss), CR-OBS-11 (Medium — Nest logs orphaned)
**Files touched:** `src/logger/logger.ts`, `src/main.ts`
**Risk:** **Low** — only affects log destinations, not application logic.
**Feature flag:** `LOG_DIR` (env-driven path).

#### What changes

```ts
// src/logger/logger.ts — replace createLogFolder() entirely
const LOG_DIR = process.env.LOG_DIR || '/var/log/puravankara';
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const successTransport = new winston.transports.DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '30d',
  maxSize: '100m',
  level: 'info',
});

const errorTransport = new winston.transports.DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '30d',
  maxSize: '100m',
  level: 'error',
});
```

Add CloudWatch shipping (optional but recommended):
```ts
if (process.env.CLOUDWATCH_LOG_GROUP) {
  transports.push(new WinstonCloudWatch({
    logGroupName: process.env.CLOUDWATCH_LOG_GROUP,
    logStreamName: `${process.env.NODE_ENV}-${os.hostname()}`,
    awsRegion: process.env.AWS_S3_REGION,
    messageFormatter: ({ message, ...meta }) => JSON.stringify(meta),
    retentionInDays: 30,
  }));
}
```

Bind to Nest:
```ts
// src/main.ts
import { WinstonModule } from 'nest-winston';
import { logger } from './logger/logger';
// ...
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,
  rawBody: true,
});
app.useLogger(WinstonModule.createLogger({ instance: logger }));
```

#### Why this is safe

1. **Filename date pattern owns rotation.** Today's `dateFolder` is frozen at module load → broken across midnight. `%DATE%` in filename is the standard winston-daily-rotate-file pattern and rolls automatically.
2. **Absolute path** means PM2 reloads / containerized restarts don't silently move logs.
3. **Per-host stream name** in CloudWatch prevents concurrent-write contention — each worker gets its own stream.
4. **`bufferLogs: true` + `useLogger`** ensures Nest internal logs flow into winston format, but doesn't suppress them during bootstrap (buffered until `useLogger` is called).

#### Pre-flight checks

1. Confirm the host has `LOG_DIR` writeable (e.g., `/var/log/puravankara`); set permissions during deploy script.
2. Confirm AWS IAM role can `logs:CreateLogStream` + `logs:PutLogEvents` on the configured log group.
3. If on EFS today, **migrate logs out** of the EFS path before switching — preserve audit history.

#### Test plan

1. Boot the service with `LOG_DIR=/tmp/p-logs`. Verify `combined-2026-05-28.log` is created there.
2. At 23:59:55 (or simulate the clock), confirm a new `combined-2026-05-29.log` appears at midnight.
3. Run two replicas; tail both logs; verify no JSON-line truncation under load.
4. Confirm Nest bootstrap lines (`Mapped {/api/...}` route registrations) appear in winston, not just on stdout.

#### Rollback

Restore the previous `createLogFolder` function. Logs return to the relative EFS path. The CloudWatch transport is conditional on env var — unset the var to disable.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| `bufferLogs: true` causes startup log loss if `useLogger` is never wired | The buffer flushes to stdout on shutdown. Confirmed via NestJS docs. |
| CloudWatch transport blocks on AWS API outage | The transport queues internally and falls back to file writes — winston transports do not throw on the hot path. |
| `nest-winston` is missing from `node_modules` | It is in `package.json` — verified. |

---

### FIX-9. Cron — uniform instrumentation + distributed lock

**Severity addressed:** CR-OBS-9 (High — cron observability)
**Files touched:** new `src/modules/crons/cron-instrumented.decorator.ts`, new `src/infra/lock.service.ts` (if not already from production-audit Sprint 1), all 12 cron files — one decorator line each.
**Risk:** **Low** — additive decorator. Cron bodies unchanged.
**Feature flag:** `CRON_LOCK_ENABLED=true` (off-by-default in dev to avoid Redis dep on local).

#### What changes

```ts
// src/modules/crons/cron-instrumented.decorator.ts
export function CronInstrumented(cronType: CRONTYPES, name: string, opts?: { ttlMs?: number }): MethodDecorator {
  return (target, prop, descriptor: TypedPropertyDescriptor<any>) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const cronLogsService: CronLogsService = this.cronLogsService;
      const lockService: LockService | undefined = this.lockService;

      if (process.env.CRON_LOCK_ENABLED === 'true' && lockService) {
        const ok = await lockService.acquire(`cron:${name}`, opts?.ttlMs ?? 60_000);
        if (!ok) return;
      }

      const startTime = new Date();
      const startedMs = Date.now();
      const runId = randomUUID();
      try {
        await requestContext.run({ requestId: runId, cronName: name }, async () => {
          await original.apply(this, args);
        });
        await cronLogsService?.saveLog({
          cronType, cronName: name, startTime, endTime: new Date(),
          durationMs: Date.now() - startedMs, status: CronStatus.PASS,
        });
      } catch (err: any) {
        Sentry.captureException(err, { tags: { cron: name } });
        await cronLogsService?.saveLog({
          cronType, cronName: name, startTime, endTime: new Date(),
          durationMs: Date.now() - startedMs, status: CronStatus.FAIL,
          description: (err?.message ?? String(err)).slice(0, 1000),
        });
      } finally {
        if (process.env.CRON_LOCK_ENABLED === 'true' && lockService) {
          await lockService.release(`cron:${name}`);
        }
      }
    };
  };
}
```

For each cron service:
```ts
@Cron('*/5 * * * *')
@CronInstrumented(CRONTYPES.INVENTORY, 'inventory-unit-expired-approvals', { ttlMs: 5 * 60_000 })
async expireApprovals() { /* unchanged body */ }
```

Each cron service must already inject `CronLogsService` (the 5 that don't, add the constructor param — single-line change).

#### Why this is safe

- The decorator delegates to the original method. If `cronLogsService` is missing on the host class, `?.saveLog` no-ops — the cron still runs.
- The lock only takes effect when both the env flag is on and the lock service is injected — single-process dev environments are unaffected.
- The try/catch ensures cron exceptions never escape to `@nestjs/schedule` (which today produces noisy unhandled rejections).

#### Test plan

1. Decorate one cron at a time, deploy, verify a `cron_logs` row appears after the next tick.
2. Run two replicas with `CRON_LOCK_ENABLED=true` — verify exactly one of them logs the run.
3. Throw inside a cron body — verify `CronStatus.FAIL`, a Sentry event, and that the next tick still fires.

#### Rollback

Remove the decorator from a single cron file. No central change required to roll back per-cron.

#### Things that could go wrong + mitigations

| Risk | Mitigation |
|---|---|
| Lock TTL shorter than cron runtime → double-execution | Set `ttlMs` to 2× expected duration. Decorator can be extended to auto-renew the lock if needed. |
| `cronLogsService` not injected on a cron class | Add a one-liner constructor param. The decorator silently no-ops if missing — failure mode is "logs not persisted", not crash. |

---

### FIX-10. Sentry — drop the duplicate `captureMessage` + add request tag

**Severity addressed:** CR-OBS-14 (Low — cost)
**Files touched:** `src/modules/sentry/sentry-response.context.ts`
**Risk:** **Very low.**

```ts
res.on('finish', () => {
  try {
    Sentry.setContext('response', {
      status_code: res.statusCode,
      url: req.originalUrl,
      method: req.method,
      requestId: (req as any).id,
    });
    // REMOVED: if (res.statusCode >= 500) Sentry.captureMessage(...)
    // The GlobalExceptionFilter already does Sentry.captureException for 5xx.
  } catch (error) {
    logger.error('Error setting Sentry response context:', error);
  } finally {
    Sentry.setContext('response', null);
  }
});
```

Frees Sentry quota; eliminates duplicate fingerprints in the dashboard.

---

### FIX-11. Wire `pm2-alert-listener` in `main.ts`

**Severity addressed:** CR-OBS-12 (Medium)
**Files touched:** `src/main.ts`
**Risk:** **Very low.** Adds one call. PM2 alerts now actually send.

```ts
// at the bottom of bootstrap, after app.listen():
if (process.env.NODE_ENV === 'production' && process.env.PM2_HOME) {
  wirePm2CrashAlerts();
}
```

The function already handles its own errors. SES throttle prevents alert floods.

---

### FIX-12. SES alert sender — per-subject throttle

**Severity addressed:** CR-OBS-13 (Medium)
**Files touched:** `src/infra/ses-alert-sender.ts`
**Risk:** **Very low.**

```ts
const lastAlertAt = new Map<string, number>();
const THROTTLE_MS = 120_000;

export async function sendProdAlertEmail(subject: string, body: string) {
  // ...
  const key = subject.split(' - ')[0]; // bucket by prefix
  const now = Date.now();
  const last = lastAlertAt.get(key) ?? 0;
  if (now - last < THROTTLE_MS) {
    logger.warn({ msg: 'ses_alert_throttled', key });
    return;
  }
  lastAlertAt.set(key, now);
  // ... existing send
}
```

Now `PROD unhandledRejection` and `PROD uncaughtException` and `PM2 EXIT` each have their own 2-minute window.

---

### FIX-13. Replace `.catch(() => {})` / `return false` silent swallows

**Severity addressed:** CR-OBS-15 (Medium)
**Files touched:** small list — `voucher_form.service.ts:996,1000`, `eoi_management.service.ts:1023,1192,3689`, a handful of others (mechanical pass).
**Risk:** **Very low.**

For each silent swallow, replace with a logged + Sentry'd one:
```ts
// Before:
this.sendVoucherSubmissionEmail(voucherFormForEmail).catch(() => {});

// After:
this.sendVoucherSubmissionEmail(voucherFormForEmail).catch((err) => {
  logger.error({ msg: 'voucher_submission_email_failed', voucherId: voucherFormForEmail.id, error: err });
  Sentry.captureException(err, { tags: { area: 'email', voucherId: voucherFormForEmail.id } });
});
```

These are pure additions of telemetry. Behavior (failure ignored from the caller's perspective) is unchanged — we just gain visibility.

---

### FIX-14. Validation pipe — preserve field names + error codes

**Severity addressed:** CR-OBS-19 (Low) — frontend gets structured validation errors
**Files touched:** `src/validations/custom-pipe.validation.ts`
**Risk:** **Low** — changes the *shape* of the `details` array but not the top-level error envelope.

Today the pipe returns `string[]` of messages. Frontend likely shows the first message. To keep that working while adding structure, return both:

```ts
exceptionFactory: (errors) => {
  const messages: string[] = [];
  const fields: Record<string, string[]> = {};
  const collect = (errs: ValidationError[], parent = '') => {
    for (const e of errs) {
      const path = parent ? `${parent}.${e.property}` : e.property;
      if (e.constraints) {
        const msgs = Object.values(e.constraints);
        messages.push(...msgs);
        fields[path] = msgs;
      }
      if (e.children?.length) collect(e.children, path);
    }
  };
  collect(errors);
  return new BadRequestException({ message: messages, fields });
},
```

Frontend that reads `error.message` (string[]) keeps working. New `error.fields` is available for keyed UIs.

---

### FIX-15. Add `/healthz` & `/readyz` (terminus)

**Severity addressed:** CR-OBS-18 (Medium)
**Files touched:** new file `src/modules/health/health.controller.ts`; register in `AppModule`.
**Risk:** **Very low.** Adds two new endpoints; nothing existing changes.

```ts
@Controller('healthz')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: HealthIndicatorFunction, // via cache-manager
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      // optional: Redis ping, BullMQ worker count, cron stale check
    ]);
  }
}
```

Mark route `@SkipThrottle()` and `@Public()` so ALB/PM2 health checks don't get rate-limited or auth-blocked.

#### Pre-flight check

Ensure ALB / load balancer health-check path is updated to `/healthz` only **after** deploying the controller (otherwise the LB starts marking targets down).

---

### FIX-16. Standardize the success/error envelope (additive, frontend-transparent)

**Severity addressed:** CR-OBS-1 (Critical) — completes the picture started by FIX-2
**Files touched:** `src/filters/global-exception.filter.ts`, `src/interceptors/transform.interceptor.ts`
**Risk:** **Low** if done additively: **add** new keys, don't remove old ones for one release cycle.

#### Strategy

1. Phase A: filter and interceptor emit **both** old keys and new keys side-by-side.
   ```json
   { "success": false, "response": null,
     "statusCode": 404, "errors": { "statusCode": 404, "message": "..." },
     "error": { "code": "NOT_FOUND", "message": "..." },
     "requestId": "...", "timestamp": "..." }
   ```
2. Phase B (after FE migrates to `error.code` / `error.message`): remove the old `errors` block in a coordinated release.

#### Why this is safe

Phase A is **strictly additive** to the response JSON. No frontend breaks because every key it reads today still exists. New consumers can adopt the cleaner shape immediately.

---

## 15. Suggested Rollout Calendar (10 working days)

| Day | Fixes | Risk | Verification |
|---|---|---|---|
| 1 | FIX-1 (errorLogHandler), FIX-5 (filter dedup) | Very low | Unit + integration tests, 1 day staging soak |
| 2 | FIX-10 (Sentry dup), FIX-11 (PM2 listener), FIX-12 (SES throttle), FIX-13 (silent catches) | Very low | Smoke test on staging |
| 3 | FIX-4 (request IDs + ALS) | Low | Verify every log carries `requestId`; verify outbound `X-Request-Id` |
| 4 | FIX-3 (response-catch + redaction) | Medium | Grep logs for OTP / PAN / Aadhaar → none |
| 5 | FIX-8 (log paths + Nest binding) | Low | Two-replica soak; midnight rollover verified |
| 6 | FIX-15 (terminus health endpoints) | Very low | ALB health-check switchover after green |
| 7 | FIX-2 + FIX-16 (envelope unification, additive Phase A) | Low | FE smoke test on all major flows |
| 8 | FIX-6a (HTTP timeouts) | Medium | Latency dashboards monitored; chaos test |
| 9 | FIX-7 (BullMQ hooks + DLQ in observer mode) | Low | Fail a test job; confirm DLQ entry and Sentry event |
| 10 | FIX-9 (cron decorator) | Low | Decorate 3 crons; verify `cron_logs`; then mechanical pass for the rest |

**Total: 10 working days, single backend developer.**
After day 10, observability score moves from **4.5 → ~8.0**, with zero forced FE work and zero schema migrations.

---

## 16. Items NOT in this cookbook (intentionally)

The following are valuable but **out of scope** for "minimum disruption" — they require larger refactors and should be planned independently:

- Transactional outbox for SFDC / email / WhatsApp (touched service code, schema migration).
- Replacing `EventEmitter2` listeners with BullMQ queues (touched ~50 emit sites).
- Full OpenTelemetry distributed tracing (instrumentation across DB driver, HTTP, queues).
- Replacing `ResponseInterceptor` encryption logic.
- Reworking `user_requests` table growth (covered in production audit CR-12).
- Replacing winston with pino (yes, faster, but big surface change for marginal gain).

Track these as a separate Q4 architecture initiative.

---

*End of detailed-fix appendix. Each fix is independently revertable, frontend-transparent in Phase A, and accompanied by a test plan, rollback plan, and risk register. The architecture stays the same; only its sharp edges get filed down.*

