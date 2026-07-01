import { In, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { EoiCampaign } from 'src/entities';
import { CampaignStatusEnum, VoucherFormType } from 'src/enums/eoi-form.enums';

const logger = new Logger('EoiCampaignStatusHelper');

type WindowState = 'ACTIVE' | 'FUTURE' | 'PAST' | 'INVALID';

// Only auto-update these (first six)
const AUTO_STATUSES: CampaignStatusEnum[] = [
  CampaignStatusEnum.ACTIVE_VOUCHER,
  CampaignStatusEnum.INACTIVE_VOUCHER,
  CampaignStatusEnum.ACTIVE_EOI,
  CampaignStatusEnum.INACTIVE_EOI,
  CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
  CampaignStatusEnum.INACTIVE_VOUCHER_AND_EOI,
];

const toIST = (d?: Date | null) =>
  d
    ? new Date(
        new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      )
    : null;

const classify = (
  start?: Date | null,
  end?: Date | null,
  now: Date = new Date(),
): WindowState => {
  if (!start || !end) return 'INVALID';
  const n = toIST(now).getTime();
  const s = toIST(start).getTime();
  const e = toIST(end).getTime();
  if (s <= n && n <= e) return 'ACTIVE';
  if (n < s) return 'FUTURE';
  if (n > e) return 'PAST';
  return 'INVALID';
};

const res = (status: CampaignStatusEnum, phase: VoucherFormType[]) => ({
  status,
  phase,
});

function decideBoth(vState: WindowState, eState: WindowState) {
  // Both phases are currently live
  if (vState === 'ACTIVE' && eState === 'ACTIVE') {
    return res(CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI, [
      VoucherFormType.VOUCHER,
      VoucherFormType.EOI,
    ]);
  }

  // Voucher is live but EOI is still in the future → treat as Active Voucher
  if (vState === 'ACTIVE')
    return res(CampaignStatusEnum.ACTIVE_VOUCHER, [
      VoucherFormType.VOUCHER,
      VoucherFormType.EOI,
    ]);

  // Both voucher and EOI are in the future → Inactive Voucher
  if (vState === 'FUTURE')
    return res(CampaignStatusEnum.INACTIVE_VOUCHER, [VoucherFormType.VOUCHER]);

  // vState === 'PAST' — voucher has ended, branch on EOI state
  if (eState === 'ACTIVE')
    return res(CampaignStatusEnum.ACTIVE_EOI, [VoucherFormType.EOI]);
  if (eState === 'PAST')
    return res(CampaignStatusEnum.INACTIVE_EOI, [VoucherFormType.EOI]);

  // EOI is FUTURE or INVALID — voucher ended, EOI not yet live
  return res(CampaignStatusEnum.INACTIVE_EOI, [VoucherFormType.EOI]);
}

function decideVoucherOnly(vState: WindowState) {
  return vState === 'ACTIVE'
    ? res(CampaignStatusEnum.ACTIVE_VOUCHER, [VoucherFormType.VOUCHER])
    : res(CampaignStatusEnum.INACTIVE_VOUCHER, [VoucherFormType.VOUCHER]);
}

function decideEoiOnly(eState: WindowState) {
  return eState === 'ACTIVE'
    ? res(CampaignStatusEnum.ACTIVE_EOI, [VoucherFormType.EOI])
    : res(CampaignStatusEnum.INACTIVE_EOI, [VoucherFormType.EOI]);
}

export function resolveStatusAndPhase(
  c: Pick<
    EoiCampaign,
    | 'id'
    | 'voucherStartDate'
    | 'voucherEndDate'
    | 'eoiStartDate'
    | 'eoiEndDate'
    | 'status'
    | 'phase'
  >,
  now = new Date(),
): { status: CampaignStatusEnum; phase: VoucherFormType[] } {
  const vState = classify(c.voucherStartDate, c.voucherEndDate, now);
  const eState = classify(c.eoiStartDate, c.eoiEndDate, now);

  const voucherValid = vState !== 'INVALID';
  const eoiValid = eState !== 'INVALID';

  // Get the campaign's configured phases
  const campaignPhases = Array.isArray(c.phase) ? c.phase : [c.phase];

  // Determine which phases should be active based on dates and campaign configuration
  if (
    voucherValid &&
    eoiValid &&
    campaignPhases.includes(VoucherFormType.VOUCHER) &&
    campaignPhases.includes(VoucherFormType.EOI)
  ) {
    return decideBoth(vState, eState); // A) both present and configured
  }
  if (voucherValid && campaignPhases.includes(VoucherFormType.VOUCHER)) {
    return decideVoucherOnly(vState); // B) voucher only
  }
  if (eoiValid && campaignPhases.includes(VoucherFormType.EOI)) {
    return decideEoiOnly(eState); // C) EOI only
  }

  // Default: return the first phase in the campaign's phase array, or VOUCHER if empty
  const defaultPhase =
    campaignPhases.length > 0 ? [campaignPhases[0]] : [VoucherFormType.VOUCHER];
  return res(CampaignStatusEnum.INACTIVE_VOUCHER, defaultPhase); // D) neither valid
}

/**
 * Updates EOI campaign statuses in bulk
 * - Skips terminal statuses.
 * - Applies first six enum states.
 * - Groups updates to minimize DB roundtrips.
 */
type Group = {
  status: CampaignStatusEnum;
  phase: VoucherFormType[];
  ids: number[];
};

const isAutoStatus = (s: CampaignStatusEnum) => AUTO_STATUSES.includes(s);
const isValidPhase = (p: VoucherFormType[]) =>
  Array.isArray(p) &&
  p.length > 0 &&
  p.every(
    (phase) =>
      phase === VoucherFormType.VOUCHER || phase === VoucherFormType.EOI,
  );

function accumulate(
  groups: Map<string, Group>,
  status: CampaignStatusEnum,
  phase: VoucherFormType[],
  id: number,
) {
  // Create a consistent key from the sorted phase array
  const phaseKey = [...phase].sort((a, b) => a.localeCompare(b)).join(',');
  const key = `${status}__SEP__${phaseKey}`;
  const g = groups.get(key);
  if (g) g.ids.push(id);
  else groups.set(key, { status, phase, ids: [id] });
}

function processCampaigns(
  campaigns: Pick<
    EoiCampaign,
    | 'id'
    | 'status'
    | 'phase'
    | 'voucherStartDate'
    | 'voucherEndDate'
    | 'eoiStartDate'
    | 'eoiEndDate'
  >[],
  now: Date,
) {
  const groups = new Map<string, Group>();
  for (const c of campaigns) {
    const { status, phase } = resolveStatusAndPhase(c as EoiCampaign, now);

    // Normalize current phase to array
    let currentPhase: VoucherFormType[];
    if (Array.isArray(c.phase)) {
      currentPhase = c.phase;
    } else if (c.phase) {
      currentPhase = [c.phase];
    } else {
      currentPhase = [];
    }

    // Compare arrays by checking if they have the same length and contain the same elements
    const phasesEqual =
      currentPhase.length === phase.length &&
      currentPhase.every((p) => phase.includes(p)) &&
      phase.every((p) => currentPhase.includes(p));

    if ((status === c.status && phasesEqual) || !isAutoStatus(status)) continue;
    accumulate(groups, status, phase, c.id);
  }
  return groups;
}

async function applyGroups(
  repo: Repository<EoiCampaign>,
  groups: Map<string, Group>,
) {
  for (const { status, phase, ids } of groups.values()) {
    if (!isAutoStatus(status)) {
      logger.warn(`Skipped invalid auto status: ${status}`);
      continue;
    }
    if (!isValidPhase(phase)) {
      logger.warn(`Skipped invalid phase: ${phase}`);
      continue;
    }
    // Only update status; keep campaign.phase as the configured phase set via APIs
    await repo.update({ id: In(ids) }, { status });
    logger.log(
      `Updated ${ids.length} campaigns → status="${status}" (phase unchanged)`,
    );
  }
}

export async function updateEoiCampaignStatuses(
  campaignRepo: Repository<EoiCampaign>,
  now: Date = new Date(),
): Promise<void> {
  try {
    const qb = campaignRepo
      .createQueryBuilder('c')
      .where('c.status IN (:...auto)', { auto: AUTO_STATUSES })
      .select([
        'c.id',
        'c.status',
        'c.phase',
        'c.voucherStartDate',
        'c.voucherEndDate',
        'c.eoiStartDate',
        'c.eoiEndDate',
      ]);

    const campaigns = await qb.getMany();
    if (!campaigns.length) return;

    const groups = processCampaigns(campaigns, now);
    if (groups.size === 0) return;

    await applyGroups(campaignRepo, groups);
  } catch (error) {
    logger.error(
      'Error updating EOI campaign statuses:',
      error?.message || error,
    );
  }
}
