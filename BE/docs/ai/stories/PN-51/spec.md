# PN-51: Pine lab base setup

## Overview

Establish a reusable, production-ready integration layer for Pine Labs third-party APIs in the NestJS backend. The layer centralizes authentication, environment-specific configuration, and a generic API execution flow so all five initial Pine Labs APIs share one pattern and future APIs can be added through configuration alone.

## Goal

Deliver a maintainable Pine Labs integration foundation with:

- Cached token authentication with automatic refresh
- A centralized config module (URLs, paths, payload mappings, headers)
- A generic executor that routes calls by `apiName`
- Standardized success/error handling, including one retry on token expiry (401)

This story is **base infrastructure only**. It does not implement business workflows or public REST endpoints that consume these APIs; downstream stories will call the integration layer.

## Background

- **Project:** NestJS backend API (`repositoryRole: backend-api-only`)
- **API style:** REST with global prefix `api` (non-prod: `api/{NODE_ENV}`)
- **Response envelope (app APIs):** `success-response-errors`
- **Branch:** `feature/PN-51`
- **Input type:** Jira story
- No prior Pine Labs story specs exist in `docs/ai/stories/`; this is the first integration story for Pine Labs.

## Scope

### In scope

1. **Authentication handling**
   - Token generation/retrieval function that:
     - Checks for an active (non-expired) Pine Labs token
     - Reuses the cached token when valid
     - Regenerates, persists, and returns a new token when missing or expired
     - Persists expiry metadata with the stored token

2. **Centralized configuration module**
   - Environment-specific base URLs for **dev**, **uat**, and **prod**
   - API path definitions for all five Pine Labs APIs:
     - `customercreateOrUpdate`
     - `customerfetch`
     - `redeemPonts`
     - `markEligible`
     - `getUserPoolBalance`
   - Request payload templates / field-mapping definitions per API
   - Required headers and auth configuration
   - **No hardcoded URLs or request payloads inside service/executor code**

3. **Generic API executor**
   - Single entry function accepting:
     - `apiName` — identifies which Pine Labs API to call
     - `data` — caller-supplied input to map into the request body
   - Responsibilities:
     - Resolve API config by `apiName`
     - Map `data` into the request payload using config-defined structure
     - Obtain a valid auth token
     - Execute the HTTP call to Pine Labs
     - Return a standardized success/error result

4. **Error and response handling**
   - Centralized response normalization for Pine Labs responses
   - On HTTP **401** (token expiry): invalidate/refresh token, retry the request **once**
   - Log failures with **API name** and **correlation ID**

5. **Design structure**
   - Clear separation of concerns:
     - **Auth** — token lifecycle
     - **Config** — URLs, paths, mappings, headers
     - **Execution** — generic caller and response handling
   - Extensible so additional Pine Labs APIs require config changes only (no executor rewrite)

### Out of scope

- NestJS controllers or public REST endpoints that expose Pine Labs operations to clients
- End-to-end business flows (customer onboarding, redemption, eligibility marking, balance queries) that orchestrate domain logic around these APIs
- Frontend or UI work
- Database schema changes for business entities (unless token persistence requires a minimal storage mechanism aligned with existing project patterns)
- Full integration tests against live Pine Labs environments (may be covered in a follow-up story)
- Pine Labs webhook handling or callback endpoints

## Requirements

### R1 — Authentication

| ID | Requirement |
|----|-------------|
| R1.1 | Provide a function to obtain a valid Pine Labs access token for outbound API calls. |
| R1.2 | Before generating a new token, check whether a stored token exists and is not expired. |
| R1.3 | If a valid token exists, return it without calling Pine Labs auth. |
| R1.4 | If no token exists or the token is expired, call Pine Labs auth, store the new token, and persist expiry metadata. |
| R1.5 | Token storage and expiry evaluation must be reliable under concurrent requests (avoid duplicate auth storms where practical). |

### R2 — Centralized configuration

| ID | Requirement |
|----|-------------|
| R2.1 | Create a Pine Labs config module (or equivalent structured config) as the single source of truth for integration settings. |
| R2.2 | Define environment-specific base URLs for dev, uat, and prod, selected by application environment (`NODE_ENV` or existing env convention). |
| R2.3 | Register API path/endpoint definitions for all five APIs listed in scope. |
| R2.4 | Define request payload templates or field-mapping rules per API so caller `data` can be transformed consistently. |
| R2.5 | Define required HTTP headers (including auth-related headers) per API or globally as appropriate. |
| R2.6 | Define auth endpoint/credentials configuration (via environment variables or existing config service — not hardcoded secrets). |
| R2.7 | Service and executor code must reference config only; no inline URLs, paths, or payload shapes. |

