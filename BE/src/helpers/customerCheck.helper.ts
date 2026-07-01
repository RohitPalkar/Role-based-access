import { SiteVisitForm } from 'src/entities';
import { ConfigService } from '@nestjs/config';
import {
  CachePatch,
  DuplicateMeta,
  IssueOtpAndSmsOpts,
  OtpVariant,
} from 'src/modules/site_visit_logIn/dto/login.dto';

export function normalizeProviderResponse(raw: any): any {
  const parsed = parsePossiblyStringifiedJson(raw);
  // return parsed;
  return normalizArray(parsed);
}

export function parsePossiblyStringifiedJson(input: any): any {
  if (input && typeof input === 'object') return input;
  if (typeof input !== 'string') return input;
  const cleaned = cleanText(input);
  try {
    const once = JSON.parse(cleaned);
    if (typeof once === 'string') {
      try {
        return JSON.parse(this.cleanText(once));
      } catch {
        return once;
      }
    }
    return once;
  } catch {
    try {
      const unescaped = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return JSON.parse(unescaped);
    } catch {
      return input;
    }
  }
}

export function cleanText(s: string): string {
  return s.replace(/^\uFEFF/, '').trim();
}

export function normalizArray<T = any>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => normalizArray(v)) as any;
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizArray(v);
    return out as any;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'null' || lower === 'undefined') return null as any;
    if (lower === 'true') return true as any;
    if (lower === 'false') return false as any;
  }
  return value;
}

//fields that define revisit completed/not
const IMPORTANT_FIELDS: (keyof SiteVisitForm)[] = [
  'enquiryId',
  'firstName',
  'lastName',
  'email',
  'mobile',
];

export function computeIsMarkRevisit(db: SiteVisitForm | null): 0 | 1 {
  if (!db) return 0;

  // Check base required fields
  const hasNullBase = IMPORTANT_FIELDS.some((f) => isNullishOrEmpty(db[f]));
  if (hasNullBase) return 0;

  const pr = (db.primarySource || '').toLowerCase();

  if (db.primarySource) {
    // Primary source rules
    const prRules: Record<string, (d: SiteVisitForm) => boolean> = {
      'channel partner': (d) => !isNullishOrEmpty(d.channelPartner),
      'i am an existing customer': (d) =>
        !isNullishOrEmpty(d.exProjectName) && !isNullishOrEmpty(d.unitNumber),
      'referred by family/friend': (d) =>
        !isNullishOrEmpty(d.referredBy) &&
        !isNullishOrEmpty(d.exProjectName) &&
        !isNullishOrEmpty(d.unitNumber),
      'referred by friend': (d) =>
        !isNullishOrEmpty(d.referredBy) &&
        !isNullishOrEmpty(d.exProjectName) &&
        !isNullishOrEmpty(d.unitNumber),
      'referred by family': (d) =>
        !isNullishOrEmpty(d.referredBy) &&
        !isNullishOrEmpty(d.exProjectName) &&
        !isNullishOrEmpty(d.unitNumber),
    };
    if (pr in prRules && !prRules[pr](db)) return 0;
  }

  // For Online Ads / Retired / Home-maker / Freelancer etc. → no extra checks
  return 1;
}

function isNullishOrEmpty(v: unknown): boolean {
  return (
    v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
  );
}

export function blockedMsg(remaining: number | string) {
  const mins = Math.max(1, Math.ceil((remaining as number) / 60000));
  return `You are temporarily blocked. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`;
}

type ProviderResponse = { status: 'EL' | 'NL'; data: any[] };

export function formatProviderResponse(parsed: any): ProviderResponse {
  const status: 'EL' | 'NL' = parsed?.status === 'EL' ? 'EL' : 'NL';

  let rows: any[] = [];
  // NL comes flat
  if (status === 'NL') rows = normalizeRows(parsed?.data);
  if (!rows.length) rows = [parsed];
  else rows = normalizeRows(parsed?.data);

  return { status, data: rows };
}

