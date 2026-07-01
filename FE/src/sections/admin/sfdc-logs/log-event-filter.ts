/** API / filter values for SFDC log event (query param passes these verbatim). */
export type SfdcLogEventValue =
  | 'eoi_lead_push'
  | 'opp_updated'
  | 'lead_created'
  | 'opp_push_to_sfdc'
  | 'map_and_convert'
  | 'site-visit_form';

export const SFDC_LOG_EVENT_FILTER_OPTIONS: { value: SfdcLogEventValue; label: string }[] = [
  
  { label: 'EOI Lead Push', value: 'eoi_lead_push' },
  { label: 'Booking Form', value: 'opp_updated' },
  { label: 'Referral Lead Created', value: 'lead_created' },
  { label: 'SFDC Data Push', value: 'opp_push_to_sfdc' },
  { label: 'Map And Convert', value: 'map_and_convert' },
  { label: 'Site Visit Form', value: 'site-visit_form' }

];

export function formatSfdcLogEventLabel(raw: unknown): string {
  if (raw == null || raw === '') {
    return '-';
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  let s: string;
  if (typeof raw === 'string') {
    s = raw.trim();
  } else if (typeof raw === 'number' || typeof raw === 'boolean') {
    s = `${raw}`;
  } else {
    return '-';
  }
  const found = SFDC_LOG_EVENT_FILTER_OPTIONS.find((o) => o.value === s);
  return found ? found.label : s;
}
