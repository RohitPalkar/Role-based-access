/**
 * Normalizes typical portal BE mutation bodies: top-level `success`, nested
 * `response.response` / `response` shapes, and optional success `message`.
 * Reuse for POST/PATCH handlers that share the same envelope as EOI voucher APIs.
 */
export interface ApiMutationResult<T = unknown> {
  data: T;
  message?: string;
}

export function normalizeApiMutationResponse(axiosData: unknown): ApiMutationResult {
  if (axiosData == null || typeof axiosData !== 'object') {
    return { data: axiosData as any };
  }

  const body = axiosData as Record<string, any>;

  if (body.success === false || body.success === 'false') {
    const msg =
      body.response?.response?.message ??
      body.response?.message ??
      body.message ??
      body.errors?.message;
    const text = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(text || 'Something went wrong');
  }

  const nestedData =
    body.response?.response?.data ?? body.response?.data ?? body.data;

  const messageRaw =
    body.response?.response?.message ?? body.response?.message ?? body.message;
  const message = typeof messageRaw === 'string' ? messageRaw : undefined;

  const isWrapper = 'success' in body || body.response != null;

  let resolvedData: any;
  if (nestedData !== undefined) {
    resolvedData = nestedData;
  } else if (isWrapper) {
    resolvedData = undefined;
  } else {
    resolvedData = body;
  }

  return { data: resolvedData, message };
}
