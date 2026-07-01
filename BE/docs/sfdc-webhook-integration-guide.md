# SFDC → Puravankara Lead-Change Webhook — Integration Guide

This document describes how the Salesforce team should push lead /
voucher change events to the Puravankara backend.

The endpoint accepts one event per request, validates the payload, and
acknowledges with `202 Accepted` once the change has been queued for
review. The endpoint is idempotent — re-sending an identical payload
within a few minutes is safe and will not create duplicates.

---

## 1. Environments

| Environment | Base URL                                                    |
| ----------- | ----------------------------------------------------------- |
| Sandbox     | `https://dev-api.puravankaraprojects.com/api/dev/`          |
| Production  | `https://bookingform-api.puravankaraprojects.com/api/prod/` |

All paths in this document are relative to the base URL above.

---

## 2. Endpoint

```
POST {BASE_URL}sfdc/webhooks/lead-changes
```

Full sandbox URL:

```
POST https://dev-api.puravankaraprojects.com/api/dev/sfdc/webhooks/lead-changes
```

- **Method**: `POST`
- **Content-Type**: `application/json; charset=utf-8`
- **TLS**: required (HTTPS only)
- **Max payload size**: 10 MB (well above the expected event size)

---

## 3. Credentials

Puravankara will issue you **two values** per environment, out of band
(over a secure channel — never embedded in payloads or URLs):

| Name         | Example                              | Purpose                                              |
| ------------ | ------------------------------------ | ---------------------------------------------------- |
| API Key      | `sfdc-prod-9f3a…`                    | Identifies your SFDC integration on every request    |
| API Secret   | `b7e1c2…` (a random 32-byte string)  | Shared HMAC key used to sign every request body      |

**Important**

- Treat the API Secret like a password. Store it in your SFDC named-credential
  / secret manager — do **not** commit it to repos, paste it in logs, or
  send it inside a payload.
- If the secret is ever exposed, contact the Puravankara team and we
  will rotate it; the new value must be redeployed on your side before
  the next push.
- Sandbox and production have **different** API Key + Secret pairs.

---

## 4. Required Headers

Every request **must** include the following headers in addition to
`Content-Type`:

| Header        | Value                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `X-API-Key`   | The API Key issued for your environment                                 |
| `X-Timestamp` | Current time as a **Unix epoch in seconds** (integer, e.g. `1780312043`) |
| `X-Signature` | Hex-encoded HMAC-SHA256 of the canonical string (see §5)                |
| `X-Request-Id`| _(Optional but recommended)_ a unique correlation id per request, e.g. a UUID |

Notes:

- `X-Timestamp` must be within **±5 minutes** of server time. Requests
  outside this window are rejected as stale. Make sure your SFDC org's
  clock is NTP-synced.
- All three auth headers must be sent **as scalar values**, not as
  repeated/array headers.
- `X-Request-Id` is logged on our side and is the fastest way for us to
  find a specific request if you need to debug a 4xx / 5xx response.

---

## 5. How to Compute `X-Signature`

The signature proves that (a) the request came from a holder of the
shared secret, and (b) the body has not been modified in transit.

### 5.1 Canonical string

Concatenate the timestamp and the **exact JSON request body** with a
single literal dot (`.`) between them:

```
canonicalString = X-Timestamp + "." + requestBody
```

Where `requestBody` is the raw bytes you will send on the wire — the
same string that Puravankara receives.

> **Critical:** sign the **exact bytes** you will transmit. If you
> serialize the JSON object twice, or re-serialize it with different
> whitespace / key ordering between signing and sending, the signature
> will not match. The safe pattern is:
>
> 1. Build the JSON object.
> 2. Serialize it to a string **once** and store it in a variable.
> 3. Compute the signature over that string.
> 4. Send that exact string as the HTTP body.

### 5.2 HMAC

Compute:

```
X-Signature = lowercase_hex( HMAC_SHA256(canonicalString, apiSecret) )
```

- Algorithm: **HMAC-SHA256**
- Key: your **API Secret** (UTF-8 bytes of the string we shared)
- Message: the canonical string above (UTF-8 bytes)
- Output encoding: **lowercase hexadecimal** (64 characters)

### 5.3 Worked example

Given:

- `API Secret` = `super-secret-shared-key`
- `X-Timestamp` = `1780312043`
- Request body (exact bytes sent on the wire):
  ```
  {"PRID":"PRID-001","Lead Status":"Hot"}
  ```