// helpers to handle basic checks
export function pickId(row: any): string | null {
  const v = row?.id ?? row?.Id ?? row?.ID ?? null;
  return typeof v === 'string' ? v.trim() : v;
}
export function pickEnqRefNo(row: any): string | null {
  const v =
    row?.EnqRefNo ??
    row?.enqRefNo ??
    row?.enquiryRefNo ??
    row?.enquiryID ??
    row?.enquiryId ??
    null;
  return typeof v === 'string' ? v.trim() : v;
}

function normalizeRows(input: any) {
  if (Array.isArray(input)) return input;
  if (input) return [input];
  return [];
}

export function getBrandCfg(
  config: ConfigService,
  brand?: string,
  variant: OtpVariant = 'normal',
) {
  const key =
    (brand ?? '').trim().toLowerCase() === 'providenthousing.com'
      ? {
          prefix: 'PROVIDENT',
          senderFallback: 'PROVDT',
          signatureFallback: 'Provident Housing Limited.',
        }
      : {
          prefix: 'PURAVANKARA',
          senderFallback: 'MPURVA',
          signatureFallback: 'Puravankara Limited.',
        };

  const env = (suffix: string) => `SMSHUB_${suffix}_${key.prefix}`;

  const cfg: any = {
    senderId: config.get<string>(env('SENDER')) || key.senderFallback,
    country: (config.get<string>(env('COUNTRYCODE')) || '91').replace(
      /\D/g,
      '',
    ),
    signature: config.get<string>(env('SIGNATURE')) || key.signatureFallback,
    dcs: config.get<string>('SMSHUB_DCS') ?? '0',
    shorturl: (config.get<string>('SMSHUB_SHORTURL') ?? 'NO') as 'NO' | 'YES',
    international: (config.get<string>('SMSHUB_INTERNATIONAL') ?? 'NO') as
      | 'NO'
      | 'YES',
    templateId: (
      {
        normal: config.get<string>(env('TEMPLATE')) ?? '',
        duplicate:
          config.get<string>(env('TEMPLATE_DUPLICATE')) ??
          config.get<string>(`SMSHUB_DEFAULT_TEMPLATE_DUPLICATE`) ??
          '',
        duplicate_cp:
          config.get<string>(env('TEMPLATE_DUPLICATE_CP')) ??
          config.get<string>(`SMSHUB_DEFAULT_TEMPLATE_DUPLICATE_CP`) ??
          '',
      } as Record<OtpVariant, string>
    )[variant],
  };

  Object.defineProperty(cfg, 'api', {
    value: config.get<string>(env('API')),
    enumerable: false,
    writable: false,
  });

  return Object.freeze(cfg);
}
export function duplicateInfoText(
  signature: string,
  meta: DuplicateMeta,
): string {
  const brandShort = signature.replace(/\.$/, '');
  return (
    `Dear ${meta.name}, Greetings from ${brandShort}! ` +
    `You have already visited us on ${meta.visitedOn} through ${meta.source}. ` +
    `Your current lead is marked as duplicate. You can continue with the existing lead.`
  );
}

export function toDisplayDate(d?: string | Date): string {
  if (!d) return 'NA';
  let dt: Date;

  if (typeof d === 'string') {
    // Handled dd.MM.yyyy
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) {
      const [day, month, year] = d.split('.').map(Number);
      dt = new Date(year, month - 1, day);
    } else {
      dt = new Date(d);
    }
  } else {
    dt = d;
  }

  if (Number.isNaN(dt.getTime())) return 'NA';
  // 12 Oct 2025
  return dt
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/,/g, '');
}

export function isCachePatch(x: any): x is CachePatch {
  return (
    x &&
    typeof x === 'object' &&
    ('resendCount' in x || 'windowStart' in x || 'lastSentAt' in x) &&
    !('variant' in x) &&
    !('duplicateMeta' in x) &&
    !('alsoSendOtp' in x) &&
    !('cachePatch' in x)
  );
}

export function normalizeOpts(
  x?: IssueOtpAndSmsOpts | CachePatch,
): IssueOtpAndSmsOpts {
  if (!x) return {};
  if (isCachePatch(x)) return { cachePatch: x };
  return x;
}
