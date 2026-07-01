/* eslint-disable complexity */
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GREProjectMapping,
  SfdcProjectListing,
  SiteVisitForm,
  Users,
} from 'src/entities';
import { In, Repository } from 'typeorm';
import {
  CachePatch,
  CheckRequestDto,
  DateType,
  DuplicateMeta,
  IssueOtpAndSmsOpts,
  OtpVariant,
  VerifyOtpDto,
  VersatileHubExactParams,
} from './dto/login.dto';
import { lastValueFrom } from 'rxjs';
import { SfdcService } from '../sfdc/sfdc.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  blockedMsg,
  computeIsMarkRevisit,
  duplicateInfoText,
  formatProviderResponse,
  getBrandCfg,
  normalizeOpts,
  pickEnqRefNo,
  pickId,
  toDisplayDate,
} from 'src/helpers/customerCheck.helper';
import { ProjectsByBrandRes } from './dto/response.dto';
import { logger } from 'src/logger/logger';
import { generateOtp } from 'src/utils/generateRandomNumber';
import {
  OTP_EXPIRY_TTL_MS,
  OTP_MAX_ATTEMPTS,
  SUCCESS,
} from 'src/config/constants';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import * as dayjs from 'dayjs'; // Use dayjs for date handling
const OTP_RESEND_MIN_GAP_MS = 30_000; // 30 seconds between sends
const OTP_EXPIRY_MS = OTP_RESEND_MIN_GAP_MS;

// Redis keys
const otpKey = (mobile: string, proj: string) => `otp:${proj}:${mobile}`;
const attemptKey = (mobile: string, proj: string) =>
  `otp:${proj}:${mobile}:invalidAttempts`;
const totalInvalidKey = (mobile: string, proj: string) =>
  `otp:${proj}:${mobile}:totalInvalidGroups`;
const blockKey = (mobile: string, proj: string) =>
  `otp:${proj}:${mobile}:blocked`;
const blockedIndexKey = `otp:blocked:index`;
const expiredAttemptKey = (mobile: string, projectInterested: string) =>
  `otp:expired:attempts:${projectInterested}:${mobile}`;

export interface StatusResponse {
  status: string;
  data: any;
}
@Injectable()
export class SiteVisitLogInService {
  constructor(
    @InjectRepository(SfdcProjectListing)
    private readonly sfdcProjectRepo: Repository<SfdcProjectListing>,
    @InjectRepository(SiteVisitForm)
    private readonly siteVisitRepo: Repository<SiteVisitForm>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
    private readonly sfdcService: SfdcService,

    @InjectRepository(GREProjectMapping)
    private readonly greMappingRepo: Repository<GREProjectMapping>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}