Then:

- `canonicalString` = `1780312043.{"PRID":"PRID-001","Lead Status":"Hot"}`
- `X-Signature` = `89c0e4...` _(64 lowercase hex chars; compute on your side)_

---

## 6. Request Body

The body is a single JSON object describing one lead/voucher change
event. Field names use **spaced PascalCase** exactly as shown.

### 6.1 Required field

| Field  | Type   | Description                                                 |
| ------ | ------ | ----------------------------------------------------------- |
| `PRID` | string | Puravankara Reference ID identifying the voucher to update. |

### 6.2 Optional fields

Send only the fields that have actually changed. Any field listed below
that is omitted will be left untouched on our side. To explicitly clear
a value, send `null`. Whitespace is trimmed and empty strings are
treated as "no change".

| Field                   | Type            |
| ----------------------- | --------------- |
| `Lead Status`           | string \| null  |
| `SVH Status`            | string \| null  |
| `Primary Source`        | string \| null  |
| `Secondary Source`      | string \| null  |
| `Tertiary Source`       | string \| null  |
| `Channel Partner Name`  | string \| null  |
| `Name of Referrer`      | string \| null  |
| `Referrer Project Name` | string \| null  |
| `Referrer Unit No`      | string \| null  |
| `Referred Opportunity`  | string \| null  |
| `Referred Employee`     | string \| null  |
| `Lead Owner`            | string \| null  |
| `STM2`                  | string \| null  |

Any **additional** field you send that is not in this list will be
silently ignored — it will not cause the request to fail, but it also
will not be acted upon. If you need a new field added to this list,
raise it with the Puravankara team.

### 6.3 Example body

```json
{
  "PRID": "PRID-001",
  "Lead Status": "Hot",
  "Primary Source": "Web",
  "Secondary Source": "Campaign",
  "Channel Partner Name": "Acme CP"
}
```

---

## 7. Responses

### 7.1 Success — `202 Accepted`

The change has been accepted and queued for review. The body has the
following shape:

```json
{
  "statusCode": 202,
  "message": "SFDC change request queued for admin review.",
  "data": {
    "requestId": "b7c2…-uuid",
    "prid": "PRID-001",
    "voucherId": 42,
    "status": "PENDING",
    "changedFields": ["leadStatus", "primarySource"],
    "duplicate": false
  }
}
```

- `requestId` — opaque identifier for the queued request; keep it on
  the SFDC side for traceability.
- `duplicate: true` indicates an identical request was already pending
  review for this PRID; no new work was queued. This is the expected
  behavior on retries and is **not** an error — treat it as success.

### 7.2 Error responses

| HTTP | Meaning                       | When                                                                                                              | Action                                                                            |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 400  | Validation failure            | `PRID` missing, or a field has the wrong type (e.g. a number where a string is expected).                         | Fix the payload. Do not retry without changes.                                    |
| 401  | Authentication failure        | Missing/invalid `X-API-Key`, `X-Timestamp` out of the 5-minute window, bad signature, or revoked API key.         | Re-check headers, clock, and signature. Do not retry blindly — see §8.            |
| 404  | PRID not found                | The `PRID` does not match any voucher on our side.                                                                | Stop retrying; surface the failure on SFDC. Reach out if you believe it's a bug.  |
| 5xx  | Server-side error             | Transient infrastructure issue on our side.                                                                       | Retry with exponential backoff (see §8). Same body **and** a fresh `X-Timestamp` + recomputed `X-Signature`. |

Error response body shape:

```json
{
  "statusCode": 401,
  "message": "Invalid signature"
}
```

We deliberately use a generic message on `401` so we don't leak which
part of the auth failed. If you need to debug, send the `X-Request-Id`
to the Puravankara team and we will look up the cause in our logs.

---

## 8. Retry & Idempotency Guidelines

- **Idempotency**: re-sending the **exact same payload** for the same
  PRID within a short window is safe — we deduplicate on our side and
  will return `duplicate: true`. Use this to recover from network
  hiccups without worrying about creating duplicate review tasks.
- **Retry policy** (recommended):
  - On `5xx` or network timeout: retry up to 5 times with exponential
    backoff (e.g. 2s, 4s, 8s, 16s, 32s).
  - On `401` / `400` / `404`: **do not retry blindly** — fix the cause
    first.
