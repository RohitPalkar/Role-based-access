import type { FC } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import { useMemo } from 'react';

import { Box } from '@mui/material';

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Avoid freezing the UI on very large payloads. */
const JSON_VIEW_MAX_CHARS = 500_000;

/**
 * Reads one JSON string token from opening `"`. Linear time, no backtracking regex.
 */
function readJsonStringToken(
  raw: string,
  start: number
): { endExclusive: number; token: string } {
  if (raw[start] !== '"') {
    return { endExclusive: start + 1, token: raw[start] ?? '' };
  }
  let j = start + 1;
  const len = raw.length;
  while (j < len) {
    const c = raw[j];
    if (c === '\\') {
      if (j + 1 >= len) {
        return { endExclusive: len, token: raw.slice(start) };
      }
      const next = raw[j + 1];
      if (next === 'u' && j + 5 < len) {
        j += 6;
      } else {
        j += 2;
      }
    } else if (c === '"') {
      return { endExclusive: j + 1, token: raw.slice(start, j + 1) };
    } else {
      j += 1;
    }
  }
  return { endExclusive: len, token: raw.slice(start) };
}

function isAsciiDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function scanAsciiDigits(raw: string, j: number, len: number): number {
  let p = j;
  while (p < len) {
    const ch = raw[p];
    if (!ch || !isAsciiDigit(ch)) {
      break;
    }
    p += 1;
  }
  return p;
}

function readNumberEnd(raw: string, i: number): number {
  let j = i;
  const len = raw.length;
  if (j < len && raw[j] === '-') {
    j += 1;
  }
  j = scanAsciiDigits(raw, j, len);
  if (j < len && raw[j] === '.') {
    j = scanAsciiDigits(raw, j + 1, len);
  }
  if (j < len && (raw[j] === 'e' || raw[j] === 'E')) {
    j += 1;
    if (j < len && (raw[j] === '+' || raw[j] === '-')) {
      j += 1;
    }
    j = scanAsciiDigits(raw, j, len);
  }
  return j;
}

function isJsonWordChar(ch: string | undefined): boolean {
  return ch !== undefined && ch !== '' && /\w/.test(ch);
}

function isSpaceChar(c: string): boolean {
  return c === ' ' || c === '\n' || c === '\r' || c === '\t';
}

function skipAsciiWhitespace(json: string, i: number, len: number): number {
  let j = i + 1;
  while (j < len) {
    const ch = json[j];
    if (!ch || !isSpaceChar(ch)) {
      break;
    }
    j += 1;
  }
  return j;
}

function stringTokenIsKey(json: string, endExclusive: number, len: number): boolean {
  let k = endExclusive;
  while (k < len) {
    const ch = json[k];
    if (!ch || !isSpaceChar(ch)) {
      break;
    }
    k += 1;
  }
  return k < len && json[k] === ':';
}

function tryHighlightNumber(
  json: string,
  i: number,
  len: number,
  c: string
): { html: string; next: number } | null {
  const nextCh = i + 1 < len ? json[i + 1] : '';
  const couldStartNumber =
    isAsciiDigit(c) || (c === '-' && (/\d/.test(nextCh) || nextCh === '.'));
  if (!couldStartNumber) {
    return null;
  }
  const end = readNumberEnd(json, i);
  const token = json.slice(i, end);
  if (end <= i || !/\d/.test(token)) {
    return null;
  }
  return {
    html: `<span class="json-syntax-number">${escapeHtml(token)}</span>`,
    next: end,
  };
}

function tryHighlightKeyword(
  json: string,
  i: number,
  len: number
): { html: string; next: number } | null {
  if (json.startsWith('true', i) && i + 4 <= len && !isJsonWordChar(json[i + 4])) {
    return {
      html: `<span class="json-syntax-boolean">${escapeHtml('true')}</span>`,
      next: i + 4,
    };
  }
  if (json.startsWith('false', i) && i + 5 <= len && !isJsonWordChar(json[i + 5])) {
    return {
      html: `<span class="json-syntax-boolean">${escapeHtml('false')}</span>`,
      next: i + 5,
    };
  }
  if (json.startsWith('null', i) && i + 4 <= len && !isJsonWordChar(json[i + 4])) {
    return {
      html: `<span class="json-syntax-null">${escapeHtml('null')}</span>`,
      next: i + 4,
    };
  }
  return null;
}

/** Colored spans for keys / strings / numbers / booleans / null — O(n), safe for ReDoS. */
function highlightJsonHtml(json: string): string {
  if (json.length > JSON_VIEW_MAX_CHARS) {
    return `${escapeHtml(json.slice(0, JSON_VIEW_MAX_CHARS))}${escapeHtml('\n… [truncated]')}`;
  }

  const len = json.length;
  let i = 0;
  const parts: string[] = [];

  while (i < len) {
    const c = json[i];
    if (c === undefined) {
      break;
    }

    if (isSpaceChar(c)) {
      const j = skipAsciiWhitespace(json, i, len);
      parts.push(escapeHtml(json.slice(i, j)));
      i = j;
    } else if (c === '"') {
      const { endExclusive, token } = readJsonStringToken(json, i);
      const isKey = stringTokenIsKey(json, endExclusive, len);
      const cls = isKey ? 'json-syntax-key' : 'json-syntax-string';
      parts.push(`<span class="${cls}">${escapeHtml(token)}</span>`);
      i = endExclusive;
    } else {
      const numberHit = tryHighlightNumber(json, i, len, c);
      if (numberHit) {
        parts.push(numberHit.html);
        i = numberHit.next;
      } else {
        const keywordHit = tryHighlightKeyword(json, i, len);
        if (keywordHit) {
          parts.push(keywordHit.html);
          i = keywordHit.next;
        } else {
          parts.push(escapeHtml(c));
          i += 1;
        }
      }
    }
  }

  return parts.join('');
}

export type JsonSyntaxViewProps = {
  value: unknown;
  sx?: SxProps<Theme>;
};

export const JsonSyntaxView: FC<JsonSyntaxViewProps> = ({ value, sx }) => {
  const extraSx = useMemo(() => {
    if (!sx) {
      return [];
    }
    return Array.isArray(sx) ? sx : [sx];
  }, [sx]);

  const html = useMemo(() => {
    try {
      const jsonStr = JSON.stringify(value ?? null, null, 2);
      return highlightJsonHtml(jsonStr);
    } catch (e) {
      return escapeHtml(e instanceof Error ? e.message : 'Unable to stringify value');
    }
  }, [value]);

  return (
    <Box
      component="pre"
      dangerouslySetInnerHTML={{ __html: html }}
      sx={[
        (theme: Theme) => ({
          m: 0,
          p: 1.5,
          typography: 'body2',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 280,
          overflow: 'auto',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          color: theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900',
          '& .json-syntax-key': {
            color: theme.palette.mode === 'dark' ? '#9cdcfe' : '#0451a5',
          },
          '& .json-syntax-string': {
            color: theme.palette.mode === 'dark' ? '#ce9178' : '#a31515',
          },
          '& .json-syntax-number': {
            color: theme.palette.mode === 'dark' ? '#b5cea8' : '#098658',
          },
          '& .json-syntax-boolean': {
            color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
          },
          '& .json-syntax-null': {
            color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
          },
        }),
        ...extraSx,
      ]}
    />
  );
};
