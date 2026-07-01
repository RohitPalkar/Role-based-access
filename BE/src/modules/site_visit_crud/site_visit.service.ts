import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SiteVisitForm } from './entities/site_visit_form.entity';
import { SfdcProjectListing } from './entities/sfdc_project_listing.entity';
import { Repository } from 'typeorm';
import { CreateSiteVisitFormDto } from './dto/create-site-visit.dto';
import { UpdateSiteVisitFormDto } from './dto/update-site-visit.dto';
import { SfdcService } from '../sfdc/sfdc.service';
import { decode } from 'html-entities';
import { computeIsMarkRevisit } from 'src/helpers/customerCheck.helper';
import { GRESiteVisitFormDto } from './dto/GRE-visit.dto';
import { logger } from 'src/logger/logger';
import { FilterVisitListDto } from './dto/filter-visit-list.dto';
import { CustomerDetailsDto } from './dto/customer-details.dto';
import {
  getCXFieldsToCheck,
  getGREFieldsToCheck,
  validateDropdowns,
  determineFormFilledStatus,
} from 'src/helpers/siteVisitForm.helper';
import { Users } from 'src/entities';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GREProjectMapping } from './entities/gre-project-mapping.entity';
import { safeNumber } from 'src/helpers/number-transform';

@Injectable()
export class SiteVisitCrudService {
  constructor(
    @InjectRepository(SiteVisitForm)
    private readonly formRepo: Repository<SiteVisitForm>,
    private readonly sfdcService: SfdcService,
    @InjectRepository(SfdcProjectListing)
    private readonly listingRepo: Repository<SfdcProjectListing>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
    @InjectRepository(GREProjectMapping)
    private readonly greMappingRepo: Repository<GREProjectMapping>,
  ) {}