### R3 — Generic API executor

| ID | Requirement |
|----|-------------|
| R3.1 | Expose a generic executor function with signature conceptually `(apiName, data) => standardizedResult`. |
| R3.2 | Resolve the correct API definition from config using `apiName`. |
| R3.3 | Transform `data` into the Pine Labs request payload using the config mapping for that API. |
| R3.4 | Attach required headers and a valid auth token before sending the request. |
| R3.5 | Perform the HTTP request to the configured Pine Labs endpoint. |
| R3.6 | Normalize and return success and error outcomes in a consistent internal format. |
| R3.7 | Reject or fail clearly when `apiName` is unknown or config is incomplete. |

### R4 — Error and response handling

| ID | Requirement |
|----|-------------|
| R4.1 | Normalize Pine Labs responses (success and failure) through a single response-handling path. |
| R4.2 | On HTTP **401**, treat as token expiry: refresh/regenerate token and **retry the same API call once**. |
| R4.3 | If retry also fails, return/log a normalized error without further retry loops. |
| R4.4 | Log failures with at minimum: API name, correlation ID, error summary, and relevant HTTP status/body (sanitized — no secrets). |
| R4.5 | Propagate enough error detail for upstream callers to handle failures without leaking credentials. |

### R5 — Extensibility and maintainability

| ID | Requirement |
|----|-------------|
| R5.1 | All five listed APIs must use the same auth → config → execute flow. |
| R5.2 | Adding a sixth Pine Labs API should require config entries (and tests), not changes to core executor logic. |
| R5.3 | Module boundaries must remain: auth module/service, config module, executor/service. |

## Acceptance Criteria

### Authentication

- **AC-1:** When a non-expired Pine Labs token exists in storage, the auth function returns it without invoking Pine Labs auth.
- **AC-2:** When no token exists, the auth function generates a new token, stores it with expiry metadata, and returns it.
- **AC-3:** When a stored token is expired, the auth function regenerates, replaces stored token + expiry, and returns the new token.
- **AC-4:** Expiry metadata is sufficient to determine validity without calling Pine Labs on every request.

### Configuration

- **AC-5:** A Pine Labs config module exists with separate base URLs for dev, uat, and prod.
- **AC-6:** Config defines paths/endpoints for: `customercreateOrUpdate`, `customerfetch`, `redeemPonts`, `markEligible`, `getUserPoolBalance`.
- **AC-7:** Each of the five APIs has a config-defined payload mapping/template.
- **AC-8:** Required headers and auth settings are defined in config, not duplicated in executor code.
- **AC-9:** Grep/review of Pine Labs service/executor files shows no hardcoded URLs or raw payload structures for these APIs.

### Generic executor

- **AC-10:** A generic executor accepts `apiName` and `data` and routes to the correct Pine Labs API via config.
- **AC-11:** Caller `data` is mapped into the outbound request body using the config for the given `apiName`.
- **AC-12:** Executor obtains a valid token before each outbound call (via the auth function).
- **AC-13:** Executor returns results in a standardized internal format for both success and failure.
- **AC-14:** Unknown `apiName` produces a clear, handled error (no silent misrouting).

### Error handling

- **AC-15:** Pine Labs responses pass through centralized normalization.
- **AC-16:** On 401, the executor refreshes the token and retries the request exactly once.
- **AC-17:** After a failed retry, a normalized error is returned and a log entry is written.
- **AC-18:** Failure logs include API name and correlation ID.

### Design and extensibility

- **AC-19:** Auth, config, and execution responsibilities live in separate modules/services with no circular coupling.
- **AC-20:** All five APIs are invocable through the same executor interface.
- **AC-21:** A hypothetical sixth API can be added by extending config (and mappings) without modifying executor control flow.

## Pine Labs APIs (initial set)

| `apiName` (config key) | Purpose (inferred) |
|------------------------|--------------------|
| `customercreateOrUpdate` | Create or update a Pine Labs customer record |
| `customerfetch` | Fetch customer details from Pine Labs |
| `redeemPonts` | Redeem loyalty/reward points (spelling per story) |
| `markEligible` | Mark a customer/user as eligible for a program or offer |
| `getUserPoolBalance` | Retrieve user pool balance from Pine Labs |