- **Re-sign on every retry**: every retry must use a **fresh
  `X-Timestamp`** (current time at retry) and a **recomputed
  `X-Signature`**. Re-using the original signature past the 5-minute
  window will fail.
- **Do not parallelize**: send events for a given PRID **serially**
  in the order they occurred in SFDC. We process in the order received.

---

## 9. Reference Implementations

The following snippets are illustrative — adapt to your runtime.

### 9.1 Apex (Salesforce)

```apex
public class PuravankaraWebhookClient {
    private static final String BASE_URL =
        'https://dev-api.puravankaraprojects.com/api/dev/';
    private static final String API_KEY = '<<your API key>>';
    // Read from a Protected Custom Setting or Named Credential — never hardcode.
    private static final String API_SECRET = '<<your API secret>>';

    public static HttpResponse sendLeadChange(Map<String, Object> payload) {
        // 1. Serialize ONCE and keep the exact string.
        String body = JSON.serialize(payload);

        // 2. Unix epoch in seconds.
        String ts = String.valueOf(DateTime.now().getTime() / 1000);

        // 3. HMAC-SHA256(timestamp + "." + body, secret) → lowercase hex.
        Blob mac = Crypto.generateMac(
            'HmacSHA256',
            Blob.valueOf(ts + '.' + body),
            Blob.valueOf(API_SECRET)
        );
        String signature = EncodingUtil.convertToHex(mac); // lowercase hex

        // 4. Send the EXACT same `body` string we just signed.
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + 'sfdc/webhooks/lead-changes');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json; charset=utf-8');
        req.setHeader('X-API-Key', API_KEY);
        req.setHeader('X-Timestamp', ts);
        req.setHeader('X-Signature', signature);
        req.setHeader('X-Request-Id', '<<uuid per request>>');
        req.setBody(body);

        return new Http().send(req);
    }
}
```

### 9.2 Node.js (for local testing / quick scripts)

```js
const crypto = require('crypto');

const BASE_URL = 'https://dev-api.puravankaraprojects.com/api/dev/';
const API_KEY = process.env.PURAVANKARA_API_KEY;
const API_SECRET = process.env.PURAVANKARA_API_SECRET;

async function sendLeadChange(payload) {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(`${ts}.${body}`, 'utf8')
    .digest('hex');

  const res = await fetch(`${BASE_URL}sfdc/webhooks/lead-changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-API-Key': API_KEY,
      'X-Timestamp': ts,
      'X-Signature': signature,
      'X-Request-Id': crypto.randomUUID(),
    },
    body, // exact same string used in the HMAC
  });

  return { status: res.status, body: await res.json() };
}
```

### 9.3 cURL (manual verification)

```bash
BODY='{"PRID":"PRID-001","Lead Status":"Hot"}'
TS=$(date +%s)
SIG=$(printf "%s.%s" "$TS" "$BODY" \
  | openssl dgst -sha256 -hmac "$API_SECRET" \
  | awk '{print $2}')

curl -X POST "https://dev-api.puravankaraprojects.com/api/dev/sfdc/webhooks/lead-changes" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Timestamp: $TS" \
  -H "X-Signature: $SIG" \
  -H "X-Request-Id: $(uuidgen)" \
  --data-binary "$BODY"
```

> Use `--data-binary` (not `--data`) so cURL transmits the body
> byte-for-byte and does not strip newlines.

---

## 10. Smoke-Test Checklist

Before going live, please confirm:

- [ ] Sandbox credentials received and stored in a secret manager (not in code).
- [ ] System clock on the calling host is NTP-synced (drift ≤ 30 s).
- [ ] A `POST` against sandbox with a valid PRID returns `202` with a `requestId`.
- [ ] A `POST` with a deliberately wrong `X-Signature` returns `401`.
- [ ] A `POST` with an `X-Timestamp` older than 10 minutes returns `401`.
- [ ] A `POST` with an unknown `PRID` returns `404`.
- [ ] An immediate retry of the same successful payload returns `202` with `duplicate: true`.

---

## 11. Contact

For credential provisioning, rotation, or any integration issue please
reach out to the Puravankara integrations team and include:

- Environment (sandbox / production)
- `X-Request-Id` of the failing call
- Timestamp and HTTP status received
- (If safe) the exact request body sent