  async prepareGREObject(dto?: any): Promise<any> {
    const sfdcObject: any = {};

    if (dto?.leadId) {
      sfdcObject.Id = dto?.leadId;
    }

    if (dto?.headCount) {
      sfdcObject.SV_Head_Count__c = Number.parseInt(dto?.headCount, 10);
    }

    if (dto?.gender) {
      sfdcObject.Sv_Gender__c = dto?.gender;
    }

    if (dto?.maritalStatus) {
      sfdcObject.Marital_Status__c = dto?.maritalStatus;
    }

    if (dto?.organizationName) {
      sfdcObject.Sv_Company_Name__c = dto?.organizationName;
    }

    if (dto?.organizationAddress) {
      sfdcObject.Sv_Current_Company_Address__c = dto?.organizationAddress;
    }

    if (dto?.purchaseReason) {
      sfdcObject.Sv_Reasons_for_purchase__c = dto?.purchaseReason;
    }

    if (dto?.budget) {
      sfdcObject.Budget__c = dto?.budget;
    }

    if (dto?.assignedRM) {
      sfdcObject.STM_2__c = dto?.assignedRM;
    }

    if (dto?.currentResidenceType) {
      sfdcObject.Current_Residence_Typology__c = dto?.currentResidenceType;
    }
    if (dto?.designation) {
      sfdcObject.SV_Desination_of_Customer__c = dto?.designation;
    }

    if (dto?.exitTime && (dto?.exitTime != '' || dto?.exitTime != null)) {
      const inputTime = dto?.exitTime;
      const today = new Date();

      const [hours, minutes] = inputTime.split(':').map(Number);

      // Set today's date with the input time
      const fullDate = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          hours,
          minutes,
          56,
          460,
        ),
      );
      sfdcObject.Exit_Time__c = fullDate;
    }
    return sfdcObject;
  }
  async prepareSfdcObject(
    dto: SiteVisitForm,
    isWelcomeCodeUsed,
    fullUrl,
    originalPrimarySource?: string,
  ): Promise<any> {
    const project = await this.listingRepo.findOne({
      where: [
        { displayName: dto.projectName },
        { projectName: dto.projectName },
      ],
      select: ['projectName'],
    });

    const dynamicVisit = this.getDynamicVisitKey(dto.visitCount);

    const sfdcObject: any = {
      enqRefNo: dto.enquiryId,
      mobile: dto.mobile,
      firstName: dto.firstName,
      lastname: dto.lastName,
      email: dto.email,
      projectInterested: project?.projectName,
      address: dto.residentialAddress,
      occupation: dto.occupation,
      designation: dto.designation,
      AlternateMobileno: dto.alternateMobile,
      SourceofFunding: dto.financeSource,
      PurchaseTimeline: dto.purchaseDuration,
      svCompany: dto.organizationName,
      rstatus: dto.residentialStatus,
      currentAccommodation: dto.currentAccommodation,
      companyaddress: dto.organizationAddress,
      budgetofpurchase: dto.priceRange,
      interestedtypeofunit: dto.inventoryOptions,
      primarySource: dto.primarySource,
      channelpartnername: dto.channelPartner,
      Referredemployee: dto.referredBy,
      genderValue: dto.gender,
      PrimaryApartmentType: dto.currentResidenceType,
      reasonsforpurchase: dto.purchaseReason,
      mstatus: dto.maritalStatus,
      rmname: dto.assignedRM,
      NoOfVisits: dto.visitCount,
      familySize: dto.headCount,
      [dynamicVisit]: dto?.updatedAt
        ? new Date(
            new Date(dto?.updatedAt).toLocaleString('en-US', {
              timeZone: 'Asia/Kolkata',
            }),
          )
        : '',
      svFormFilledOnline: true,

      timeofVisit: new Date(
        new Date(dto?.updatedAt).toLocaleString('en-US', {
          timeZone: 'Asia/Kolkata',
        }),
      ),
      siteVisitHappend: true,
    };

    // Conditionally include welcomeCodeUsed only if isWelcomeCodeUsed is 0 or 1
    if (isWelcomeCodeUsed === 1) sfdcObject.welcomeCodeUsed = true;

    if (fullUrl !== '' && fullUrl !== null) {
      sfdcObject.siteVisitFormURL = fullUrl;
    }

    // Apply primary / secondary source logic
    this.applyPrimarySecondarySources(
      sfdcObject,
      dto.primarySource,
      originalPrimarySource,
    );

    return sfdcObject;
  }

  /**
   * Helper: returns the dynamic visit field name based on visitCount.
   */
  private getDynamicVisitKey(visitCount: number): string {
    const map: Record<number, string> = {
      1: 'timeof1stVisit',
      2: 'timeof2ndVisit',
      3: 'timeof3rdVisit',
    };
    return map[visitCount] ?? 'timeof4thVisit';
  }

  /**
   * Helper: applies primarySource and secondarySource fields to the SFDC object
   */
  private applyPrimarySecondarySources(
    sfdcObject: any,
    primarySource: string,
    originalPrimarySource?: string,
  ): void {
    const isExisting = originalPrimarySource === 'Existing Customer';

    // Case 1: Loyalty bucket
    if (
      (primarySource === 'Purva Privilege' ||
        primarySource === 'Provident Premier') &&
      isExisting
    ) {
      sfdcObject.primarySource = primarySource;
      sfdcObject.secondarySource = 'Loyalty';
      return;
    }

    // Case 2: Non-existing customer referrals
    if (!isExisting) {
      if (primarySource === 'Purva Privilege') {
        sfdcObject.secondarySource = 'Privilege Referral';
        return;
      }

      if (primarySource === 'Provident Premier') {
        sfdcObject.secondarySource = 'Premier Referral';
        return;
      }
    }
  }

  async create(
    dto: CreateSiteVisitFormDto,
    fullUrl: string,
  ): Promise<{ id; savedForm: SiteVisitForm }> {
    if (dto?.isWelcomeCodeUsed == 0 && !dto?.primarySource)
      throw new BadRequestException('Please send a valid request.');

    if (dto?.purchaseDuration)
      dto.purchaseDuration = decode(dto.purchaseDuration || '');

    if (dto?.primarySource) dto.primarySource = decode(dto.primarySource || '');

    const existing = await this.formRepo.findOne({
      where: { enquiryId: dto.enquiryId },
    });

    validateDropdowns(dto);
    const projectDetails = await this.listingRepo.findOne({
      where: [
        { displayName: dto?.projectName },
        { projectName: dto?.projectName },
      ],
      select: ['brandName', 'displayName'],
    });
    dto.projectName = projectDetails?.displayName;
    const primarySourceMapping: Record<string, string> = {
      'Digital Medium': 'Digital Marketing',
      'Authorised Channel Partner': 'Channel Partner',
      'Direct Walk-in': 'Direct WalkIn / Site Branding',
      'Existing Customer':
        projectDetails?.brandName == 'Purva Land' ||
        projectDetails?.brandName == 'Puravankara'
          ? 'Purva Privilege'
          : 'Provident Premier',
      'Referred by Employee of Puravankara Group': 'Purva Champion',
      'Referred by Family/Friend':
        projectDetails?.brandName == 'Purva Land' ||
        projectDetails?.brandName == 'Puravankara'
          ? 'Purva Privilege'
          : 'Provident Premier',
      Hoarding: 'Hoarding',
    };
    const originalPrimarySource = dto?.primarySource;
    if (dto?.primarySource && primarySourceMapping[dto.primarySource])
      dto.primarySource = primarySourceMapping[dto.primarySource];

    if (existing) {
      const updatedForm = await this.update(Number(existing?.enquiryId), dto);
      return updatedForm;
    }

    const form = this.formRepo.create(dto);
    const savedForm = await this.formRepo.save(form);

    const sfdcObject = await this.prepareSfdcObject(
      savedForm,
      dto?.isWelcomeCodeUsed,
      fullUrl,
      originalPrimarySource,
    );
    logger.info('SFDC Payload:', JSON.stringify(sfdcObject));

    const sfdcResp = await this.updateSfdcLead(sfdcObject);
    logger.info('SFDC Response:', sfdcResp);
    await this.cacheService.del('SFDC_GRE_LISTING');
    return { id: savedForm.id, savedForm };
  }

  async updateSfdcLead(sfdcObject: object): Promise<void> {
    try {
      const normalized = await this.sfdcService.postSiteVisitToSFDC(sfdcObject);
      return normalized;
    } catch {}
  }

  async updateVisitCount(id: number, dto?: Partial<UpdateSiteVisitFormDto>) {
    // Find the existing record by id
    const existingRecord = await this.formRepo.findOneBy({ enquiryId: id });

    if (!existingRecord) throw new Error(`Record with id ${id} not found`);

    // Increment visit_count
    existingRecord.visitCount = (existingRecord.visitCount || 0) + 1;

    // Update other fields if dto is provided
    if (dto) Object.assign(existingRecord, dto);

    // Save updated record back to DB
    await this.formRepo.save(existingRecord);
    const sfdcObject = await this.prepareSfdcObject(existingRecord, 2, '');
    logger.info('SFDC Payload:', sfdcObject);

    const sfdcResp = await this.updateSfdcLead(sfdcObject);
    logger.info('SFDC Response:', sfdcResp);
  }

  async update(
    id: number,
    dto: Partial<CreateSiteVisitFormDto>,
  ): Promise<{ id; savedForm: SiteVisitForm }> {
    const form = await this.formRepo.findOne({ where: { enquiryId: id } });
    if (!form) throw new NotFoundException('Form not found.');

    if (dto?.purchaseDuration)
      dto.purchaseDuration = decode(dto.purchaseDuration || '');

    // Preserve uneditable fields
    dto.mobile = form.mobile;
    dto.enquiryId = form.enquiryId;
    dto.primarySource = form.primarySource;
    dto.channelPartner = form.channelPartner;
    dto.exProjectName = form.exProjectName;
    dto.unitNumber = form.unitNumber;
    dto.referredBy = form.referredBy;

    const updatedForm = this.formRepo.merge(form, dto);
    const savedForm = await this.formRepo.save(updatedForm);
    if (!dto?.revisitCount) {
      savedForm.visitCount = savedForm.visitCount + 1;
      await this.updateVisitCount(id);
    }
    const sfdcObject = await this.prepareSfdcObject(savedForm, 2, '');
    logger.info('SFDC Payload:', sfdcObject);

    const sfdcResp = await this.updateSfdcLead(sfdcObject);
    logger.info('SFDC Response:', sfdcResp);

    return { id, savedForm };
  }

  async findAll(filter?: {
    mobile?: string;
    ProjectName?: string;
    sourcingRmName?: string;
    fromDate?: string; // Expecting ISO string like "2023-01-01"
    toDate?: string; // Expecting ISO string like "2023-01-31"
  }): Promise<object> {
    const where: any = {};

    if (filter.mobile) where.mobile = filter.mobile;

    if (filter.ProjectName) where.projectName = filter.ProjectName;

    const allForms = await this.formRepo.find({
      where,
      select: [
        'projectId',
        'mobile',
        'firstName',
        'lastName',
        'email',
        'residentialAddress',
        'occupation',
        'organizationName',
        'designation',
        'currentAccommodation',
        'ownedHouseCount',
        'purchaseDuration',
        'financeSource',
        'residentialStatus',
        'organizationAddress',
        'assignedRM',
        'assignedRmName',
        'sourcingRm',
        'sourcingRmName',
      ],
    });
    await this.cacheService.del('SFDC_GRE_LISTING');
    return { data: allForms };
  }

  async findOne(id: number): Promise<object> {
    const key = 'SFDC_GRE_LISTING';
    let cache = await this.cacheService.get<any>(key);
    if (!cache || cache?.length == 0) {
      const SFDCList = await this.sfdcService.visitList();
      cache = await this.cacheService.set('SFDC_GRE_LISTING', SFDCList, 300000);
    }
    const finalData = cache.filter((item) => item.Enquiry_Ref_No == id);
    if (!finalData) throw new NotFoundException('Form not found.');
    return { data: finalData };
  }

  async getStaticDropdown(): Promise<object> {
    try {
      const respObj = {
        resedential_status: ['Indian', 'NRI'],

        numberOf_homes_owned: ['1st Home', '2nd Home', '3rd Home'],
        project_source: [
          'Digital Medium',
          'Authorised Channel Partner',
          'Existing Customer',
          'Referred by Family/Friend',
          'Direct Walk-in',
          'Hoarding',
          'Referred by Employee of Puravankara Group',
          'Database',
          'Corporate',
        ],
        current_residence: [
          'Rented',
          'Owned',
          'Company provided',
          'Living with parents',
          'Living with children',
        ],
        current_residence_type: ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK'],
        purchase_reason: ['Self-use', 'Investment', 'For Relatives/Friends'],
        purchase_duration: ['< 2 Weeks', '1 Month', '2 Months', '> 2 Months'],
        marital_status: ['Single', 'Married'],
        finance_source: [
          'Own funds',
          'Home loan',
          'Sale of existing property',
          'Others',
        ],
        form_status: [
          'Form Submission Pending',
          'GRE Fields Pending',
          'GRE fields Updated ',
          'RM Fields Pending',
          'RM fields Updated ',
          'Completed',
        ],
        gender: ['Male', 'Female', 'Not listed'],
        referralProjects: [
          'Purva Atmosphere',
          'Purva Atria',
          'Purva Atria Plaitna',
          'Purva Belmont',
          'Belvedere',
          'Bouganvilla',
          'Brighton Court',
          'Purva Carnation',
          'Castlemaine',
          'Purva Coronation Square',
          'Elita Promenade',
          'Purva Fairmont',
          'Purva Fernhill Gardens',
          'Purva Fountain Square',
          'Glendale',
          'Purva Graces',
          'Purva Grande',
          'Purva Heights',
          'Purva Highcrest',
          'Purva Highlands - Phase I',
          'Purva Iris',
          'Purva Meraki',
          'Purva Midtown Residences',
          'Purva Nest',
          'Purva Palm Beach',
          'Purva Panorama',
          'Purva Paradise',
          'Purva Park',
          'Purva Park Hill',
          'Purva Parkridge',
          'Purva Parkway',
          'Purva Pavillion',
          'Purva Promenade',
          'Purva Riviera',
          'Purva Season',
          'Shanthi Manor',
          'Purva Skydale',
          'Purva Skywood (Ph I & II)',
          'Purva Sound of Water - 1',
          'Stafford',
          'Purva Sunflower',
          'Purva Sunshine',
          'Purva Vantage',
          'Purva Venezia',
          'Purva Westend',
          'Purva Whitehall',
          'Purva Zenium',
          'Purva Jade',
          'Oakland',
          'Purva Somerset House',
          'Purva Swanlake',
          'Purva Winderemere I',
          'Purva Amaiti',
          'Purva Bluemont',
          'Purva Eternity',
          'Purva Grandbay',
          'Marina One',
          'Purva Moonreach (Ph I)',
          'Purva Oceana',
          'Elita Garden Vista',
          'Purva Clermont',
          'Purva Hill View',
          'Park Unique',
          'Royal Gate',
          'Silver Gate',
          'Urban Park',
          'Purva Aspire',
          'Purva Emerald Bay',
          'Purva Silversands',
          'Summit',
          'Provident Park Square',
          'Provident Adora De Goa',
          'Provident Bayscape',
          'Provident Capella',
          'Provident Botanico',
          'Provident Deansgate',
          'Provident Cosmocity',
          'Provident Greenpark',
          'Provident Tree',
          'Provident Neora',
          'Provident Ecopolitan',
          'Provident Equinox',
          'Provident Kenworth',
          'Provident Kenvista',
          'Provident Palmvista',
          'Provident Sunworth',
          'Provident Skyworth',
          'Provident Welworth',
          'Provident Winworth',
          'Purva Kensho Hills',
          'Purva Tree Heaven',
          'Purva Oakshire',
          'Purva Tivoli Hills',
          'Purva Woodfield',
          'Purva Soukhyam',
          'Purva Raagam',
          'Purva Southbay',
          'Purva Hibiscus',
          'Purva Northen Lights',
          'Purva Silversky',
          'Purva Estrella',
          'Codename Kudlu Gate',
          'Codename Hennur',
          'Codename Vajarahalli',
        ],
      };

      return respObj;
    } catch {}
  }

  async getDropDown(name: string, isGreOrigin: boolean): Promise<object> {
    const projectDetails = await this.listingRepo.findOne({
      where: [
        { projectName: name, isDeleted: false },
        { displayName: name, isDeleted: false },
      ],
      select: ['inventoryOptions', 'priceRange', 'displayName'],
    });

    //If it's not GRE then purva/provident is needed
    if (isGreOrigin && projectDetails.displayName !== name)
      throw new BadRequestException(`Project with ${name} does not exist`);

    const cacheKey = 'site-visit-form-value';
    const cachedData = await this.cacheService.get<any>(cacheKey);
    let projectDropdown;
    if (cachedData) {
      projectDropdown = cachedData;
    } else {
      projectDropdown = await this.sfdcService.getPickList();
      await this.cacheService.set(cacheKey, projectDropdown, 900 * 1000);
    }
    const siteVisitDropDown = await this.getStaticDropdown();
    projectDropdown.siteVisitDropDown = siteVisitDropDown;
    if (projectDropdown?.siteVisitDropDown) {
      const inventoryOptions = projectDetails?.inventoryOptions;
      const priceRange = projectDetails?.priceRange;
      projectDropdown.siteVisitDropDown.inventoryOptions =
        JSON.parse(inventoryOptions);
      projectDropdown.siteVisitDropDown.priceRange = JSON.parse(priceRange);
    }
    if (!projectDropdown) throw new NotFoundException('Data not found.');
    return { data: projectDropdown };
  }
  async updateGREVisit(
    id: number,
    dto: Partial<GRESiteVisitFormDto>,
  ): Promise<object> {
    const form = await this.formRepo.findOne({ where: { enquiryId: id } });
    if (!form) throw new NotFoundException('Form not found.');
    const updated = this.formRepo.merge(form, dto);
    await this.formRepo.save(updated);
    const updatedForm = await this.formRepo.findOne({
      where: { enquiryId: id },
    });
    const greObject = await this.prepareGREObject(dto);
    logger.info('SFDC Payload:', greObject);
    greObject.enqRefNo = id;
    await this.sfdcService.greUpdateToSFDC(greObject);
    await this.cacheService.del('SFDC_GRE_LISTING');
    return { data: updatedForm };
  }

  async updateCustomerDetails(
    id: number,
    dto: CustomerDetailsDto,
  ): Promise<object> {
    validateDropdowns(dto);
    const form = await this.formRepo.findOne({ where: { enquiryId: id } });
    if (!form) throw new NotFoundException('Form not found.');
    const updated = this.formRepo.merge(form, dto);
    await this.formRepo.save(updated);
    const updatedForm = await this.formRepo.findOne({
      where: { enquiryId: id },
    });
    const greObject = await this.prepareGREObject(dto);
    logger.info('SFDC Payload:', greObject);
    greObject.enqRefNo = id;
    await this.sfdcService.greUpdateToSFDC(greObject);
    await this.cacheService.del('SFDC_GRE_LISTING');
    return { data: updatedForm };
  }

  async getGREVisitList(
    greId: number,
    email: string,
    filters: FilterVisitListDto,
  ): Promise<object> {
    let projectNames = (
      await this.greMappingRepo.find({
        where: { email },
        select: ['projectName'],
      })
    )
      .map((item) => item.projectName)
      .flat();

    if (!projectNames.length) {
      throw new NotFoundException('No projects found for the given GRE ID');
    }

    if (filters?.projectName) {
      projectNames = [filters.projectName];
    }

    const { enquiryIdArray, page, limit, total } =
      await this.fetchGreVisitEnquiries(projectNames, filters);

    const key = 'SFDC_GRE_LISTING';

    let cache = await this.cacheService.get<any>(key);

    if (!cache || cache.length === 0) {
      const SFDCList = await this.sfdcService.visitList();

      await this.cacheService.set(key, SFDCList, 300000);

      cache = await this.cacheService.get<any>(key);
    }

    let finalData = cache.filter((item) =>
      enquiryIdArray.includes(item.Enquiry_Ref_No),
    );

    if (!finalData.length) {
      return {
        data: {
          data: [],
          page,
          limit,
          totalCount: 0,
        },
      };
    }

    finalData = finalData.map((row) => {
      const rmFieldsToCheck = getCXFieldsToCheck(row);
      const greFieldsToCheck = getGREFieldsToCheck(row);

      const rmFilledCount = rmFieldsToCheck.filter(
        (val) => val !== null && val !== undefined && val !== '',
      ).length;

      const greFilledCount = greFieldsToCheck.filter(
        (val) => val !== null && val !== undefined && val !== '',
      ).length;

      const rmCounts = `${rmFilledCount}/${rmFieldsToCheck.length}`;
      const greCounts = `${greFilledCount}/${greFieldsToCheck.length}`;

      const formFilledStatus = determineFormFilledStatus(rmCounts, greCounts);

      return {
        ...row,
        rmCounts,
        greCounts,
        formFilledStatus,
      };
    });

    return {
      data: {
        data: finalData,
        page,
        limit,
        totalCount: total,
      },
    };
  }

  private async fetchGreVisitEnquiries(
    projectNames: string[],
    filters: FilterVisitListDto,
  ): Promise<{
    enquiryIdArray: string[];
    page: number;
    limit: number;
    total: number;
  }> {
    const query = this.formRepo
      .createQueryBuilder('form')
      .select(['form.enquiryId'])
      .where('form.projectName IN (:...projectNames)', {
        projectNames,
      });

    if (filters.sourcingRmName) {
      query.andWhere(
        '(form.sourcingRmName = :sourcingRmName OR form.assignedRmName = :sourcingRmName)',
        {
          sourcingRmName: filters.sourcingRmName,
        },
      );
    }

    if (filters.fromDate && filters.toDate) {
      const fromDateOnly = filters.fromDate.split('T')[0];
      const toDateOnly = filters.toDate.split('T')[0];

      query.andWhere(
        'DATE(form.createdAt) BETWEEN DATE(:fromDate) AND DATE(:toDate)',
        {
          fromDate: fromDateOnly,
          toDate: toDateOnly,
        },
      );
    } else if (filters.fromDate) {
      const fromDateOnly = filters.fromDate.split('T')[0];

      query.andWhere('DATE(form.createdAt) >= DATE(:fromDate)', {
        fromDate: fromDateOnly,
      });
    } else if (filters.toDate) {
      const toDateOnly = filters.toDate.split('T')[0];

      query.andWhere('DATE(form.createdAt) <= DATE(:toDate)', {
        toDate: toDateOnly,
      });
    }

    if (filters?.search?.trim()) {
      query.andWhere(
        `(
        form.enquiryId = :search OR
        form.firstName = :search OR
        form.lastName = :search OR
        concat(form.firstName," ",form.lastName) = :search OR
        form.mobile LIKE :searchLike
      )`,
        {
          search: filters.search,
          searchLike: `%${filters.search}%`,
        },
      );
    }

    // Sort Handling: sortBy = "svDate:desc"
    let sortField = 'form.createdAt';
    let sortDirection: 'ASC' | 'DESC' = 'DESC';

    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split(':');
      const dir = direction.toUpperCase();

      const sortFieldMap: Record<string, string> = {
        svDate: 'form.createdAt',
      };

      if (field in sortFieldMap && (dir === 'ASC' || dir === 'DESC')) {
        sortField = sortFieldMap[field];
        sortDirection = dir;
      }
    }

    query.orderBy(sortField, sortDirection);

    const page = safeNumber(filters.page, 1);
    const limit = safeNumber(filters.limit, 10);
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const [results, total] = await query.getManyAndCount();

    return {
      enquiryIdArray: results.map((row) => String(row.enquiryId)),
      page,
      limit,
      total,
    };
  }

  async formatPriceRange(priceRange: { min: number; max: number }[]): Promise<
    {
      min: number;
      max: number;
      minDisplayValue: string;
      maxDisplayValue: string;
    }[]
  > {
    return await Promise.all(
      priceRange.map(async (range) => ({
        ...range,
        minDisplayValue: await this.formatCurrency(range.min),
        maxDisplayValue: await this.formatCurrency(range.max),
      })),
    );
  }

  async formatCurrency(value: number): Promise<string> {
    if (value >= 10000000) {
      // 1 Cr = 1 Crore = 10,000,000
      const cr = value / 10000000;
      return `${cr}Cr`;
    } else {
      const lakh = value / 100000;
      return `${lakh}L`;
    }
  }

  async computeIsMarkRevisitByEnquiry(enquiryId: number): Promise<0 | 1> {
    if (!enquiryId) throw new BadRequestException('Enquiry Id is required.');
    const existing = await this.formRepo.findOne({ where: { enquiryId } });

    return computeIsMarkRevisit(existing);
  }
}