  async getProjectsByBrand(
    brandName?: string,
    userId?: string,
  ): Promise<ProjectsByBrandRes> {
    try {
      const isDeleted = false;
      const trimmedBrand = brandName?.trim();
      const trimmedUser = userId?.trim();
      if (trimmedUser) {
        const user = await this.userRepo.findOne({
          where: { id: Number(userId) },
          select: ['email'],
        });
        const rawNames = (
          await this.greMappingRepo.find({
            where: { email: user.email },
            select: ['projectName'],
          })
        )
          .flatMap((r) => (Array.isArray(r.projectName) ? r.projectName : []))
          .map((name) => (typeof name === 'string' ? name.trim() : null))
          .filter(Boolean);

        const projectNames = Array.from(new Set(rawNames));

        const isDeleted = false;

        const projects = await this.sfdcProjectRepo
          .createQueryBuilder('p')
          .select(['p.id', 'p.displayName'])
          .where('p.isDeleted = :isDeleted', { isDeleted })
          .andWhere('p.displayName IN (:...projectNames)', { projectNames })
          .orderBy('p.displayName', 'ASC')
          .getMany();

        logger.info(
          `Found ${projects.length} projects for userId: ${trimmedUser}`,
        );

        if (!projects.length)
          throw new NotFoundException(
            `No projects found for GRE ${trimmedUser}${
              trimmedBrand ? ` and brand like "${trimmedBrand}"` : ''
            }.`,
          );

        return {
          message: 'Projects fetched successfully',
          data: {
            userId: trimmedUser,
            ...(trimmedBrand && { brand: trimmedBrand }),
            projects: projects.map((p) => ({ id: p.id, name: p.displayName })),
          },
        };
      }

      if (trimmedBrand) {
        logger.info(`Fetching projects by brand: ${trimmedBrand}`);
        const proejcts = await this.sfdcProjectRepo
          .createQueryBuilder('p')
          .select(['p.id', 'p.displayName', 'p.brandName'])
          .where('p.isDeleted = :isDeleted', { isDeleted })
          .andWhere('p.brandName LIKE :brand', { brand: `%${trimmedBrand}%` })
          .orderBy('p.displayName', 'ASC')
          .getMany();

        logger.info(
          `Found ${proejcts.length} projects for brand: ${trimmedBrand}`,
        );
        if (!proejcts.length)
          throw new NotFoundException(
            `No projects found for brand like "${trimmedBrand}".`,
          );

        const labelBrand = proejcts[0].brandName;

        return {
          message: 'Projects fetched successfully',
          data: {
            brand: labelBrand,
            projects: proejcts.map((p) => ({ id: p.id, name: p.displayName })),
          },
        };
      }

      logger.info(
        `Fetching all projects as fallback (no userId or brandName provided).`,
      );

      const allProjects = await this.sfdcProjectRepo.find({
        where: { isDeleted },
        select: ['id', 'displayName'],
        order: { displayName: 'ASC' },
      });
      logger.info(`Found ${allProjects.length} total projects.`);

      return {
        message: 'Projects fetched successfully',
        data: {
          projects: allProjects.map((p) => ({ id: p.id, name: p.displayName })),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch projects by brand/GRE', error);
      logsAndErrorHandling('projects-by-brand', error, { brandName, userId });
    }
  }

  /**
   * - If welcomeCode provided => call client API and return details.
   * - Else if mobile + project provided => call EL/NL API, to check customer status.
   */
  async checkOrStartFlow(dto: CheckRequestDto): Promise<{
    statusCode: number;
    message: string;
    data: any;
  }> {
    let isWelcomeCodeUsed: number;
    // 1) Welcome code path
    let flag = 'single';
    if (dto.welcomeCode) {
      const welcomeData = await this.callWelcomeCodeAPI(dto);
      return {
        statusCode: 200,
        message: 'Welcome code details',
        data: welcomeData,
      };
    } else {
      isWelcomeCodeUsed = 0;
    }
    const projectDetails = await this.sfdcProjectRepo.findOne({
      where: { displayName: dto?.projectInterested },
      select: ['brandName'],
    });
    // 2) Input validation when no welcome code
    if (!dto.mobile || !dto.projectInterested)
      throw new BadRequestException(
        'Provide either welcomeCode OR mobile + projectInterested',
      );
    const primarySourceMapping: Record<string, string> = {
      'Digital Medium': 'Digital Marketing',
      'Authorised Channel Partner': 'Channel Partner',
      'Direct Walk-in': 'Direct WalkIn / Site Branding',
      'Existing Customer':
        projectDetails?.brandName == 'Purva Land' ||
        projectDetails?.brandName == 'Puravankara'
          ? 'Exc Purva Privilege'
          : 'Exc Provident Premier',
      'Referred by Employee of Puravankara Group': 'Purva Champion',
      'Referred by Family/Friend':
        projectDetails?.brandName == 'Purva Land' ||
        projectDetails?.brandName == 'Puravankara'
          ? 'Purva Privilege'
          : 'Provident Premier',
      Hoarding: 'Hoarding',
    };
    if (dto?.primarySource && primarySourceMapping[dto.primarySource])
      dto.primarySource = primarySourceMapping[dto.primarySource];
    const sfdcProject = await this.sfdcProjectRepo.findOne({
      where: { displayName: dto.projectInterested, isDeleted: false },
      select: ['projectName', 'id', 'displayName'],
    });

    const body: any = {
      company: 'null',
      mobile: dto.mobile,
      firstname: dto?.firstName,
      lastname: dto?.lastName,
      projectInterested: sfdcProject?.projectName || '',
      primarySource: dto?.primarySource,
    };
    if (dto.primarySource == 'Purva Privilege') {
      body.secondarySource = 'Privilege Referral';
    } else if (dto.primarySource == 'Provident Premier') {
      body.secondarySource = 'Premier Referral';
    } else if (dto.primarySource == 'Exc Purva Privilege') {
      dto.primarySource = 'Purva Privilege';
      body.primarySource = 'Purva Privilege';
      body.secondarySource = 'Loyalty';
    } else if (dto.primarySource == 'Exc Provident Premier') {
      dto.primarySource = 'Provident Premier';
      body.primarySource = 'Provident Premier';
      body.secondarySource = 'Loyalty';
    }
    if (dto.primarySource == 'Channel Partner') {
      body.channelpartnername = dto.channelPartner;
    } else if (dto.primarySource == 'Purva Champion') {
      body.Referredemployee = dto?.employeeName;
    } else if (
      dto.primarySource == 'Provident Premier' ||
      dto.primarySource == 'Purva Privilege'
    ) {
      body.Referredemployee = dto?.referredBy || '';
    }
    let statusRes = await this.sfdcService.postToSiteVisit(body);
    const records = statusRes?.data || [];
    const enquiryIds = records
      .map((item) => Number(pickEnqRefNo(item)))
      .filter(Boolean);

    if (statusRes.status === 'EL') {
      const finalEnquiryResp = await this.findMatchingEnquiry(statusRes, dto);
      let finalEnquiry = finalEnquiryResp?.data;
      flag = finalEnquiryResp?.flag;
      logger.info('finalized enquiry', finalEnquiry);
      logger.info('flag', flag);
      if (finalEnquiry == 'NL') {
        await this.createDuplicateSFDCLead(dto);
        statusRes = await this.sfdcService.postToSiteVisit({
          lastname: 'null',
          mobile: dto.mobile,
          projectInterested: sfdcProject.projectName,
        });
        const finalEnquiryAfterDupliate = await this.findMatchingEnquiry(
          statusRes,
          dto,
        );
        finalEnquiry = finalEnquiryAfterDupliate?.data;
        flag = finalEnquiryAfterDupliate?.flag;
        logger.info('updated finalEnquiry', finalEnquiry);
      }
      statusRes.data = [finalEnquiry];
    }

    const formatedResponse = formatProviderResponse(statusRes);
    const first = formatedResponse?.data[0]?.data?.[0]
      ? formatedResponse?.data[0]?.data?.[0]
      : formatedResponse?.data[0];
    const id = pickId(first);
    const EnqRefNo = pickEnqRefNo(first);
    const existingEnqu = await this.siteVisitRepo.findOne({
      where: { enquiryId: In(enquiryIds) },
    });
    const dbExistEnquiryId = Number(existingEnqu?.enquiryId);
    // get object which is matches from sfdc and db
    const matchedRecord = records.find(
      (item) => Number(pickEnqRefNo(item)) === dbExistEnquiryId,
    );

    const isExisting = formatedResponse.status === 'EL' && !!existingEnqu;
    if (!isExisting) {
      if (!id || !EnqRefNo)
        throw new InternalServerErrorException(
          'Provider NL row missing id or EnqRefNo.',
        );

      // 4) NL status
      return {
        statusCode: SUCCESS,
        message: 'New lead (NL)',
        data: {
          status: 'NL',
          isWelcomeCodeUsed,
          flag,
          mobile: dto.mobile,
          projectId: sfdcProject?.id,
          projectName: dto?.projectInterested ?? '',
          id,
          EnqRefNo,
        },
      };
    }

    // include isMarkRevisit only if single row
    const single = formatedResponse.data.length === 1;

    const baseData: any = {
      status: formatedResponse.status,
      isWelcomeCodeUsed: isWelcomeCodeUsed,
      flag,
      projectId: sfdcProject?.id ?? '',
      projectName: sfdcProject?.displayName,
      data: single
        ? matchedRecord || formatedResponse.data[0]?.data[0]
        : formatedResponse.data,
    };

    if (single && dto?.mobile && (EnqRefNo || existingEnqu?.enquiryId)) {
      const enquiryId = Number(EnqRefNo || existingEnqu?.enquiryId);
      const existing = await this.siteVisitRepo.findOne({
        where: { enquiryId: Number(enquiryId) },
        order: { updatedAt: 'DESC' },
      });
      baseData.isMarkRevisit = computeIsMarkRevisit(existing);
    }

    let variant: OtpVariant | null = null;
    if (flag === 'duplicate cp') {
      variant = 'duplicate_cp';
    } else if (flag === 'duplicate') {
      variant = 'duplicate';
    }

    if (variant) {
      const brandDomain = (projectDetails?.brandName || '')
        .toLowerCase()
        .includes('provident')
        ? 'providenthousing.com'
        : 'puravankara.com';

      const dupMeta: DuplicateMeta = {
        name:
          baseData?.data?.firstname + ' ' + baseData?.data?.lastname ||
          'Customer',
        visitedOn: toDisplayDate(baseData?.data?.timeof1stVisit),
        source: baseData?.data?.primarySource || 'N/A',
      };
      await this.issueOtpAndSms(
        dto.mobile,
        dto.projectInterested,
        brandDomain,
        {
          variant, // 'duplicate' | 'duplicate_cp'
          duplicateMeta: dupMeta,
          alsoSendOtp: false, // EL dup flows: only info SMS
        },
      );
    }
    // 5) EL status
    return {
      statusCode: 200,
      message: 'Existing customer (EL)',
      data: baseData,
    };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ statusCode: number; message: string }> {
    const { mobile, projectInterested, otp } = dto;

    // checking if customer blocked?
    const blockState = await this.isBlocked(mobile, projectInterested);
    if (blockState) throw new BadRequestException(blockedMsg(blockState));

    // 1) Load OTP state
    const key = otpKey(mobile, projectInterested);
    const cache = await this.cacheService.get<{
      otp: string;
      windowStart: DateType;
      resendCount: number;
      lastSentAt: DateType;
      expireAt: DateType;
    }>(key);

    const now = Date.now();
    const expireAtTs = cache?.expireAt ? new Date(cache.expireAt).getTime() : 0;
    if (!cache?.otp || !expireAtTs || now >= expireAtTs) {
      // Count expired-OTP verify attempts and block
      const expiryKey = expiredAttemptKey(mobile, projectInterested);
      const expAttempts = (await this.cacheService.get<number>(expiryKey)) ?? 0;
      const nextExpAttempts = expAttempts + 1;

      await this.cacheService.set(expiryKey, nextExpAttempts, {
        ttl: OTP_EXPIRY_TTL_MS,
      } as any);

      if (nextExpAttempts >= OTP_MAX_ATTEMPTS) {
        await this.blockUser(mobile, projectInterested, false);
        await this.cacheService.del(expiryKey); // reset after block
        throw new BadRequestException(
          'You have attempted verification with an expired OTP too many times. You are blocked for 10 minutes.',
        );
      }

      const remaining = OTP_MAX_ATTEMPTS - nextExpAttempts;
      throw new BadRequestException(
        `OTP expired. Please request a new OTP (valid for 30 seconds). (${remaining} attempt${remaining === 1 ? '' : 's'} before temporary block)`,
      );
    }

    // Hash input OTP for comparison
    const hashedInputOtp = crypto
      .createHash('sha256')
      .update(String(otp))
      .digest('hex');

    if (cache.otp !== hashedInputOtp) {
      const aKey = attemptKey(mobile, projectInterested);
      const tKey = totalInvalidKey(mobile, projectInterested);

      const attempts = (await this.cacheService.get<number>(aKey)) ?? 0;
      const nextAttempts = attempts + 1;

      // keeping attempts for some period
      await this.cacheService.set(aKey, nextAttempts, {
        ttl: OTP_EXPIRY_TTL_MS,
      } as any);

      // group-of-3 invalids
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        const groups = (await this.cacheService.get<number>(tKey)) ?? 0;
        const newGroups = groups + 1;
        await this.cacheService.set(tKey, newGroups);
        await this.cacheService.del(aKey); // reset attempts on block

        if (newGroups >= 2) {
          // Temporary block 10m
          await this.blockUser(mobile, projectInterested, false);
          throw new BadRequestException(
            'You have entered an invalid OTP too many times. You are blocked for 10 minutes.',
          );
        }
      }

      const remaining = Math.max(OTP_MAX_ATTEMPTS - nextAttempts, 0);
      throw new BadRequestException(
        `Invalid OTP. Please check and try again. (${remaining} attempt${remaining === 1 ? '' : 's'} left)`,
      );
    }

    //success clean up attempt counters and otp
    await this.cacheService.del(key);
    await this.cacheService.del(attemptKey(mobile, projectInterested));
    await this.cacheService.del(expiredAttemptKey(mobile, projectInterested));
    // keeping totalInvalidGroups as history
    return { statusCode: 200, message: 'OTP verified successfully.' };
  }

  async sendOtp(
    mobile: string,
    projectInterested: string,
    brand: string,
  ): Promise<void> {
    if (!mobile || !projectInterested)
      throw new BadRequestException('mobile & projectInterested required');

    const blockState = await this.isBlocked(mobile, projectInterested);
    if (blockState) throw new BadRequestException(blockedMsg(blockState));

    const key = otpKey(mobile, projectInterested);
    const now = Date.now();

    const existing = await this.cacheService.get<{
      otp: string;
      windowStart: DateType;
      resendCount: number;
      lastSentAt: DateType;
      expireAt: DateType;
    }>(key);

    if (existing) {
      // min gap
      const lastSentAt = new Date(existing.lastSentAt).getTime();
      if (now - lastSentAt < OTP_RESEND_MIN_GAP_MS)
        throw new BadRequestException(
          'Please wait 30 seconds before requesting a new OTP.',
        );

      // window count
      const windowStart = new Date(existing.windowStart).getTime();
      const withinWindow = now - windowStart < OTP_EXPIRY_TTL_MS;
      const resendCount = withinWindow ? (existing.resendCount ?? 0) + 1 : 1;

      if (withinWindow && resendCount >= OTP_MAX_ATTEMPTS) {
        // Block on OTP requests within window
        await this.blockUser(mobile, projectInterested, false);
        throw new BadRequestException(
          'Too many OTP requests. You are blocked for 10 minutes.',
        );
      }

      await this.issueOtpAndSms(mobile, projectInterested, brand, {
        resendCount,
        windowStart: withinWindow ? new Date(windowStart) : new Date(now),
        lastSentAt: new Date(now),
      });
      return;
    }

    await this.issueOtpAndSms(mobile, projectInterested, brand);
  }

  private async issueOtpAndSms(
    mobile: string,
    projectInterested: string,
    brand: string | undefined,
    optsOrPatch?: IssueOtpAndSmsOpts | CachePatch,
  ) {
    const opts = normalizeOpts(optsOrPatch);
    const variant: OtpVariant = opts.variant ?? 'normal';

    const otp = generateOtp();
    const key = otpKey(mobile, projectInterested);
    const now = new Date();

    // Hash OTP before storing in Redis
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await this.cacheService.set(
      key,
      {
        otp: hashedOtp,
        windowStart: opts.cachePatch?.windowStart ?? now,
        resendCount: opts.cachePatch?.resendCount ?? 1,
        lastSentAt: opts.cachePatch?.lastSentAt ?? now,
        expireAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      },
      OTP_EXPIRY_MS,
    );

    const cfg = getBrandCfg(this.config, brand, variant);
    const smsUrl =
      this.config.get<string>('SMS_URL') ??
      'https://sms.versatilesmshub.com/api/smsservices.php';
    const campaignId = this.config.get<string>('SMS_CAMPAIGN_ID') || 'otp';
    const channel = this.config.get<string>('SMS_CHANNEL') || 'otp';

    // NORMAL OTP
    if (variant === 'normal') {
      const message =
        `${otp} is the one-time password for authentication. ` +
        `OTP expires in 30 seconds. Please do not share it with anyone. ${cfg.signature}`;

      await this.sendSms({
        url: smsUrl,
        api: cfg.api,
        senderId: cfg.senderId,
        templateId: cfg.templateId,
        countryCode: cfg.country,
        number: mobile,
        message,
        campaignId,
        channel,
      });
      return;
    }

    // DUPLICATE / DUPLICATE_CP data must be there
    if (!opts.duplicateMeta) {
      throw new Error('duplicateMeta is required for duplicate flows.');
    }

    const messageBrandname =
      brand === 'providenthousing.com' ? 'Provident' : 'Puravankara';

    const duplicateMsg = duplicateInfoText(
      messageBrandname,
      opts.duplicateMeta,
    );

    await this.sendSmsVersatileHubExact({
      url: smsUrl,
      api: cfg.api,
      senderId: cfg.senderId,
      campaignId,
      channel,
      templateId: cfg.templateId,
      countryCodePlus: `+${cfg.country}`,
      number: mobile,
      message: duplicateMsg,
      dcs: cfg.dcs,
      shorturl: cfg.shorturl,
      international: cfg.international,
    });

    if (opts.alsoSendOtp) {
      const normalCfg = getBrandCfg(this.config, brand, 'normal');
      const msg =
        `${otp} is the one-time password for authentication. ` +
        `OTP expires in 30 seconds. Please do not share it with anyone. ${normalCfg.signature}`;

      await this.sendSms({
        url: smsUrl,
        api: normalCfg.api,
        senderId: normalCfg.senderId,
        templateId: normalCfg.templateId,
        countryCode: normalCfg.country,
        number: mobile,
        message: msg,
        campaignId,
        channel,
      });
    }
  }

  // Welcome code straight-through flow.
  private async callWelcomeCodeAPI(dto: any): Promise<any> {
    try {
      const welcomeCode = dto?.welcomeCode;
      const normalized = await this.sfdcService.postToSiteVisit({
        welcomeCode,
      });
      const finalEnquiryResp = await this.findMatchingEnquiry(normalized, dto);
      const finalEnquiry = finalEnquiryResp?.data;
      const flag = finalEnquiryResp?.flag;
      logger.info('final query welcomeCode flow', finalEnquiry);
      if (finalEnquiry === 'NL') {
        throw new NotFoundException(`Welcome code Not found`);
      }
      if (finalEnquiry === 'Error') {
        throw new BadRequestException(`This Welcome code is already redeemed.`);
      }
      normalized.data = [finalEnquiry];
      const formatedResponse = formatProviderResponse(normalized);
      const first = formatedResponse?.data[0]?.data?.[0]
        ? formatedResponse?.data[0]?.data?.[0]
        : formatedResponse?.data[0];
      const EnqRefNo = pickEnqRefNo(first);
      let status;
      if (normalized?.status === 'EL') status = 'EL';
      else if (normalized?.status === 'NL') status = 'NL';
      else status = normalized?.status;
      const project = await this.sfdcProjectRepo.findOne({
        where: [
          { displayName: finalEnquiry?.projectInterested, isDeleted: false },
          { projectName: finalEnquiry?.projectInterested, isDeleted: false },
        ],
        select: ['displayName', 'id', 'projectName'],
      });
      let isMarkRevisit: 0 | 1 = 0;
      const existing = await this.siteVisitRepo.findOne({
        where: { enquiryId: Number(EnqRefNo) },
        order: { updatedAt: 'DESC' },
      });
      isMarkRevisit = computeIsMarkRevisit(existing);
      const isWelcomeCodeUsed = status === 'EL' ? 1 : 0;
      return {
        status,
        isWelcomeCodeUsed,
        projectId: project.id,
        projectName: project.projectName,
        isMarkRevisit,
        flag,
        data: first,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Welcome code failed: ${error?.message ?? error}`,
      );
    }
  }

  // Client SMS endpoint call
  private async sendSms(args: {
    url: string;
    api: string;
    senderId: string;
    templateId: string;
    countryCode: string;
    number: string;
    message: string;
    campaignId?: string;
    channel?: string;
  }): Promise<void> {
    try {
      const code = (args.countryCode || '91').replaceAll(/\D/g, '');
      const mobile = (args.number || '').replaceAll(/\D/g, '');
      const body = {
        api: args.api,
        senderid: args.senderId,
        campaignid: args.campaignId ?? 'otp',
        channel: args.channel ?? 'otp',
        templateid: args.templateId,
        dcs: '0',
        shorturl: 'NO',
        data: [
          {
            international: 'NO',
            countrycode: code,
            number: mobile,
            message: args.message,
            url: '',
          },
        ],
      };

      const { status, statusText } = await lastValueFrom(
        this.http.post(args.url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
        }),
      );
      if (status < 200 || status >= 300)
        throw new Error(`SMS provider non-2xx: ${status} ${statusText}`);
    } catch (e) {
      throw new InternalServerErrorException(
        `Failed to send OTP SMS: ${e?.message ?? e}`,
      );
    }
  }

  private async isBlocked(mobile: string, projectInterested: string) {
    const bKey = blockKey(mobile, projectInterested);
    const blocked = await this.cacheService.get<{ until: number | string }>(
      bKey,
    );
    if (!blocked) return null;

    const now = Date.now();
    if (typeof blocked.until === 'number' && now < blocked.until) {
      return blocked.until - now;
    }

    // expired temp block => clean
    await this.cacheService.del(bKey);
    return null;
  }

  private async blockUser(
    mobile: string,
    projectInterested: string,
    permanent = false,
  ) {
    const bKey = blockKey(mobile, projectInterested);

    if (!permanent) {
      const until = Date.now() + OTP_EXPIRY_TTL_MS;
      await this.cacheService.set(bKey, { until }, OTP_EXPIRY_TTL_MS);
    }

    try {
      const raw =
        (await this.cacheService.get<string>(blockedIndexKey)) ?? '[]';
      const arr = new Set<string>(JSON.parse(raw));
      arr.add(`${projectInterested}:${mobile}`);
      await this.cacheService.set(
        blockedIndexKey,
        JSON.stringify(Array.from(arr)),
      );
    } catch {}
  }
  async findMatchingEnquiry(statusRes: StatusResponse, dto: any): Promise<any> {
    const primarySourceFromDto = dto?.primarySource;
    const welcomeCodeFromDto = dto?.welcomeCode ?? '0';
    const today = dayjs();
    let uniqueSource = true;
    let noLeadWithSiteVisit = true;
    let duplicateEnquiry;
    const isDuplicateAvailable = false;
    const finalRes: any = {};
    const finalWcRes: any = {};

    logger.info('Entrypoint in matching query');

    // Case 1: If status is 'NL', return the only record
    if (statusRes.status === 'NL') {
      return statusRes?.data[0];
    }

    // Case 2: If status is 'EL', process matching logic
    if (statusRes.status === 'EL') {
      logger.info('Existing lead journey started');

      let matchedEnquiry;
      let welcomeCodeFound = false;
      const enquiries = statusRes?.data || [];
      const enqLength = enquiries.length;
      let flag = 'single';

      // Default fallback when no specific match is found
      finalWcRes.fifth = { data: 'NL', flag };
      finalRes.tenth = { data: 'NL', flag };

      if (enqLength > 0) {
        for (const enquiry of enquiries) {
          const {
            welcomeCode,
            welcomeCodeUsed,
            siteVisitHappend,
            primarySource,
            leadStatus,
            timeof1stVisit,
            channelpartnerId,
          } = enquiry;

          let leadProtectionExpiry = enquiry?.leadProtectionExpiry || null;

          // Set lead protection expiry if not present but site visit happened

          if (
            siteVisitHappend &&
            (!leadProtectionExpiry || leadProtectionExpiry === '')
          ) {
            noLeadWithSiteVisit = false;
            if (timeof1stVisit) {
              const [day, month, year] = timeof1stVisit.split('.');
              // Create date safely (no string parsing issues)
              const baseDate = new Date(year, month - 1, day);
              // Add 45 days
              baseDate.setDate(baseDate.getDate() + 45);
              // Convert to IST (Asia/Kolkata)
              leadProtectionExpiry = new Date(
                baseDate.toLocaleString('en-US', {
                  timeZone: 'Asia/Kolkata',
                }),
              );
            }
          }

          const expiryDate = leadProtectionExpiry
            ? dayjs(leadProtectionExpiry)
            : null;
          const isProtectionActive = expiryDate
            ? today.isBefore(expiryDate)
            : false;

          // Check primary source match
          const primaryMatches =
            primarySourceFromDto?.toLowerCase() === 'channel partner'
              ? primarySourceFromDto === primarySource &&
                channelpartnerId === dto?.channelPartner
              : primarySourceFromDto === primarySource;

          const welcomeCodeMatches = welcomeCodeFromDto === welcomeCode;
          if (primaryMatches) {
            uniqueSource = false;
          }

          // Flag for duplicate enquiries
          if (enqLength > 1 && !primaryMatches && isProtectionActive) {
            flag =
              primarySourceFromDto?.toLowerCase() === 'channel partner'
                ? 'duplicate cp'
                : 'duplicate';
          }

          // Case: Welcome code provided
          if (
            welcomeCodeFromDto !== '0' &&
            welcomeCodeFromDto !== null &&
            welcomeCodeFromDto !== ''
          ) {
            if (isProtectionActive) {
              if (welcomeCodeUsed && welcomeCodeMatches) {
                throw new BadRequestException(
                  `This Welcome code is already redeemed.`,
                );
              }
              if (welcomeCodeUsed) {
                finalWcRes.first = { data: enquiry, flag: 'duplicate' };
              } else {
                finalWcRes.second = { data: enquiry, flag };
              }
            } else if (welcomeCodeMatches) {
              if (welcomeCodeUsed) {
                finalWcRes.third = { data: 'Error', flag: 'duplicate' };
              }
              welcomeCodeFound = true;
              matchedEnquiry = enquiry;
            }
          } else {
            // Case: Lead protection is active and site visit happened
            // if (leadStatus != 'Duplicate') {
            if (isProtectionActive && siteVisitHappend) {
              logger.info(
                'Lead protection active + siteVisitHappend',
                enquiry.enqRefNo,
              );
              finalRes.first = { data: enquiry, flag };
            }

            // Case: Site visit hasn't happened
            if (!siteVisitHappend) {
              if (primaryMatches) {
                logger.info("Site visit hasn't happened & primary is matching");
                finalRes.second = { data: enquiry, flag };
                // switch (leadStatus) {
                //   case 'Site Visit Booked':
                //     finalRes.second = { data: enquiry, flag };
                //     break;
                //   case 'Allocated':
                //     finalRes.third = { data: enquiry, flag };
                //     break;
                //   case 'Follow Up Later':
                //     finalRes.forth = { data: enquiry, flag };
                //     break;
                //   case 'Open':
                //     finalRes.fifth = { data: enquiry, flag };
                //     break;

                //   default:
                //     if (leadStatus?.toLowerCase() === 'Virgin') {
                //       finalRes.sixth = { data: enquiry, flag };
                //     } else if (leadStatus?.toLowerCase() === 'Rejected') {
                //       finalRes.seventh = { data: enquiry, flag };
                //     }
                //     break;
                // }
              } else if (
                ['Allocated', 'Open', 'Follow Up Later'].includes(
                  leadStatus ?? '',
                )
              ) {
                logger.info(
                  "Site visit hasn't happened & primary not matching and status in allocated, open, follow-up",
                );
                // finalRes.eighth = { data: enquiry, flag };
              } else {
                logger.info(
                  "Site visit hasn't happened & primary not matching",
                );
              }
            }

            // Case: Retention period expired
            if (!isProtectionActive && siteVisitHappend) {
              if (primaryMatches) {
                logger.info('Retention period expired', enquiry.enqRefNo);
                finalRes.ninth = { data: enquiry, flag };
              } else if (
                ['Expired', 'Site Visit Booked'].includes(leadStatus)
              ) {
                logger.info(
                  'Retention period expired and primary is not matching',
                  enquiry.enqRefNo,
                );
              }
            }
            // } else {
            //   logger.info('Duplicate lead is considered as primary');
            //   if (primaryMatches) {
            //     isDuplicateAvailable = true;
            //     duplicateEnquiry = enquiry;
            //   }
            // }
          }
        }
        logger.info('finalRes', Object.keys(finalRes));
        if (noLeadWithSiteVisit && isDuplicateAvailable) {
          finalRes.nlwsvh = { data: duplicateEnquiry, flag };
        }
        if (Object.keys(finalRes).length > 1 && uniqueSource === true) {
          logger.info('Duplicate lead creation process started');
          return { data: 'NL', flag };
        }
        // If welcome code matched after iteration
        if (welcomeCodeFound) {
          finalWcRes.fourth = { data: matchedEnquiry, flag };
        }

        // Final priority response when welcomeCode was provided
        if (
          welcomeCodeFromDto !== '0' &&
          welcomeCodeFromDto !== null &&
          welcomeCodeFromDto !== ''
        ) {
          const resp =
            finalWcRes.first ??
            finalWcRes.second ??
            finalWcRes.third ??
            finalWcRes.fourth ??
            finalWcRes.fifth;
          return resp;
        } else {
          // Return based on matching hierarchy
          return (
            finalRes.first ??
            finalRes.second ??
            finalRes.third ??
            finalRes.fourth ??
            finalRes.fifth ??
            finalRes.sixth ??
            finalRes.seventh ??
            finalRes.eighth ??
            finalRes.ninth ??
            finalRes.nlwsvh ??
            finalRes.tenth
          );
        }
      }
    } // Fallback when nothing matches
    return { message: 'Something went wrong' };
  }

  async createDuplicateSFDCLead(dto: any) {
    try {
      const body: any = {
        company: 'null',
        mobile: dto.mobile,
        firstname: dto?.firstName,
        lastname: dto?.lastName,
        projectInterested: dto.projectInterested,
        primarySource: dto?.primarySource,
      };
      logger.info('Duplicate lead initited');
      if (dto.primarySource == 'Channel Partner') {
        body.channelpartnername = dto.channelPartner;
      } else if (dto.primarySource == 'Purva Champion') {
        body.Referredemployee = dto?.employeeName;
      } else if (
        dto.primarySource == 'Provident Premier' ||
        dto.primarySource == 'Purva Privilege'
      ) {
        body.Referredemployee = dto?.referredBy || '';
      }
      logger.info('Duplicate lead payload', body);
      await this.sfdcService.createNewLeadInSFDC(body);
    } catch (error) {
      logger.info('Failed to create duplicate lead');
      logsAndErrorHandling('Site-Visit-Login', error, dto);
    }
  }

  private async sendSmsVersatileHubExact(params: VersatileHubExactParams) {
    const body = {
      api: params.api,
      senderid: params.senderId,
      campaignid: params.campaignId,
      channel: params.channel,
      templateid: params.templateId,
      dcs: params.dcs ?? '0',
      shorturl: params.shorturl ?? 'NO',
      data: [
        {
          international: params.international ?? 'NO',
          countrycode: params.countryCodePlus,
          number: params.number,
          message: params.message,
          url: '',
        },
      ],
    };
    await this.http.axiosRef.post(params.url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  }
}