Exact HTTP methods, path suffixes, and request/response schemas must be taken from Pine Labs API documentation during implementation.

## Implementation Notes

- **Repository role:** Backend-only NestJS service; follow existing module/service patterns discovered during codebase analysis (e.g., other third-party integrations if present).
- **Environment selection:** Use the project's established pattern for dev/uat/prod config (`NODE_ENV` and existing config loading).
- **HTTP client:** Reuse the project's standard HTTP client abstraction (e.g., Axios/`HttpService`) rather than introducing a new client library.
- **Token persistence:** Prefer an existing cache/store pattern in the codebase (Redis, DB, in-memory with TTL) if one exists for similar integrations; avoid ad-hoc global variables.
- **Concurrency:** Consider lock/debounce or single-flight behavior when multiple requests detect an expired token simultaneously.
- **Correlation ID:** Accept or generate a correlation ID at the executor boundary and pass it through logs (and optionally outbound headers if Pine Labs supports it).
- **Secrets:** Pine Labs credentials, client IDs, and secrets must come from environment variables or the existing secrets/config mechanism — never committed to source.
- **Config shape:** Favor a typed config structure (interfaces/enums for `apiName`) to prevent typos and enable compile-time checks.
- **Response normalization:** Map Pine Labs success/error payloads into an internal DTO that upstream modules can consume consistently; do not leak raw third-party response shapes beyond the integration boundary.
- **Testing:** Unit tests should cover token cache hit/miss/expiry, config-driven payload mapping, 401 retry-once behavior, and unknown `apiName` handling. Mock HTTP and auth dependencies.
- **Naming:** Use consistent module naming (e.g., `pine-labs` or `pinelabs`) aligned with repository conventions once codebase analyzer confirms existing patterns.

## UI Notes

Not applicable — backend integration layer only; no UI changes.

## Open Questions

1. **Pine Labs API documentation:** Where is the official API spec (Swagger/PDF/internal doc) for auth, endpoints, headers, and payload schemas for all five APIs?
2. **Auth flow details:** What is the Pine Labs token endpoint, grant type, request/response shape, and token TTL?
3. **Environment URLs:** What are the exact dev, uat, and prod base URLs?
4. **HTTP methods:** Is each API POST, GET, or mixed? What are the full path suffixes under each base URL?
5. **Payload schemas:** What are the required/optional fields for each of the five APIs?
6. **Token storage:** Should tokens be stored in Redis, database, or in-process cache? Is there an existing pattern for third-party OAuth/token caching in this repo?
7. **`redeemPonts` spelling:** Is the API identifier intentionally `redeemPonts` (story spelling) or should the config key be `redeemPoints`?
8. **Correlation ID source:** Should the executor require callers to pass a correlation ID, or generate one internally (e.g., UUID)?
9. **Retry scope:** On 401 retry, should the original request body/headers be replayed verbatim after token refresh?
10. **Error mapping:** Are there Pine Labs-specific error codes that must map to application error types now, or is raw normalization sufficient for this base story?

## Assumptions

- This story delivers an **internal integration module** callable by future NestJS services; no new public REST routes are required unless implementation planning discovers a project mandate to expose health/diagnostic endpoints.
- The five API names in the story (`customercreateOrUpdate`, `customerfetch`, `redeemPonts`, `markEligible`, `getUserPoolBalance`) are the canonical config keys unless Pine Labs documentation specifies different endpoint identifiers.
- `redeemPonts` reflects the story/Jira spelling; implementers should verify against Pine Labs docs and alias if the vendor uses a different name.
- Pine Labs authentication produces a bearer-style token (or equivalent) usable across all five APIs; separate auth per API is not expected.
- A single retry after 401 is sufficient for this base layer; exponential backoff and circuit breaking are out of scope unless already standard for third-party calls in this codebase.
- Environment-specific credentials will be supplied via deployment configuration, not hardcoded in the repo.
- Unit tests with mocked HTTP are expected; live Pine Labs connectivity validation may be manual or deferred.

## References

- Story key: **PN-51**
- Branch: **feature/PN-51**
- Context map: `docs/ai/context-map.json` (selected entries: backend-api-only, REST, `success-response-errors` envelope)
- Project context (for later pipeline steps): `docs/ai/project-context.md`
- Codebase analyzer entry: `.opencode/agents/codebase-analyzer.md`
