import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  ILike,
  In,
  Repository,
  Not,
  Between,
  Brackets,
} from 'typeorm';
import * as moment from 'moment';
import { getYear, getMonth } from 'date-fns';
import { plainToInstance } from 'class-transformer';
import * as ExcelJS from 'exceljs';
import { CreateIncentiveBookingDto } from './dto/create_incentive_booking.dto';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { BULK_PAYOUT_UPDATE_QUEUE } from 'src/config/constants';

import {
  CityMaster,
  Brands,
  ProjectPhase,
  BillingEntity,
  Projects,
  IncentivePolicy,
  IncentiveBooking,
  Users,
  UserMonthlyGrossTotal,
  IncentiveSlab,
  IncentiveDeltaHistory,
  UserIncentivePayout,
  Notifications,
} from 'src/entities';

import {
  BookingStatusEnum,
  IncentiveFilterEnum,
  IncentiveTypeEnum,
  PaymentStatusEnum,
  ReraStatusEnum,
  SalesTypeEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';
import { ProjectStage } from 'src/enums/project-stage.enum';
import { logger } from '../../../logger/logger';
import { NotificationService } from '../../notifications/notification.service';
import { CustomConfigService } from '../../../config/custom-config.service';
import {
  DATE_FORMAT,
  EXCLUDED_BRANDS_FROM_SAP,
  FY_START,
  MONTH_DATE_YEAR,
  SLAB_MULTIPLIER,
} from 'src/config/constants';
import { getMonthNumber } from 'src/helpers/monthParser';
import {
  formatDateUtil,
  isValidDateOnOrBefore,
  safeDate,
} from 'src/helpers/date.helper';
import { IneligibilityReasonEnum } from 'src/enums/booking-status.enum';
import { getCellValue } from 'src/utils/excel.utils';
import { isIndianGroup } from 'src/utils/isIndianGroup';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { safeString } from 'src/helpers';

const CLOSING_RM_GROUP_ID = 9;

type ClosingRmSplitMetadata = {
  splitReason: 'CLOSING_RM_SPLIT' | 'NON_CLOSING_RM_SPLIT';
  participantCount: number;
  closingRmCount: number;
};

type ClosingRmSplitAssignment = {
  splitFactor: number;
  sharedGroupMetadata: ClosingRmSplitMetadata | null;
};

type BulkPayoutUpdateJobPayload = {
  filePath: string;
  fileName: string;
  updateOnlyDates?: boolean;
};

@Injectable()
export class IncentiveBookingService {
  constructor(
    @InjectRepository(CityMaster)
    private readonly cityRepository: Repository<CityMaster>,

    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,

    private readonly notificationService: NotificationService,

    @InjectQueue(BULK_PAYOUT_UPDATE_QUEUE)
    private readonly bulkPayoutUpdateQueue: Queue,

    private readonly queueJobAuditService: QueueJobAuditService,

    private readonly configService: CustomConfigService,
  ) {}

  // Utility: Convert "4,718,997.04" → 4718997.04

  private convertToNumber(value: string | number): number {
    try {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      return parseFloat(value.replace(/,/g, ''));
    } catch (error) {
      logger.error('Error in convertToNumber:', error);
      logsAndErrorHandling('IncentiveBookingService - convertToNumber', error, {
        value,
      });
    }
  }

  /**
   * Main Function: Insert Booking Data in Multiple Tables Based on SAP API Input
   * This function processes an array of booking data received from an external API.
   * It performs the following steps:
   * 1. Validates and converts the input data into DTO instances.
   * 2. Extracts unique names for cities, brands, billing entities, and project phases.
   * 3. Bulk fetches existing records for these entities from the database.
   * 4. Processes each booking item to create or update related entities (City, Brand, Billing Entity, Project Phase).
   * 5. Upsert (inserts or updates) the IncentiveBooking records based on the processed data.
   * 6. Sends notifications for any new entries created during the process.
   * All operations are performed within a database transaction to ensure data integrity.
   * @param bookingData - Array of booking data received from the external API.
   * @returns A promise that resolves to a success message or throws an error if any operation fails.
   */
  async insertDataInMultipleTablesBasedOnApi(
    bookingData: CreateIncentiveBookingDto[],
  ): Promise<any> {
    try {
      // Validate and convert raw booking data into DTO instances.
      const data = this.validateAndConvertData(bookingData);
      // Ensure the input is a non-empty array.
      if (!Array.isArray(data) || data.length === 0) {
        throw new BadRequestException('Invalid input: Data array is required.');
      }
      // Array to collect any notifications to be sent later.
      const notifications: any[] = [];

      // Execute the entire operation within a transaction to ensure atomicity.
      const result = await this.cityRepository.manager.transaction(
        async (transactionalEntityManager) => {
          try {
            /* Extract Unique Names
             Extract unique names for cities, brands, billing entities, and project phases
             from the input data. This will be used to bulk-fetch existing records.*/
            const {
              cityNames,
              brandNames,
              billingEntityNames,
              projectPhaseNames,
            } = this.extractUniqueNames(data);

            /* Bulk Fetch Existing Records
             Retrieve existing records from the database for cities, brands, project phases,
             and billing entities using the unique names extracted.*/
            const [
              existingCities,
              existingBrands,
              existingProjectPhases,
              existingBillingEntities,
            ] = await this.fetchExistingRecords(
              transactionalEntityManager,
              cityNames,
              brandNames,
              projectPhaseNames,
              billingEntityNames,
            );

            // Create in-memory maps keyed by name for quick look-up.
            const cityMap = new Map(existingCities.map((c) => [c.name, c]));
            const brandMap = new Map(existingBrands.map((b) => [b.name, b]));
            const billingEntityMap = new Map(
              existingBillingEntities.map((be) => [be.name, be]),
            );
            const projectPhaseMap = new Map(
              existingProjectPhases.map((pp) => [pp.name, pp]),
            );

            /* Bulk Fetch Users
             Extract unique user codes from the booking data using externalBPNumber.*/
            const uniqueUserCodes = Array.from(
              new Set(
                data.map((item) => item.externalBPNumber).filter(Boolean),
              ),
            );
            // Fetch all active users that match these codes, including their associated project and brand.
            const now = new Date();
            const users = await transactionalEntityManager
              .createQueryBuilder(Users, 'u')
              .leftJoinAndSelect(
                'u.groupAssignments',
                'uga',
                `
                  uga.startDate <= :now
                  AND (uga.endDate IS NULL OR uga.endDate >= :now)
                `,
                { now },
              )
              .leftJoinAndSelect('uga.group', 'g')
              .leftJoinAndSelect('u.project', 'p')
              .leftJoinAndSelect('p.brand', 'pb')
              .leftJoinAndSelect('pb.defaultPolicy', 'pdp')
              .leftJoinAndSelect('pdp.incentiveSlabs', 'pdpSlabs')
              .leftJoinAndSelect('u.brand', 'b')
              .leftJoinAndSelect('b.defaultPolicy', 'bdp')
              .leftJoinAndSelect('bdp.incentiveSlabs', 'bdpSlabs')
              .where('u.empCode IN (:...codes)', { codes: uniqueUserCodes })
              .getMany();

            // Assign group directly to user for easier access later.
            for (const user of users) {
              const currentAssignment = user.groupAssignments?.[0];
              if (currentAssignment?.group) {
                user.group = {
                  id: currentAssignment?.group?.id,
                  name: currentAssignment?.group?.name,
                  startDate: currentAssignment?.startDate,
                  endDate: currentAssignment?.endDate,
                } as any;
              } else {
                user.group = null;

                notifications.push({
                  title: 'Group Not Mapped to User',
                  message: `RM: ${user.name} received booking from SAP but no group is mapped. Please map a group to the user to ensure proper incentive calculations.`,
                  type: 'Group Not Mapped to User Alert',
                  isForAllAdmin: true,
                });
              }

              // Prevent accidental usage elsewhere
              delete user.groupAssignments;
            }
            // Create a map of users keyed by empCode.
            const userMap = new Map(users.map((u) => [u.empCode, u]));

            /* First Pass: Process Data Rows and Accumulate New Project Phases
             Array to hold new project phases that need to be inserted.*/
            const newProjectPhases: ProjectPhase[] = [];
            // Array to keep track of booking associations with project phase keys.
            const bookingAssociations: {
              item: CreateIncentiveBookingDto;
              phaseKey: string;
            }[] = [];

            // Loop through each booking item in the input data.
            for (const item of data) {
              // Validate required fields in the booking item.
              this.validateItemFields(item);

              // Process and/or create the related City record.
              const city = await this.processCity(
                transactionalEntityManager,
                cityMap,
                item.cityOfTheProject,
                notifications,
              );

              // Process and/or create the related Brand record.
              const brand = await this.processBrand(
                transactionalEntityManager,
                brandMap,
                item.brand,
                notifications,
              );

              // Process and/or create the Billing Entity record.
              const billingEntity = await this.processBillingEntity(
                transactionalEntityManager,
                billingEntityMap,
                item.entityName,
              );

              // Map the Brand to the City (ensuring the relationship exists).
              await this.mapBrandToCity(
                transactionalEntityManager,
                brand,
                city,
              );

              /* Process or create a Project Phase based on the booking item.
               This function checks the projectPhaseMap and creates a new phase if needed,
               pushing new phases into newProjectPhases and adding notifications.*/
              const phase = await this.processProjectPhase({
                em: transactionalEntityManager,
                projectPhaseMap,
                item,
                brand,
                city,
                billingEntity,
                newProjectPhases,
                notifications,
              });

              // Record the association between the booking item and its project phase using phase.name as the key.
              bookingAssociations.push({ item, phaseKey: phase.name });
            }

            // Bulk Insert New Project Phases and Update In-Memory Map
            if (newProjectPhases.length > 0) {
              // Save all newly created project phases.
              await this.saveNewProjectPhases(
                transactionalEntityManager,
                newProjectPhases,
              );
              // After saving, re-fetch the inserted phases using their names.
              const phaseNames = newProjectPhases.map((phase) => phase.name);
              const insertedPhases = await transactionalEntityManager.find(
                ProjectPhase,
                { where: { name: In(phaseNames) } },
              );
              // Update the projectPhaseMap with the newly inserted records.
              for (const insertedPhase of insertedPhases) {
                projectPhaseMap.set(insertedPhase.name, insertedPhase);
              }
            }

            /*Prefetch Minimal Bookings
            Fetch bookings that were previously inserted with missing critical entities. */
            const minimalBookings = await transactionalEntityManager.find(
              IncentiveBooking,
              {
                where: {
                  unitStatus: UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND,
                },
              },
            );
            // Create a map for quick lookup of these minimal bookings.
            const minimalBookingMap = new Map<string, IncentiveBooking>();
            minimalBookings.forEach((b) => {
              const key = `${b.bookingId}_${b.externalBPNumber}`;
              minimalBookingMap.set(key, b);
            });

            /* Second Pass: Upsert Incentive Bookings
             For each booking association, upsert (update or insert) the IncentiveBooking record.*/
            for (const { item, phaseKey } of bookingAssociations) {
              // Retrieve the corresponding project phase using the phase key.
              const phase = projectPhaseMap.get(phaseKey);
              if (!phase) {
                throw new Error(
                  `Project phase with key "${phaseKey}" not found for booking item.`,
                );
              }
              // Upsert the IncentiveBooking using the gathered data and maps.
              await this.upsertIncentiveBooking(
                transactionalEntityManager,
                item,
                phase,
                userMap,
                minimalBookingMap,
                notifications,
              );
            }

            logger.info(
              'Booking upserted successfully and starting to apply group sharing logic',
            );
            /* Third Pass: Apply Closing RM incentive split
               Collect unique booking IDs that were touched and batch process them. */
            const touchedBookingIds = Array.from(
              new Set(
                bookingAssociations
                  .map((ba) =>
                    safeString((ba.item.bookingId || '').replace(/^0+/, '')),
                  )
                  .filter(Boolean),
              ),
            );

            // Process chunks of 50 to avoid massive transactions
            const chunkSize = 50;
            for (let i = 0; i < touchedBookingIds.length; i += chunkSize) {
              const chunk = touchedBookingIds.slice(i, i + chunkSize);
              await this.applyGroupSharingLogic(
                chunk,
                transactionalEntityManager,
                notifications,
              );
            }

            // Send Notifications (if any)
            if (notifications.length) {
              await this.notificationService.create({ notifications });
            } else {
              logger.info(
                'No new entry found for Brand, City, or Phase for sending notification',
              );
            }

            // Return a success message once all processing is complete.
            return { message: 'Data Added/Updated Successfully' };
          } catch (error) {
            logger.error('Unexpected Error inside transaction:', error);
            logsAndErrorHandling(
              'IncentiveBookingService - insertDataInMultipleTablesBasedOnApi',
              error,
              {
                bookingData,
              },
            );
          }
        },
      );
      return result;
    } catch (error) {
      logger.error('Error in insertDataInMultipleTablesBasedOnApi:', error);
      logsAndErrorHandling(
        'IncentiveBookingService - insertDataInMultipleTablesBasedOnApi',
        error,
        {
          bookingData,
        },
      );
    }
  }

  /* Validate & Convert
   This function takes raw booking data and uses class-transformer's
   plainToInstance to convert each item into an instance of
   CreateIncentiveBookingDto, while enabling implicit type conversion.*/
  private validateAndConvertData(
    bookingData: CreateIncentiveBookingDto[],
  ): CreateIncentiveBookingDto[] {
    try {
      return plainToInstance(CreateIncentiveBookingDto, bookingData, {
        enableImplicitConversion: true,
      });
    } catch (error) {
      logger.error('Error in validateAndConvertData:', error);
      logsAndErrorHandling(
        'IncentiveBookingService - validateAndConvertData',
        error,
        { bookingData },
      );
    }
  }

  /* Validate required fields in a single booking item.
   If any required field (cityOfTheProject, brand, projectName, or projectType)
   is missing, throw a BadRequestException.*/
  private validateItemFields(item: CreateIncentiveBookingDto) {
    if (
      !item.cityOfTheProject ||
      !item.brand ||
      !item.projectName ||
      !item.projectType
    ) {
      throw new BadRequestException(
        'Missing required fields: city, brand, projectName, or projectType',
      );
    }
  }

  /* Extract names
   This function extracts unique names from the booking data for various fields
   (city, brand, billing entity, and project phase) using JavaScript Sets.*/

  private extractUniqueNames(data: CreateIncentiveBookingDto[]) {
    try {
      const excludedBrandsSet = new Set(EXCLUDED_BRANDS_FROM_SAP);

      const cityNamesSet = new Set<string>();
      const brandNamesSet = new Set<string>();
      const billingEntityNamesSet = new Set<string>();
      const projectPhaseNamesSet = new Set<string>();

      for (const d of data) {
        if (d.cityOfTheProject) cityNamesSet.add(d.cityOfTheProject);
        if (
          d.brand &&
          !excludedBrandsSet.has(d?.brand?.trim().toLocaleLowerCase())
        )
          brandNamesSet.add(d.brand);
        if (d.entityName) billingEntityNamesSet.add(d.entityName);
        if (d.projectName) projectPhaseNamesSet.add(d.projectName);
      }

      return {
        cityNames: [...cityNamesSet],
        brandNames: [...brandNamesSet],
        billingEntityNames: [...billingEntityNamesSet],
        projectPhaseNames: [...projectPhaseNamesSet],
      };
    } catch (error) {
      logger.error('Error in extractUniqueNames:', error);
      logsAndErrorHandling(
        'IncentiveBookingService - extractUniqueNames',
        error,
        { data },
      );
    }
  }

  /* Bulk fetch existing
   This function retrieves existing records for cities, brands, project phases,
   and billing entities by querying the database in parallel.*/
  private async fetchExistingRecords(
    em: EntityManager,
    cityNames: string[],
    brandNames: string[],
    projectPhaseNames: string[],
    billingEntityNames: string[],
  ): Promise<[CityMaster[], Brands[], ProjectPhase[], BillingEntity[]]> {
    try {
      const [
        existingCities,
        existingBrands,
        existingProjectPhases,
        existingBillingEntities,
      ] = await Promise.all([
        // Fetch cities that match the provided names.
        em
          .createQueryBuilder(CityMaster, 'city')
          .where('city.name IN (:...cityNames)', { cityNames })
          .getMany(),
        // Fetch brands that match the provided names.
        em
          .createQueryBuilder(Brands, 'brand')
          .where('brand.name IN (:...brandNames)', { brandNames })
          .getMany(),
        // Fetch project phases that match the provided names, including related entities.
        em
          .createQueryBuilder(ProjectPhase, 'projectPhase')
          .leftJoinAndSelect('projectPhase.city', 'phaseCity')
          .leftJoinAndSelect('projectPhase.brand', 'phaseBrand')
          .leftJoinAndSelect('projectPhase.billingEntity', 'phaseBE')
          .leftJoinAndSelect('projectPhase.project', 'phaseProject')
          .leftJoinAndSelect('phaseProject.brand', 'projectBrand')
          .where('projectPhase.name IN (:...projectPhaseNames)', {
            projectPhaseNames,
          })
          .getMany(),

        // Fetch billing entities that match the provided names.
        em
          .createQueryBuilder(BillingEntity, 'billingEntity')
          .where('billingEntity.name IN (:...billingEntityNames)', {
            billingEntityNames,
          })
          .getMany(),
      ]);

      return [
        existingCities,
        existingBrands,
        existingProjectPhases,
        existingBillingEntities,
      ];
    } catch (error) {
      logger.error('Error in fetchExistingRecords:', error);
      logsAndErrorHandling(
        'IncentiveBookingService - fetchExistingRecords',
        error,
        { cityNames, brandNames, projectPhaseNames, billingEntityNames },
      );
    }
  }

  /* Process city
   This function checks if a city already exists in the provided cityMap.
   If not, it creates a new city record, saves it, and adds a notification for the new entry.*/
  private async processCity(
    em: EntityManager,
    cityMap: Map<string, CityMaster>, //exiting
    cityName: string, //city name
    notifications: any[],
  ): Promise<CityMaster> {
    try {
      if (!cityName) return null;
      let city = cityMap.get(cityName);
      if (!city) {
        // Create a new city record if it doesn't exist.
        city = em.create(CityMaster, { name: cityName });
        city = await em.save(CityMaster, city);
        cityMap.set(cityName, city);
        // Add a notification for the newly created city.
        notifications.push({
          title: 'New City Alert',
          message: `A new city, "${city.name}", has been added to the system.`,
          type: 'City',
          isForAllAdmin: true, // Add Admin user ids here.
        });
      }
      return city;
    } catch (error) {
      logger.error(`Error processing city: ${cityName}`, error);
      logsAndErrorHandling('IncentiveBookingService - processCity', error, {
        cityName,
      });
    }
  }

  /* Process brand
   This function looks for an existing brand using a case-insensitive match (ILike).
   If not found, it creates a new brand, saves it, and sends a notification.*/
  private async processBrand(
    em: EntityManager,
    brandMap: Map<string, Brands>,
    brandName: string,
    notifications: any[],
  ): Promise<Brands> {
    try {
      if (!brandName) return null;
      let brand = brandMap.get(brandName);

      // Attempt to find a matching brand using ILike for a case-insensitive search.
      const foundBrand = await em.findOne(Brands, {
        where: { name: ILike(`%${brandName}%`) },
      });
      if (foundBrand) {
        brand = foundBrand;
      } else if (!brand) {
        // Create and save a new brand if not found.
        brand = em.create(Brands, { name: brandName });
        brand = await em.save(Brands, brand);
        // Add notification for the new brand.
        notifications.push({
          title: 'New Brand Alert',
          message: `A new brand, "${brand.name}", has been added to the system.Please map projects to ${brand.name}`,
          type: 'Brand',
          isForAllAdmin: true, // Adjust user ids as needed.
        });
      }

      // Cache the brand in the brandMap.
      brandMap.set(brandName, brand);
      return brand;
    } catch (error) {
      logger.error(`Error processing brand: ${brandName}`, error);
      logsAndErrorHandling('IncentiveBookingService - processBrand', error, {
        brandName,
      });
    }
  }

  /* Process billing entity
   This function checks if a billing entity exists in the billingEntityMap.
   If not, it creates a new billing entity record and caches it.*/
  private async processBillingEntity(
    em: EntityManager,
    billingEntityMap: Map<string, BillingEntity>,
    entityName: string,
  ): Promise<BillingEntity> {
    try {
      if (!entityName) return null;
      let billingEntity = billingEntityMap.get(entityName);
      if (!billingEntity) {
        billingEntity = em.create(BillingEntity, { name: entityName });
        billingEntity = await em.save(BillingEntity, billingEntity);
        billingEntityMap.set(entityName, billingEntity);
      }
      return billingEntity;
    } catch (error) {
      logger.error(`Error processing Billing Entity: ${entityName}`, error);
      logsAndErrorHandling(
        'IncentiveBookingService - processBillingEntity',
        error,
        {
          entityName,
        },
      );
    }
  }

  /* Map brand <-> city
   This function creates a mapping between a brand and a city.
   It first checks if the mapping already exists in the 'brand_city_mapping' table.
   If not, it saves the brand and city (if necessary) and then creates the relation.*/
  private async mapBrandToCity(
    em: EntityManager,
    brand: Brands,
    city: CityMaster,
  ): Promise<void> {
    try {
      if (!brand || !city) return;
      // Check if a mapping already exists using a raw query.
      const brandCityExists = await em
        .createQueryBuilder()
        .select('1')
        .from('brand_city_mapping', 'mapping')
        .where('mapping.brand_id = :brandId AND mapping.city_id = :cityId', {
          brandId: brand.id,
          cityId: city.id,
        })
        .getRawOne();

      if (!brandCityExists) {
        // Save brand or city if they do not have an ID (should rarely happen).
        if (!brand.id) await em.save(Brands, brand);
        if (!city.id) await em.save(CityMaster, city);
        // Create the mapping relation between brand and city.
        await em
          .createQueryBuilder()
          .relation(Brands, 'cities')
          .of(brand)
          .add(city);
      }
    } catch (error) {
      logger.error(
        `Error mapping brand: ${brand?.name} to city: ${city?.name}`,
        error,
      );
      logsAndErrorHandling('IncentiveBookingService - mapBrandToCity', error, {
        brandName: brand?.name,
      });
    }
  }

  /* Process or create ProjectPhase
   This function checks if a project phase (identified by projectName)
   already exists in the projectPhaseMap. If not, it creates a new phase,
   adds it to the newProjectPhases array, caches it, and notifies about the new phase.
   If the phase exists, it updates any changed fields (project type, billing entity,
   city, or brand) and saves the updated record.*/
  private async processProjectPhase(options: {
    em: EntityManager;
    projectPhaseMap: Map<string, ProjectPhase>;
    item: CreateIncentiveBookingDto;
    brand: Brands;
    city: CityMaster;
    billingEntity: BillingEntity;
    newProjectPhases: ProjectPhase[];
    notifications: any[];
  }): Promise<ProjectPhase> {
    const {
      em,
      projectPhaseMap,
      item,
      brand,
      city,
      billingEntity,
      newProjectPhases,
      notifications,
    } = options;
    try {
      if (!item.projectName) return null;
      let phase = projectPhaseMap.get(item.projectName);

      // Determine the project type: NEW_LAUNCH if projectType is "LAUNCH", otherwise SUSTENANCE.
      const newPT =
        (item.projectType || '').toUpperCase() === 'LAUNCH'
          ? ProjectStage.NEW_LAUNCH
          : ProjectStage.SUSTENANCE;

      if (!phase) {
        // Create a new ProjectPhase record.
        phase = em.create(ProjectPhase, {
          name: item.projectName,
          reraStatus: item.ReraNonReraEligibility,
          projectType: newPT,
          billingEntity,
          city,
          brand,
        });
        newProjectPhases.push(phase);
        projectPhaseMap.set(item.projectName, phase);

        // Notification for new phase creation.
        notifications.push({
          title: 'New Phase Alert',
          message: `A new phase, "${phase.name}", has been added to the "${phase.brand?.name}" brand.`,
          type: 'Phase',
          isForAllAdmin: true,
        });
      } else {
        // Store old values for later notifications.
        const oldProjectType = phase.projectType;
        const oldReraStatus = phase.reraStatus;

        // Check changes.
        const changedPT = phase.projectType !== newPT;
        const changedReraStatus =
          phase.reraStatus !== item.ReraNonReraEligibility;
        // Other fields for which we update the record but don't create separate notifications.
        const changedBE = phase.billingEntity?.id !== billingEntity?.id;

        // If any field has changed, update the phase.
        if (changedPT || changedBE || changedReraStatus) {
          phase.projectType = newPT;
          phase.billingEntity = billingEntity;
          phase.city = city;
          phase.reraStatus = item.ReraNonReraEligibility;
          phase.brand = brand;
          await em.save(ProjectPhase, phase);

          // Create notification if RERA status has changed.
          if (changedReraStatus) {
            notifications.push({
              title: 'Phase RERA Status Updated',
              message: `The RERA status of phase "${phase.name}" in brand "${phase.brand?.name}" has been updated from "${oldReraStatus}" to "${phase.reraStatus}".`,
              type: 'Phase',
              isForAllAdmin: true,
            });
          }

          // Create notification if project type has changed.
          if (changedPT) {
            notifications.push({
              title: 'Phase Project Type Changed',
              message: `The project type of phase "${phase.name}" in brand "${phase.brand?.name}" has been changed from "${oldProjectType}" to "${phase.projectType}".`,
              type: 'Phase',
              isForAllAdmin: true,
            });
          }
        }
      }
      return phase;
    } catch (error) {
      logger.error(
        `Error processing project phase: ${item.projectName}`,
        error,
      );
      logsAndErrorHandling(
        'IncentiveBookingService - processProjectPhase',
        error,
        {
          projectName: item.projectName,
        },
      );
    }
  }

  private async saveNewProjectPhases(
    em: EntityManager,
    newProjectPhases: ProjectPhase[],
  ): Promise<void> {
    try {
      if (!newProjectPhases.length) return;
      await em.save(ProjectPhase, newProjectPhases);
    } catch (error) {
      logger.error('Error saving new project phase records:', error);
      logsAndErrorHandling(
        'IncentiveBookingService - saveNewProjectPhases',
        error,
        {
          newProjectPhases,
        },
      );
    }
  }

  /**
   * Determines the applicable incentive policy for a given user and project context.
   *
   * Priority Logic:
   * 1. If the user has a project mapped, return its incentive policy from the cache or database.
   * 2. Otherwise, use the brand's default policy (if active).
   * 3. If a project is provided:
   *    a. If it belongs to the same brand as the user, ensure policy consistency.
   *    b. If it belongs to a different brand, apply policy only if the user's brand has a unique default policy.
   * 4. If no valid policy can be determined, return null.
   *
   * This function also handles notifications to alert administrators of any mapping issues.
   */
  async determinePolicyToUse(
    em: EntityManager,
    user: Users,
    brandId: number,
    project: Projects | null,
    bookingDate?: Date, // Date used to filter policies by their date range; helps in validating policy applicability.
    existingBookingPolicy?: IncentivePolicy, // In case the booking already has a policy, it's verified for validity against the bookingDate.
    notifications?: any[], // Array for collecting any notifications generated during the process.
  ): Promise<IncentivePolicy | null> {
    try {
      // Basic validation: Ensure that essential parameters (user and brandId) are provided.
      if (!user || !brandId) {
        return null;
      }

      if (existingBookingPolicy && project) {
        const validated = this.checkExistingBookingPolicyValidity(
          existingBookingPolicy,
          bookingDate,
        );
        if (validated) return validated;
      }

      // -----------------------------------------------------
      // NEW: GROUP-BASED POLICY FOR NON-INDIAN USERS
      // -----------------------------------------------------
      // If user is not in the INDIAN group, just pick their group’s policy directly.

      if (user?.project?.id) {
        // -----------------------------------------------------
        // STEP 1: USER-MAPPED (FORCED) POLICY CHECK
        // -----------------------------------------------------
        // The first priority is to check if the user has a specific project mapping.
        // If a project is mapped to the user, then a forced policy is applied.
        const forced = await this.findForcedUserProjectPolicy(
          em,
          user,
          bookingDate,
        );
        if (forced) return forced;
      }

      if (!isIndianGroup(user?.group?.name)) {
        // handle non-indian group (project present or not)
        return await this.handleNonIndianGroupPolicies(
          em,
          user,
          project,
          bookingDate,
          notifications,
        );
      }

      // -----------------------------------------------------
      // STEP 2: PROJECT-BASED POLICY RETRIEVAL
      // -----------------------------------------------------
      // If a project context is provided, the system then checks for valid policies associated with the project.
      // When you dont get project in this function that means this is for dashboard view

      return await this.handleProjectAndBrandPolicies(
        em,
        user,
        project,
        brandId,
        bookingDate,
        notifications,
      );
    } catch (error) {
      logger.error(
        `Error in determinePolicyToUse for user "${user?.name}" (ID: ${user?.id}):`,
        error,
      );
      // In case of an unexpected error during the policy determination process,
      // log the error details and throw an InternalServerErrorException.
      const errMessage = `Error determining incentive policy for user "${user?.name}" (ID: ${user?.id}). Reason: ${error?.message || error}`;
      logsAndErrorHandling(
        'IncentiveBookingService - determinePolicyToUse',
        error,
        { errMessage },
      );
    }
  }

  /**
   * If the booking already has a policy, verify date-range validity first.
   * Convert the policy's startDate and endDate into Date objects (if they are provided).
   * Validate that the booking date is within the policy's effective date range.
   * If valid, return the existing policy.
   */
  private checkExistingBookingPolicyValidity(
    existingBookingPolicy?: IncentivePolicy,
    bookingDate?: Date,
  ): IncentivePolicy | null {
    if (existingBookingPolicy && bookingDate) {
      // Convert the policy's startDate and endDate into Date objects (if they are provided).
      const policyStartDate = existingBookingPolicy.startDate
        ? new Date(existingBookingPolicy.startDate)
        : null;
      const policyEndDate = existingBookingPolicy.endDate
        ? new Date(existingBookingPolicy.endDate)
        : null;

      // Validate that the booking date is within the policy's effective date range.
      const validStart =
        !policyStartDate || bookingDate.getTime() >= policyStartDate.getTime();
      const validEnd =
        !policyEndDate || bookingDate.getTime() <= policyEndDate.getTime();

      if (validStart && validEnd) {
        return existingBookingPolicy; //FIX:Need to check above logic
      }
    }
    return null;
  }

  /**
   * STEP 1: USER-MAPPED (FORCED) POLICY CHECK
   *
   * The first priority is to check if the user has a specific project mapping.
   * If a project is mapped to the user, then a forced policy is applied.
   *
   * Query the IncentivePolicy table for any "forced" policies associated with the user's project.
   * This query looks for policies where the user's project ID is contained within the JSON array (projectsArray)
   * and further ensures the policy's date range (startDate and endDate) covers the booking date.
   *
   * If exactly one forced policy is found, it is assumed to be the valid mapping and therefore returned.
   */
  private async findForcedUserProjectPolicy(
    em: EntityManager,
    user: Users,
    bookingDate?: Date,
  ): Promise<IncentivePolicy | null> {
    try {
      const userProjectId = user.project.id;
      const forcedPolicies = await em
        .createQueryBuilder(IncentivePolicy, 'policy')
        .leftJoinAndSelect('policy.incentiveSlabs', 'slab')
        .where(`JSON_CONTAINS(policy.projectsArray, :userProjectId) = 1`, {
          userProjectId: JSON.stringify(userProjectId),
        })
        .andWhere('policy.group = :gid', { gid: user?.group?.id })
        .andWhere(
          '(:bookingDate >= policy.startDate OR policy.startDate IS NULL)',
          { bookingDate },
        )
        .andWhere(
          '(:bookingDate <= policy.endDate OR policy.endDate IS NULL)',
          { bookingDate },
        )
        .getMany();

      if (forcedPolicies.length === 1) {
        const singlePolicy = forcedPolicies[0];
        // Optionally, this policy may be cached for faster future access.
        return singlePolicy;
      }

      return null;
    } catch (error) {
      logger.error('Error while fetching forced user project policies', error);
      return null;
    }
  }

  /**
   * NEW: GROUP-BASED POLICY FOR NON-INDIAN USERS
   *
   * Handles non-Indian group logic (both project present and no-project scenarios).
   * If project provided -> check group policies mapped to project.
   * If no project -> fetch group policies for dashboard view.
   *
   * Preserves all notification behavior and logging exactly.
   */
  private async handleNonIndianGroupPolicies(
    em: EntityManager,
    user: Users,
    project: Projects | null,
    bookingDate?: Date,
    notifications?: any[],
  ): Promise<IncentivePolicy | null> {
    const qb = em
      .createQueryBuilder(IncentivePolicy, 'policy')
      .leftJoinAndSelect('policy.incentiveSlabs', 'slab')
      .where('policy.group = :gid', { gid: user?.group?.id })
      .andWhere(
        '(:bookingDate >= policy.startDate OR policy.startDate IS NULL)',
        { bookingDate },
      )
      .andWhere('(:bookingDate <= policy.endDate OR policy.endDate IS NULL)', {
        bookingDate,
      });

    if (project) {
      qb.andWhere('JSON_CONTAINS(policy.projects_array, :projectIdJson)', {
        projectIdJson: JSON.stringify([project?.id]),
      });
    }

    const groupPolicies = await qb.getMany();

    if (groupPolicies.length === 1) {
      const policy = groupPolicies[0];

      if (!project || policy?.projectsArray?.includes(project?.id)) {
        return policy;
      }
    }

    const notificationData = project
      ? {
          title: 'Incentive Policy Mapping Issue',
          message: `No valid policy found for project "${project?.name}" brand "${project?.brand?.name}" under group "${user?.group?.name}". Please map a valid policy to this brand.`,
          type: 'Incentive Mapping Alert',
          isForAllAdmin: true,
          userIds: [user?.id],
        }
      : {
          title: 'Incentive Policy Mapping Issue',
          message: `No incentive policy found for group "${user?.group?.name}". Please map a valid policy to the group.`,
          type: 'Incentive Mapping Alert',
          isForAllAdmin: true,
        };

    if (notifications) {
      notifications.push(notificationData);
    } else {
      this.sendNotification([notificationData]);
    }

    return null;
  }

  private async sendNotification(notificationData: any[]) {
    try {
      await this.notificationService.create({
        notifications: notificationData,
      });
    } catch (e) {
      logger.error(
        e,
        'Failed to save notification for No Incentive Policy Found',
      );
    }
  }

  /**
   * STEP 2: PROJECT-BASED POLICY RETRIEVAL
   * STEP 3: FALLBACK - NO PROJECT CONTEXT PROVIDED
   *
   * Handles project-based retrieval (same-brand and cross-brand) and fallback to brand-level policies.
   * Preserves all notification creation, logging, and return conditions from original function.
   */
  private async handleProjectAndBrandPolicies(
    em: EntityManager,
    user: Users,
    project: Projects | null,
    brandId: number,
    bookingDate?: Date,
    notifications?: any[],
  ): Promise<IncentivePolicy | null> {
    // If a project context is provided, the system then checks for valid policies associated with the project.
    if (project) {
      return await this.handleProjectPolicies(
        em,
        user,
        project,
        bookingDate,
        notifications,
      );
    }

    // -----------------------------------------------------
    // STEP 3: FALLBACK - NO PROJECT CONTEXT PROVIDED
    // -----------------------------------------------------
    // If there is no project provided, then the function falls back to
    // finding a valid policy from the user's brand.
    return await this.handleBrandFallback(
      em,
      user,
      brandId,
      bookingDate,
      notifications,
    );
  }

  /**
   * Handles the project-present branches:
   *  - 2A. SAME-BRAND SCENARIO (policy mapped to project OR fallback to brand default)
   *  - 2B. CROSS-BRAND SCENARIO (use user's brand policies)
   *
   * Preserves all queries, notification creation and logging exactly as original.
   */
  private async handleProjectPolicies(
    em: EntityManager,
    user: Users,
    project: Projects,
    bookingDate?: Date,
    notifications?: any[],
  ): Promise<IncentivePolicy | null> {
    const baseQuery = (qb: any) =>
      qb
        .leftJoinAndSelect('policy.incentiveSlabs', 'slab')
        .andWhere('policy.group = :gid', { gid: user?.group?.id })
        .andWhere(
          '(:bookingDate >= policy.startDate OR policy.startDate IS NULL)',
          { bookingDate },
        )
        .andWhere(
          '(:bookingDate <= policy.endDate OR policy.endDate IS NULL)',
          { bookingDate },
        );

    // 2A. SAME-BRAND SCENARIO:
    if (project.brand?.id === user.brand?.id) {
      const policies = await baseQuery(
        em
          .createQueryBuilder(IncentivePolicy, 'policy')
          .where(`JSON_CONTAINS(policy.projectsArray, :projectId) = 1`, {
            projectId: JSON.stringify(project.id),
          }),
      ).getMany();

      if (!policies || policies.length === 0) {
        const fallbackPolicies = await baseQuery(
          em
            .createQueryBuilder(IncentivePolicy, 'policy')
            .where(`JSON_CONTAINS(policy.brandIds, :bId) = 1`, {
              bId: JSON.stringify(user.brand.id),
            }),
        ).getMany();

        if (
          fallbackPolicies &&
          fallbackPolicies.length === 1 &&
          fallbackPolicies[0].isDefault
        ) {
          return fallbackPolicies[0];
        }

        const notificationData = {
          title: 'Incentive Policy Mapping Issue',
          message: `Multiple incentive policies were found under brand "${user.brand.name}" with no policy mapped to project "${project.name}". Please map a valid policy to the project or assign the correct project to the user.`,
          type: 'Incentive Mapping Alert',
          isForAllAdmin: true,
        };

        await this.pushIncentiveNotification(
          user,
          notificationData,
          notifications,
        );
        return null;
      }

      if (policies.length === 1) {
        return policies[0].isDefault ? policies[0] : null;
      }

      const notificationData = {
        title: 'Multiple Incentive Policies Detected',
        message: `Project "${project?.name}" has a different policy than the brand's default. Please map the project to ${user?.name}.`,
        type: 'Incentive Mapping Alert',
        isForAllAdmin: true,
      };

      await this.pushIncentiveNotification(
        user,
        notificationData,
        notifications,
      );
      return null;
    }

    // 2B. CROSS-BRAND SCENARIO:
    const policies = await baseQuery(
      em
        .createQueryBuilder(IncentivePolicy, 'policy')
        .where(`JSON_CONTAINS(policy.brandIds, :userBrandId) = 1`, {
          userBrandId: JSON.stringify(user.brand.id),
        }),
    ).getMany();

    if (policies.length === 1 && policies[0].isDefault) {
      return policies[0];
    }

    const notificationData = {
      title: 'Cross-Brand Booking Issue',
      message: `User "${user?.name}" from brand "${user?.brand?.name}" brought a booking from another brand and brand "${user?.brand?.name}" has multiple policies. Please map correct project to user.`,
      type: 'Incentive Mapping Alert',
      isForAllAdmin: true,
    };

    await this.pushIncentiveNotification(user, notificationData, notifications);
    return null;
  }

  private async pushIncentiveNotification(
    user: Users,
    notificationData: any,
    notifications?: any[],
  ) {
    if (!isIndianGroup(user?.group?.name)) return;

    if (notifications) {
      notifications.push(notificationData);
      return;
    }

    try {
      await this.notificationService.create({
        notifications: [notificationData],
      });
    } catch (e) {
      logger.error(e, 'Failed to save incentive policy notification');
    }
  }

  /**
   * Handles the no-project fallback (STEP 3)
   * Preserves all queries, notification creation and logging from original implementation.
   */
  private async handleBrandFallback(
    em: EntityManager,
    user: Users,
    brandId: number,
    bookingDate?: Date,
    notifications?: any[],
  ): Promise<IncentivePolicy | null> {
    // Retrieve policies associated with the given brand.
    const policies = await em
      .createQueryBuilder(IncentivePolicy, 'policy')
      .leftJoinAndSelect('policy.incentiveSlabs', 'slab')
      .where(`JSON_CONTAINS(policy.brandIds, :brandId) = 1`, {
        brandId: JSON.stringify(brandId),
      })
      .andWhere('policy.group = :gid', { gid: user?.group?.id })
      .andWhere(
        '(:bookingDate >= policy.startDate OR policy.startDate IS NULL)',
        { bookingDate },
      )
      .andWhere('(:bookingDate <= policy.endDate OR policy.endDate IS NULL)', {
        bookingDate,
      })
      .getMany();

    // If exactly one default policy is found, it is returned.
    if (policies.length === 1) {
      if (policies[0].isDefault) {
        return policies[0];
      } else {
        // If a single policy is found but it is not marked as default,
        // alert the administrators about the policy mapping inconsistency.
        const notificationData = {
          title: 'No Incentive Policy Found',
          message: `Brand "${user?.brand?.name}" has multiple policies and no project is mapped to user "${user?.name}". Please map the project to the user "${user?.name}".`,
          type: 'Incentive Mapping Alert',
          isForAllAdmin: true,
        };

        if (isIndianGroup(user?.group?.name)) {
          if (notifications) {
            notifications.push(notificationData);
          } else {
            const notificationsToSend = [notificationData];
            try {
              await this.notificationService.create({
                notifications: notificationsToSend,
              });
            } catch (e) {
              logger.error(
                e,
                'Failed to save notification for No Incentive Policy Found (fallback scenario)',
              );
            }
          }
        }
        return null;
      }
    } else if (policies.length === 0) {
      // No policies found for the brand, so notify that a valid policy is missing.
      const notificationData = {
        title: 'No Incentive Policy Found',
        message: `Brand "${user?.brand?.name}" has no valid policy and no project is mapped to user "${user?.name}". Please map the project to the user "${user?.name}" or create policy for brand.`,
        type: 'Incentive Mapping Alert',
        isForAllAdmin: true,
      };
      if (isIndianGroup(user?.group?.name)) {
        if (notifications) {
          notifications.push(notificationData);
        } else {
          const notificationsToSend = [notificationData];
          try {
            await this.notificationService.create({
              notifications: notificationsToSend,
            });
          } catch (e) {
            logger.error(
              e,
              'Failed to save notification for No Incentive Policy Found (fallback scenario)',
            );
          }
        }
      }
      return null;
    } else {
      // If multiple policies exist (and not exactly one default), notify administrators for manual resolution.
      const notificationData = {
        title: 'No Incentive Policy Found',
        message: `Brand "${user?.brand?.name}" has multiple policies and no project is mapped to user "${user?.name}". Please map the project to the user "${user?.name}".`,
        type: 'Incentive Mapping Alert',
        isForAllAdmin: true,
      };

      if (isIndianGroup(user?.group?.name)) {
        if (notifications) {
          notifications.push(notificationData);
        } else {
          const notificationsToSend = [notificationData];
          try {
            await this.notificationService.create({
              notifications: notificationsToSend,
            });
          } catch (e) {
            logger.error(
              e,
              'Failed to save notification for No Incentive Policy Found (fallback scenario)',
            );
          }
        }
      }
      return null;
    }
  }

  // Upsert IncentiveBooking
  /**
   * Upserts an incentive booking based on the provided booking data and project phase.
   *
   * The function attempts to:
   * - Lookup the user associated with the booking.
   * - Build a partial booking record from the incoming data.
   * - Determine the applicable incentive policy for the booking.
   * - Check if the booking already exists and, if so, update it.
   * - Handle various statuses and cancellation scenarios.
   * - Update user monthly totals and calculate incentive percentages.
   * - Insert or update a booking record accordingly.
   *
   * Detailed error handling and notification generation are implemented throughout to ensure
   * administrative awareness of any mapping or calculation issues.
   */
  private async upsertIncentiveBooking(
    em: EntityManager,
    bookingData: CreateIncentiveBookingDto,
    projectPhase: ProjectPhase,
    userMap: Map<string, Users>,
    prefetchedMinimalBookingMap: Map<string, IncentiveBooking>,
    notifications: any[],
  ): Promise<void> {
    try {
      // -----------------------------------------------------
      // STEP 1: User Lookup and Project Extraction
      // -----------------------------------------------------
      // Lookup the user based on the externalBPNumber provided in the booking data.
      let user: Users | null = null;
      if (bookingData.externalBPNumber) {
        user = userMap.get(bookingData.externalBPNumber) || null;
      }

      // Extract the project from the provided projectPhase.
      const project = projectPhase?.project || null;

      // -----------------------------------------------------
      // STEP 2: Determine Incentive Policy and Build Partial Booking
      // -----------------------------------------------------
      /*
      Determine the applicable incentive policy for this booking.
      This is based on the user, brand, and project context.
      The policy will later be used for incentive calculations.
    */
      let policyToUse: IncentivePolicy = null;
      const brandId = user?.brand?.id || null;

      // Check if the incoming booking is marked as cancelled.
      const isCancelled = bookingData.status === BookingStatusEnum.CANCELLED;

      // Build a partial booking record using booking data, project phase, user, and cancellation status.
      const partialBooking = await this.buildPartialBooking(
        bookingData,
        projectPhase,
        user,
        isCancelled,
      );

      logger.info('Partial booking built successfully', bookingData.bookingId);
      // -----------------------------------------------------
      // STEP 3: Validate Essential Data and Upsert Minimal Booking if Missing
      // -----------------------------------------------------
      /*
      If essential information such as user or project is missing,
      mark the booking with a specific unit status and attempt to upsert
      a minimal booking record to maintain data integrity.
    */
      if (!user || !project) {
        partialBooking.unitStatus =
          UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND;
        // Build a unique key based on bookingId and externalBPNumber.
        const key = `${partialBooking.bookingId}_${partialBooking.externalBPNumber}`;
        const existingBooking = prefetchedMinimalBookingMap.get(key);

        // Create and save a new minimal booking record if one doesn't already exist.
        if (!existingBooking) {
          const newBooking = em.create(IncentiveBooking, partialBooking);
          await em.save(IncentiveBooking, newBooking);
          prefetchedMinimalBookingMap.set(key, newBooking);
        } else if (
          existingBooking.unitStatus !==
          UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND
        ) {
          // Otherwise, merge the partial booking data into the existing booking and save.
          Object.assign(existingBooking, partialBooking);
          await em.save(IncentiveBooking, existingBooking);

          // Generate notifications if critical data is missing.
          if (!user) {
            //FIX:Update should be created only if its not present or create only if its first time
            // FIXED: only create first time
            notifications.push({
              title: 'User Not Found',
              message: `Booking with ID: ${partialBooking.bookingId} was received, but the user was not found in the system. Please check the RM ID: ${partialBooking.externalBPNumber}.`,
              type: 'Incentive User Mapping Alert',
              isForAllAdmin: true, // Broadcast notification for all administrators.
            });
          }
          if (!project) {
            notifications.push({
              title: 'Project Not Mapped to Phase',
              message: `Booking with ID: ${partialBooking.bookingId} was received, but no project is mapped to the ${bookingData.projectName}. Please map the correct project and policy.`,
              type: 'Incentive Project Mapping Alert',
              isForAllAdmin: true,
            });
          }
        }
        return;
      }

      // -----------------------------------------------------
      // STEP 4: Check for Existing Booking Record
      // -----------------------------------------------------
      // Look for an existing booking record using bookingId and externalBPNumber.
      const existingBooking = await em.findOne(IncentiveBooking, {
        where: {
          bookingId: partialBooking.bookingId,
          externalBPNumber: partialBooking.externalBPNumber,
        },
        relations: [
          'user',
          'projectPhase',
          'policyUsed',
          'policyUsed.incentiveSlabs',
        ],
      });
      let savedBooking: IncentiveBooking;

      // If a user and valid brandId exist, determine the incentive policy to be used.
      if (user && brandId) {
        policyToUse = await this.determinePolicyToUse(
          em,
          user,
          brandId,
          project,
          bookingData.bookingDate, // Pass booking date to filter by effective date ranges.
          existingBooking?.policyUsed, // Use an existing policy if available.
          notifications,
        );
      }

      // Associate the determined policy with the partial booking.
      partialBooking.policyUsed = policyToUse;

      // -----------------------------------------------------
      // STEP 5: Process Existing Booking If Found
      // -----------------------------------------------------
      if (existingBooking) {
        // Re-lookup and update the user association from the user map.
        let user: Users | null = null;
        if (bookingData?.externalBPNumber) {
          user = userMap.get(bookingData?.externalBPNumber) || null;
        }
        existingBooking.user = user; //FIX:Need To check This

        // Use Moment.js to normalize booking and effective dates for qualification checks.
        const bookingDate = moment(
          bookingData.bookingDate,
          DATE_FORMAT,
        ).startOf('day');
        const effectiveDate = moment(
          project.maxQualificationEffectiveFrom,
          DATE_FORMAT,
        ).startOf('day');

        // If the booking date is before the effective date and the booking already has qualification days set,
        // carry over the maxQualificationDays.
        if (
          effectiveDate.isValid() &&
          bookingDate.isSameOrBefore(effectiveDate)
        ) {
          if (existingBooking.maxQualificationDays > 0) {
            partialBooking.maxQualificationDays =
              existingBooking.maxQualificationDays;
          }
        }

        // Early exit if the existing booking is already cancelled.
        if (
          existingBooking.unitStatus === UnitStatusEnum.CANCELLED &&
          partialBooking.unitStatus === UnitStatusEnum.CANCELLED
        ) {
          return;
        }

        // If the booking is in a 'qualified cancelled' state, skip further processing.
        if (existingBooking.unitStatus === UnitStatusEnum.QUALIFIED_CANCELLED) {
          return;
        }

        /*
        Cancellation Handling:
        - For bookings that were 'regularized' but are now marked as cancelled with a cancellation date,
          update and save the booking immediately.
        - Then, update the user's monthly gross total.
      */
        if (
          existingBooking.unitStatus === UnitStatusEnum.REGULARIZED &&
          partialBooking.unitStatus === UnitStatusEnum.CANCELLED &&
          partialBooking.cancellationDate
        ) {
          Object.assign(existingBooking, partialBooking);
          savedBooking = await em.save(IncentiveBooking, existingBooking);

          if (user && projectPhase) {
            await this.updateUserMonthlyGrossTotal(
              em,
              user?.id,
              savedBooking.bookingDate,
            );
          }

          // Determine the month and year of the booking date.
          const month = savedBooking.bookingDate
            ? moment(savedBooking.bookingDate).month() + 1
            : 0;
          const year = savedBooking.bookingDate
            ? moment(savedBooking.bookingDate).year()
            : 0;

          // Retrieve the monthly gross total record for the user.
          const userMonth = await em.findOne(UserMonthlyGrossTotal, {
            where: { user: { id: user?.id }, month, year },
          });

          // Calculate and update the applicable incentive slab if the monthly record exists.
          if (userMonth) {
            const monthlyTotal =
              savedBooking.bookingProjectType === ProjectStage.NEW_LAUNCH
                ? +userMonth.launchGrossTotal
                : +userMonth.sustenanceGrossTotal;

            const { applicableSlab, ineligibilityReason } =
              this.getApplicableSlab(
                savedBooking.bookingProjectType,
                monthlyTotal,
                policyToUse,
                userMonth?.eligibleBookings,
              );

            savedBooking.ineligibilityReason = ineligibilityReason;

            let finalIncentivePercentage: number = 0;
            if (applicableSlab) {
              finalIncentivePercentage =
                savedBooking.bookingProjectType === ProjectStage.NEW_LAUNCH
                  ? applicableSlab.launchIncentivePercentage
                  : applicableSlab.sustenanceIncentivePercentage;
            }

            // Update the monthly record and booking if the new incentive percentage is higher.
            await this.updateIncentivePercentageIfNeeded({
              em,
              booking: savedBooking,
              userMonth,
              finalIncentivePercentage,
              user,
              month,
              year,
              policyToUse,
            });

            // Return early after handling cancellation update.
            return;
          }
        } else if (
          // If the booking was qualified and the incoming data marks it cancelled,
          // update the booking status to QUALIFIED_CANCELLED.
          existingBooking.unitStatus === UnitStatusEnum.QUALIFIED &&
          partialBooking.unitStatus === UnitStatusEnum.CANCELLED &&
          partialBooking.cancellationDate
        ) {
          // If the booking was qualified and is now cancelled, set the ineligibility reason.
          if (existingBooking.paymentStatus == PaymentStatusEnum.PAID) {
            existingBooking.ineligibilityReason =
              IneligibilityReasonEnum.CANCELLED_POST_PAID;
          } else {
            existingBooking.ineligibilityReason =
              IneligibilityReasonEnum.CANCELLED_BEFORE_PAID;
          }

          existingBooking.unitStatus = UnitStatusEnum.QUALIFIED_CANCELLED;
          existingBooking.status = partialBooking.status;
          existingBooking.cancellationDate = partialBooking.cancellationDate;
          await em.save(IncentiveBooking, existingBooking);
          return;
        }

        /*
        For bookings that are qualified with a payableReceivedDate,
        process further only if the booking's received date is in the current month.
        If not, skip additional processing as the incentive mapping is already saved.
      */
        if (
          existingBooking.unitStatus === UnitStatusEnum.QUALIFIED &&
          existingBooking.payableReceivedDate &&
          existingBooking.shouldBeCalculated !== false &&
          existingBooking.areSlabsNull === false
        ) {
          const now = moment();
          const receivedMoment = moment(existingBooking.bookingDate);
          if (!receivedMoment.isSame(now, 'month')) {
            return;
          }
        }
      }

      // -----------------------------------------------------
      // STEP 6: Insert or Update Booking Record
      // -----------------------------------------------------
      // If no existing booking was found, create a new booking record.
      if (!existingBooking) {
        const newBooking = em.create(IncentiveBooking, partialBooking);
        savedBooking = await em.save(IncentiveBooking, newBooking);
      } else {
        // For an existing booking, merge the new partial data, preserving some fields.
        if (!partialBooking.receivedDate) {
          partialBooking.receivedDate = existingBooking.receivedDate;
        }
        partialBooking.paymentStatus = existingBooking.paymentStatus;
        Object.assign(existingBooking, partialBooking);
        savedBooking = await em.save(IncentiveBooking, existingBooking);
      }

      // If the booking ends up cancelled, skip further incentive calculation.
      if (savedBooking.unitStatus === UnitStatusEnum.CANCELLED) {
        return;
      }

      // -----------------------------------------------------
      // STEP 7: Update User Monthly Totals & Recalculate Incentives
      // -----------------------------------------------------
      // If both user and project phase data exist, update the monthly totals used for incentive calculations.
      if (user && projectPhase) {
        // Compute additional status data for the booking based on the incentive policy.
        const statusData = await this.computeBookingStatus(
          em,
          savedBooking,
          user,
          policyToUse,
          projectPhase,
        );
        if (statusData) {
          Object.assign(savedBooking, statusData);
          this.handleSpecialCases(savedBooking);
          await em.save(IncentiveBooking, savedBooking);
        }

        // Update the user's monthly gross total based on the booking date.
        await this.updateUserMonthlyGrossTotal(
          em,
          user.id,
          savedBooking.bookingDate,
        );
      }

      // -----------------------------------------------------
      // STEP 8: Final Incentive Calculation and Booking Update
      // -----------------------------------------------------
      // Initialize a final booking data object with defaults.
      let finalBookingData: Partial<IncentiveBooking> = {
        incentivePercentage: 0,
        incentiveAmount: 0,
        shouldBeCalculated: false,
        paymentStatus: PaymentStatusEnum.INELIGIBLE,
        ineligibilityReason: IneligibilityReasonEnum.POLICY_NOT_APPLIED,
      };

      // If an applicable policy was determined, calculate the final incentive details.
      if (policyToUse) {
        finalBookingData = await this.calculateIncentiveUsingMonthlyTotal(
          em,
          savedBooking,
          user,
          policyToUse,
          projectPhase,
        );
        // Mark the booking as ready for calculation and set its payment status.
        finalBookingData.shouldBeCalculated = true;
        finalBookingData.paymentStatus = PaymentStatusEnum.INELIGIBLE;
        if (
          finalBookingData.areSlabsNull === false &&
          finalBookingData.incentivePercentage > 0 &&
          (savedBooking.unitStatus === UnitStatusEnum.QUALIFIED ||
            savedBooking.unitStatus === UnitStatusEnum.QUALIFIED_CANCELLED)
        ) {
          finalBookingData.paymentStatus = PaymentStatusEnum.PAYABLE;
        }
      } else {
        // Notify administrators that incentive calculation could not be performed due to a missing policy.
        notifications.push({
          title: 'Incentive Policy Missing',
          message: `Booking with ID: ${savedBooking?.bookingId} was processed without incentive calculation. Please map the project to the user ${user?.name}.`,
          type: 'Incentive Mapping Alert',
          isForAllAdmin: true,
        });
      }

      // Update the booking with the final calculated incentive details.
      if (finalBookingData) {
        Object.assign(savedBooking, finalBookingData);
        // Apply any additional special handling required for the booking.
        this.applySpecialBookingHandling(savedBooking);
        // Save the final updated booking data.
        await em.save(IncentiveBooking, savedBooking);
      }
    } catch (error) {
      // -----------------------------------------------------
      // STEP 9: Error Logging and Exception Handling
      // -----------------------------------------------------
      // Log errors with detailed booking information to assist in troubleshooting.
      logger.error(
        `Error in upserting incentive booking. BookingId: ${bookingData.bookingId}, ExternalBPNumber: ${bookingData.externalBPNumber}, ProjectPhase: ${projectPhase?.id}, User: ${bookingData?.externalBPNumber}, Error: ${error.message}`,
        error,
      );
      logsAndErrorHandling(
        'IncentiveBookingService - upsertIncentiveBooking',
        error,
        { bookingData, projectPhaseId: projectPhase?.id },
      );
    }
  }

  /*
  This function contains the logic for handling bookings based on RERA eligibility.
  It updates the booking's unitStatus (and sets the receivedDate if needed) based on
  various criteria related to sale type and RERA eligibility.
*/
  private handleSpecialCases(savedBooking: IncentiveBooking): void {
    // Check if the booking is currently marked as DISQUALIFIED and
    // if the sale type is CREDIT_SALE_MGT_APPROVED.
    // This condition ensures that only bookings with these properties
    // are subjected to further RERA-based evaluation.
    if (
      savedBooking.unitStatus === UnitStatusEnum.DISQUALIFIED &&
      savedBooking.saleType === SalesTypeEnum.CREDIT_SALE_MGT_APPROVED
    ) {
      // If the booking's RERA eligibility flag is "OC" (which we assume means "On Criteria" or similar),
      // update the unitStatus to QUALIFIED since the booking meets the eligibility requirements.
      if (savedBooking.ReraNonReraEligibility === ReraStatusEnum.OC) {
        savedBooking.unitStatus = UnitStatusEnum.QUALIFIED;
      }
      // Otherwise, if the booking's RERA eligibility flag is "NO",
      // further checks are needed to determine its status.
      else if (savedBooking.ReraNonReraEligibility === ReraStatusEnum.NO) {
        // Check if the total amount received is equal to or greater than the payable amount.
        // If this condition is true, it implies that sufficient funds have been received,
        // so we update the booking's status to QUALIFIED.
        if (savedBooking.totalReceived >= savedBooking.payableAmount) {
          savedBooking.unitStatus = UnitStatusEnum.QUALIFIED;
        }
        // If the condition above is not met,
        // then update the unitStatus to REGULARIZED to indicate that the booking is in a pending
        // or intermediate state. Additionally, if the receivedDate is not already set, assign
        // it to the current date to record when the status was updated.
        else {
          savedBooking.unitStatus = UnitStatusEnum.REGULARIZED;
          savedBooking.receivedDate = savedBooking.receivedDate || new Date();
        }
      }
    }
  }

  /*
  The main function that applies special handling to a booking.
  It first adjusts the booking status based on RERA eligibility by calling
  the handleSpecialCases function, and then applies the payableReceivedDate logic.
  Finally, if the booking remains disqualified after these checks,
  it sets the disqualifiedDate to the booking's deadline.
*/
  private applySpecialBookingHandling(savedBooking: IncentiveBooking): void {
    // Step 1: Adjust booking status based on RERA eligibility.
    // This will update the booking's unitStatus according to RERA criteria.
    this.handleSpecialCases(savedBooking);

    // Step 2: Determine whether the payableReceivedDate should be set.
    // The conditions below cover two main scenarios where a payableReceivedDate is required:
    // 1. The booking is qualified (unitStatus is QUALIFIED) and the total received amount meets or exceeds the payable amount.
    // 2. The booking has RERA eligibility marked as "OC" under the CREDIT_SALE_MGT_APPROVED sale type
    //    and is also qualified.

    // mark payable only for qualified bookings
    if (
      (savedBooking.unitStatus === UnitStatusEnum.QUALIFIED ||
        savedBooking.unitStatus === UnitStatusEnum.QUALIFIED_CANCELLED) &&
      savedBooking?.areSlabsNull === false &&
      savedBooking.incentivePercentage > 0
    ) {
      savedBooking.paymentStatus = PaymentStatusEnum.PAYABLE;
      savedBooking.ineligibilityReason = '';
    } else {
      savedBooking.paymentStatus = PaymentStatusEnum.INELIGIBLE;
    }

    this.resolvePayableReceivedDate(savedBooking);

    // Step 3: If, after all adjustments, the booking remains disqualified,
    // set the disqualifiedDate to the bookingDeadline.
    // This records the deadline as the point of disqualification.
    if (savedBooking.unitStatus === UnitStatusEnum.DISQUALIFIED) {
      savedBooking.disqualifiedDate = savedBooking.bookingDeadline;
    }
  }

  private resolvePayableReceivedDate(savedBooking: IncentiveBooking): void {
    if (
      (savedBooking.totalReceived >= savedBooking.payableAmount &&
        savedBooking.unitStatus === UnitStatusEnum.QUALIFIED) ||
      (savedBooking.ReraNonReraEligibility === ReraStatusEnum.OC &&
        savedBooking.saleType === SalesTypeEnum.CREDIT_SALE_MGT_APPROVED &&
        savedBooking.unitStatus === UnitStatusEnum.QUALIFIED)
    ) {
      if (savedBooking.ReraNonReraEligibility === ReraStatusEnum.OC) {
        if (savedBooking.saleType === SalesTypeEnum.CREDIT_SALE_MGT_APPROVED) {
          savedBooking.payableReceivedDate =
            savedBooking.payableReceivedDate || new Date();
        } else {
          savedBooking.payableReceivedDate = savedBooking.receivedDate;
        }
      } else if (savedBooking.ReraNonReraEligibility === ReraStatusEnum.NO) {
        savedBooking.payableReceivedDate =
          savedBooking.payableReceivedDate || new Date();
      }
    }
  }

  // Helper function to compute the booking's status details, including unit status,
  // booking deadline, and various percentage and amount calculations.
  // It returns an object containing computed values for the booking or null if an error occurs.
  private async computeBookingStatus(
    em: EntityManager,
    booking: IncentiveBooking,
    user: Users,
    policy: IncentivePolicy,
    projectPhase: ProjectPhase,
  ): Promise<{
    unitStatus: UnitStatusEnum;
    bookingDeadline: Date | null;
    isDeadlineApproaching: boolean;
    regularizationPercentage: number;
    payablePercentage: number;
    regularizedAmount: number;
    payableAmount: number;
    ineligibilityReason: string | null;
  } | null> {
    try {
      // Extract the project details from the project phase.
      const project = projectPhase.project;

      // Initialize the regularization and payable percentages based on RERA eligibility.
      // These percentages come from the project's configuration.
      let regularizationPercentage = 0;
      let payablePercentage = 0;

      if (booking.ReraNonReraEligibility === ReraStatusEnum.NO) {
        // For bookings that are not RERA compliant,
        // use the project's RERA specific percentages.
        // If RERA percentage is not set, default to 100%.
        regularizationPercentage =
          project.reraRegularization != null
            ? +project.reraRegularization
            : 100;

        // If RERA percentage is not set, default to 100%.
        payablePercentage =
          project.reraPayable != null ? +project.reraPayable : 100;
      } else if (booking.ReraNonReraEligibility === ReraStatusEnum.OC) {
        // For bookings that meet the "OC" criteria,
        // use the project's RTM (or alternate) percentages.
        // If RTM percentage is not set, default to 100%.
        regularizationPercentage =
          project.rtmRegularization != null ? +project.rtmRegularization : 100;

        // If RTM percentage is not set, default to 100%.
        // This ensures that the booking is fully payable.
        payablePercentage =
          project.rtmPayable != null ? +project.rtmPayable : 100;
      }

      // Calculate the amounts based on the booking's gross total value.
      // The amounts are derived as a percentage of the gross total,
      // rounded to three decimal places.
      const regularizedAmount = Number(
        ((booking.grossTotalValue * regularizationPercentage) / 100).toFixed(3),
      );

      const payableAmount = Number(
        ((booking.grossTotalValue * payablePercentage) / 100).toFixed(3),
      );

      // Determine the booking deadline by adding maxQualificationDays to the booking date.
      const deadLine = moment(booking.bookingDate).add(
        booking.maxQualificationDays,
        'days',
      );

      const { unitStatus, ineligibilityReason } =
        this.evaluateQualificationStatus(
          booking,
          deadLine,
          regularizedAmount,
          payableAmount,
        );

      const deadlineResult = this.evaluateDeadlineStatus(
        booking,
        unitStatus,
        ineligibilityReason,
      );

      // Return the computed booking status details, including the updated unit status,
      // deadline information, percentage values, and computed amounts.
      return {
        unitStatus: deadlineResult.unitStatus,
        bookingDeadline: deadlineResult.bookingDeadline,
        isDeadlineApproaching: deadlineResult.isDeadlineApproaching,
        regularizationPercentage,
        payablePercentage,
        regularizedAmount,
        payableAmount,
        ineligibilityReason: deadlineResult.ineligibilityReason,
      };
    } catch (error) {
      // Log the error and rethrow it instead of swallowing it.
      logger.error('Error computing booking status', error);
      logsAndErrorHandling(
        'IncentiveBookingService - computeBookingStatus',
        error,
        { bookingId: booking.id },
      );
    }
  }

  private evaluateQualificationStatus(
    booking: IncentiveBooking,
    deadLine: moment.Moment,
    regularizedAmount: number,
    payableAmount: number,
  ): {
    unitStatus: UnitStatusEnum;
    ineligibilityReason: string | null;
  } {
    // Start with the existing unitStatus of the booking.
    let unitStatus = booking.unitStatus;
    let ineligibilityReason = booking?.ineligibilityReason;

    // Evaluate if the booking qualifies for regularization by comparing total received funds
    // with the calculated regularized amount.
    // Validate that both the agreement and the received dates are set, valid,
    // and occur before the deadline. These dates confirm that the booking process is on time.
    const validAgreementDate = isValidDateOnOrBefore(
      booking.agreementReceivedDate,
      deadLine.toDate(),
    );

    const validReceivedDate = isValidDateOnOrBefore(
      booking.receivedDate,
      deadLine.toDate(),
    );

    if (validAgreementDate === false) {
      ineligibilityReason =
        IneligibilityReasonEnum.AGREEMENT_NOT_SIGNED.replace(
          '{DAYS}',
          String(booking.maxQualificationDays),
        );
    }

    if (validReceivedDate === false) {
      ineligibilityReason =
        IneligibilityReasonEnum.REG_DEADLINE_CROSSED.replace(
          '{DAYS}',
          String(booking.maxQualificationDays),
        );
    }

    if (booking.totalReceived >= regularizedAmount) {
      // If both the agreement and received dates are valid, proceed with further status determination.
      if (validAgreementDate && validReceivedDate) {
        if (booking.ReraNonReraEligibility === ReraStatusEnum.NO) {
          // For bookings that are not RERA compliant:
          // Mark them as REGULARIZED by default.
          unitStatus = UnitStatusEnum.REGULARIZED;

          // If the total received funds also meet or exceed the payable amount,
          // upgrade the status to QUALIFIED.
          if (booking.totalReceived >= payableAmount) {
            unitStatus = UnitStatusEnum.QUALIFIED;
          }
        } else if (booking.ReraNonReraEligibility === ReraStatusEnum.OC) {
          // For bookings that meet the "OC" criteria:
          // Check whether the received date falls before the deadline.
          if (moment(booking.receivedDate).isSameOrBefore(deadLine)) {
            // Decide between QUALIFIED and REGULARIZED based on whether payable conditions are met.
            unitStatus =
              booking.totalReceived >= payableAmount
                ? UnitStatusEnum.QUALIFIED
                : UnitStatusEnum.REGULARIZED;
          }
        }
      } else if (moment().isAfter(deadLine, 'day')) {
        // If either agreement or received dates are not valid,
        // and the current time is past the deadline, mark the booking as DISQUALIFIED.
        unitStatus = UnitStatusEnum.DISQUALIFIED;
      }
    }

    return {
      unitStatus,
      ineligibilityReason,
    };
  }

  /**
   * This function evaluates the booking's deadline status and determines if the deadline is approaching.
   * It checks if the booking is unregularized and whether the deadline has passed to potentially disqualify the booking.
   * Additionally, it assesses if the deadline is within 10 days to flag it as approaching.
   */
  private evaluateDeadlineStatus(
    booking: IncentiveBooking,
    unitStatus: UnitStatusEnum,
    ineligibilityReason: string | null,
  ): {
    unitStatus: UnitStatusEnum;
    bookingDeadline: Date | null;
    isDeadlineApproaching: boolean;
    ineligibilityReason: string | null;
  } {
    // Determine deadline-related details: the exact deadline date and whether it's approaching.
    let isDeadlineApproaching = false;
    let bookingDeadline: Date | null = null;

    if (booking.bookingDate) {
      // Re-calculate the deadline based on the booking date and maxQualificationDays.
      const dt = moment(booking.bookingDate).add(
        booking.maxQualificationDays,
        'days',
      );

      if (dt.isValid()) {
        // Convert the Moment.js object to a JavaScript Date.
        bookingDeadline = dt.toDate();

        // If the booking remains unregularized and the deadline has already passed,
        // mark the booking as DISQUALIFIED.
        if (
          unitStatus === UnitStatusEnum.UNREGULARIZED &&
          dt.isBefore(moment(), 'day')
        ) {
          ineligibilityReason =
            IneligibilityReasonEnum.REG_DEADLINE_CROSSED.replace(
              '{DAYS}',
              String(booking.maxQualificationDays),
            );

          unitStatus = UnitStatusEnum.DISQUALIFIED;
        }

        // Check if the deadline is approaching: defined as within 10 days but still in the future.
        if (
          unitStatus === UnitStatusEnum.UNREGULARIZED &&
          dt.diff(moment(), 'days') <= 10 &&
          moment().isSameOrBefore(dt)
        ) {
          isDeadlineApproaching = true;
        }

        // Ensure that if the booking is disqualified, the approaching flag is disabled.
        if (unitStatus === UnitStatusEnum.DISQUALIFIED) {
          isDeadlineApproaching = false;
        }
      }
    }

    return {
      unitStatus,
      bookingDeadline,
      isDeadlineApproaching,
      ineligibilityReason,
    };
  }

  // Helper function to compute incentive details based on monthly gross totals.
  // It calculates the incentive percentage and amount based on the booking's gross value,
  // the applicable incentive slabs from the policy, and the user's monthly performance.
  private async computeIncentiveDetails(
    em: EntityManager,
    booking: IncentiveBooking,
    user: Users,
    policy: IncentivePolicy,
  ): Promise<{
    incentivePercentage: number;
    incentiveAmount: number;
    baseIncentiveAmount: number;
    areSlabsNull: boolean;
    ineligibilityReason: string | null;
  }> {
    // Initialize the incentive values to zero.
    let incentivePercentage = 0;
    let incentiveAmount = 0;
    let baseIncentiveAmount = 0;
    let areSlabsNull = false;
    let reasonTxt = null;

    // Only calculate incentive details if the booking is not cancelled.
    if (booking.status !== BookingStatusEnum.CANCELLED) {
      // Extract the month and year from the bookingDate.
      // Adding 1 to month because moment.month() returns 0-indexed months.
      const month = booking.bookingDate
        ? moment(booking.bookingDate).month() + 1
        : 0;
      const year = booking.bookingDate ? moment(booking.bookingDate).year() : 0;

      // Retrieve the user's monthly gross total record for the specific month and year.
      // This record contains metrics such as the launch or sustenance gross totals.
      const userMonth = await em.findOne(UserMonthlyGrossTotal, {
        where: { user: { id: user.id }, month, year },
      });

      // Proceed only if a monthly record exists.
      if (userMonth) {
        // Retrieve the collection of incentive slabs from the policy.
        // Determine the applicable monthly total based on the booking's project type.
        // For NEW_LAUNCH projects, use launch gross total; otherwise use sustenance gross total.
        const monthlyTotal =
          booking.bookingProjectType === ProjectStage.NEW_LAUNCH
            ? +userMonth.launchGrossTotal
            : +userMonth.sustenanceGrossTotal;

        // Using the monthly total and the booking's project type, determine which incentive slab applies.
        const { applicableSlab, isSlabNull, ineligibilityReason } =
          this.getApplicableSlab(
            booking.bookingProjectType,
            monthlyTotal,
            policy,
            userMonth?.eligibleBookings,
          );

        areSlabsNull = isSlabNull;
        reasonTxt = ineligibilityReason;

        // If an applicable slab is found, set the incentive percentage accordingly.
        if (applicableSlab) {
          incentivePercentage =
            booking.bookingProjectType === ProjectStage.NEW_LAUNCH
              ? applicableSlab.launchIncentivePercentage
              : applicableSlab.sustenanceIncentivePercentage;
        }

        // Update the user's monthly record if the incentive percentage needs adjustment.
        // This can involve recalculating values or recording the new incentive percentage.
        await this.updateIncentivePercentageIfNeeded({
          em,
          booking,
          userMonth,
          finalIncentivePercentage: incentivePercentage,
          user,
          month,
          year,
          policyToUse: policy,
        });

        // Finally, compute the base incentive amount by applying the incentive percentage
        // on the booking's gross total value. The result is rounded to three decimal places.
        baseIncentiveAmount = Number(
          ((booking.grossTotalValue * incentivePercentage) / 100).toFixed(3),
        );
        incentiveAmount = Number(
          (baseIncentiveAmount / (booking.splitFactor || 1)).toFixed(3),
        );
      }
    }
    // Return the computed incentive details.
    return {
      incentivePercentage,
      incentiveAmount,
      baseIncentiveAmount,
      areSlabsNull,
      ineligibilityReason: reasonTxt,
    };
  }

  /* Build partial booking data (no final incentive yet)
   This function creates a partial booking record from the provided DTO,
  project phase, and associated user. It converts necessary fields to numbers,
 sets default values, and determines the initial unit status.*/
  private async buildPartialBooking(
    item: CreateIncentiveBookingDto, // Data transfer object containing booking details
    projectPhase: ProjectPhase, // Current project phase for this booking
    user: Users | null, // User associated with the booking; may be null
    isCancelled: boolean, // Flag indicating whether the booking is cancelled
  ) {
    try {
      // Convert provided string/numeric fields to actual numbers
      const totalGrossValue = this.convertToNumber(item.grossTotalValue);
      const totalReceived = this.convertToNumber(item.totalReceived);
      const sbaNum = this.convertToNumber(item.sbaSold);
      const carpetNum = this.convertToNumber(item.carpetAreaSold);

      const finalUnitStatus = this.resolveFinalUnitStatus(item, isCancelled);
      const bookingProjectType = this.resolveBookingProjectType(
        item,
        projectPhase,
      );

      /* Build the partial booking object with both provided and default values.
     Note that several fields (e.g., regularizationPercentage, payableAmount, etc.)
     are initialized to 0, as final calculations are performed later.*/
      const partialBooking = {
        fy: safeString(item.fy), // Financial year; default to empty string
        entity: safeString(item.entity), // Business entity; default empty
        bookingDate: item.bookingDate || null, // Booking date; null if not provided
        sapBookingDate: item.sapBookingDate || null, // Booking date; null if not provided
        bookingDeadline: null, // Booking deadline is not set at this stage
        stmName: safeString(item.stmName), // Sales team name
        stm: safeString(item.stm), // Sales team identifier or code
        stm2: safeString(item.stm2), // Additional sales team info
        stm3: safeString(item.stm3), // Further sales team details
        vendor: safeString((item.vendor || '').replace(/^0+/, '')), // Vendor details; default empty
        customerCode: safeString((item.customerCode || '').replace(/^0+/, '')), // Customer code identifier
        bookingId: safeString((item.bookingId || '').replace(/^0+/, '')), // Unique booking identifier
        customerName: safeString(item.customerName), // Customer's name
        propertyNumber: safeString(item.propertyNumber), // Property number or identifier
        externalBPNumber: safeString(item.externalBPNumber), // External booking/partner number
        saleType: safeString(item.saleType), // Type of sale (e.g., cash, credit)
        agreementReceivedDate: safeDate(item.agreementReceivedDate), // Date agreement was received
        grossTotalValue: totalGrossValue, // Total gross value (converted to number)
        totalReceived: totalReceived, // Total amount received (converted to number)
        status: safeString(item.status || BookingStatusEnum.ACTIVE), // Booking status; default to ACTIVE
        cancellationDate: safeDate(item.cancellationDate), // Date of cancellation if applicable
        receivedDate: safeDate(item.receivedDate), // Date when payment was received
        paymentStatus: PaymentStatusEnum.INELIGIBLE, // Payment status; default INELIGIBLE
        ReraNonReraEligibility:
          item.ReraNonReraEligibility || ReraStatusEnum.NO, // RERA eligibility; default NO
        sbaSold: sbaNum, // SBA sold value (number)
        carpetAreaSold: carpetNum, // Carpet area sold (number)
        salesOffice: safeString(item.salesOffice), // Sales office info; default empty
        projectPhase: projectPhase || null, // Associated project phase entity
        user: user || null, // Associated user; null if not available
        receivedPercent: parseFloat(item.receivedPercent || '0'), // Percentage received, default 0
        isDeadlineApproaching: false, // Flag for deadline proximity; default false
        bookingProjectType: bookingProjectType as ProjectStage, // Cast booking project type to ProjectStage
        disqualifiedDate: null, // Disqualification date; not set at this stage
        maxQualificationDays: projectPhase?.project?.maxQualificationDays || 0, // Max qualification days from project phase
        policyUsed: null, // Policy used for this booking; not set yet
        // The following fields will be computed later during incentive calculations:
        regularizationPercentage: 0,
        payablePercentage: 0,
        regularizedAmount: 0,
        payableAmount: 0,
        incentivePercentage: 0,
        incentiveAmount: 0,
        ineligibilityReason: null, // Reason for ineligibility; default null
        unitStatus: finalUnitStatus, // Final unit status based on input and cancellation flag
      };

      // Return the constructed partial booking data
      return partialBooking;
    } catch (error) {
      logger.error('Error in the partialBooking construction', error);
      // Ideally, log the error here for debugging
    }
  }

  private resolveBookingProjectType(
    item: CreateIncentiveBookingDto, // Data transfer object containing booking details
    projectPhase: ProjectPhase, // Current project phase for this booking
  ) {
    const shouldUseSustenance =
      projectPhase.skipLaunch &&
      new Date(item.bookingDate) >= new Date(projectPhase.sustenanceDate);

    const shouldUseLaunch =
      !projectPhase.skipLaunch &&
      new Date(item.bookingDate) >= new Date(projectPhase.launchStartDate) &&
      new Date(item.bookingDate) <= new Date(projectPhase.launchEndDate);

    let bookingProjectType;
    if (shouldUseLaunch) {
      bookingProjectType = ProjectStage.NEW_LAUNCH;
    } else if (shouldUseSustenance) {
      bookingProjectType = ProjectStage.SUSTENANCE;
    } else {
      bookingProjectType =
        item.projectType == 'Sustence'
          ? ProjectStage.SUSTENANCE
          : ProjectStage.NEW_LAUNCH;
    }

    return bookingProjectType;
  }

  private resolveFinalUnitStatus(
    item: CreateIncentiveBookingDto, // Data transfer object containing booking details
    isCancelled: boolean, // Flag indicating whether the booking is cancelled
  ) {
    /* Determine the initial unit status.
   If a status is provided in the DTO, use it; otherwise default to UNREGULARIZED.
   If the booking is cancelled, override the status to CANCELLED.*/
    let finalUnitStatus = item.unitStatus || UnitStatusEnum.UNREGULARIZED;
    if (isCancelled) {
      finalUnitStatus = UnitStatusEnum.CANCELLED;
    }
    return finalUnitStatus;
  }

  /**
   * Determines the applicable incentive slab for a booking based on the monthly total,
   * project type, and defined slabs. This helps in calculating the final incentive details
   * such as payable and regularized amounts.
   *
   * For a NEW_LAUNCH project:
   *   - It finds the slab where the monthly total lies within the (start, end) range.
   *   - If no slab matches and the monthly total exceeds the maximum defined slab range,
   *     the highest slab is selected.
   *
   * For a SUSTENANCE project:
   *   - It follows similar logic as NEW_LAUNCH but uses the sustenance ranges.
   *
   * @param bookingProjectType - The type of project (NEW_LAUNCH or SUSTENANCE).
   * @param monthlyTotal - The user's monthly total amount.
   * @param slabs - An array of incentive slabs available.
   * @returns The matching incentive slab or null if no slab applies.
   */
  public getApplicableSlab(
    bookingProjectType: ProjectStage,
    monthlyTotal: number,
    policyToUse: IncentivePolicy,
    eligibleBookings: number,
  ): {
    applicableSlab: IncentiveSlab | null;
    isSlabNull: boolean;
    ineligibilityReason: string | null;
  } {
    // Guard: ensure we have a slabs array to work with
    const slabs: IncentiveSlab[] = policyToUse?.incentiveSlabs || [];

    if (!slabs.length) {
      // No slabs at all => treat as slab missing for the project type
      const reason =
        bookingProjectType === ProjectStage.NEW_LAUNCH
          ? IneligibilityReasonEnum.LAUNCH_SLAB_MISSING
          : IneligibilityReasonEnum.SUSTENANCE_SLAB_MISSING;
      return {
        applicableSlab: null,
        isSlabNull: true,
        ineligibilityReason: reason,
      };
    }

    // Helper: does this slab pass its minimumBookings requirement?
    // If slab.minimumBookings is undefined/null/<=0, we treat it as "no booking requirement".
    const slabPassesBookings = (
      slab: IncentiveSlab,
      minimumBookings: string,
    ): boolean => {
      if (!slab[minimumBookings] || slab[minimumBookings] <= 0) return true;
      if (!eligibleBookings) return false;
      return eligibleBookings >= slab[minimumBookings];
    };
    // Generic slab selection function for a given "range" key (launchStartRange | sustenanceStartRange).
    // - rangeKey: the property on slab to use for ordering/thresholds
    // - missingReason: reason to return if any slab's range is null/undefined
    // - targetMissedReason: reason to return if monthlyTotal doesn't meet any slab after bookings checks
    const chooseSlab = (
      rangeKey: 'launchStartRange' | 'sustenanceStartRange',
      minimumBookings: 'launchMinBookings' | 'sustenanceMinBookings',
      missingReason: string,
      targetMissedReason: string,
    ) => {
      // Sort safely by the chosen range (treat null/undefined as 0 for sorting only;
      // actual null range is caught below and triggers missingReason).
      const sorted = slabs
        .slice()
        .sort((a, b) => (a[rangeKey] ?? 0) - (b[rangeKey] ?? 0));

      let anySlabQualifiedByBookings = false; // any slab passed its booking check
      let anySlabQualifiedByAmount = false; // any slab passed amount threshold (irrespective of bookings)

      for (let i = 0; i < sorted.length; i++) {
        const slab = sorted[i];

        // If slab's range is missing => data problem, bail-out with specific reason
        if (slab[rangeKey] == null) {
          return {
            slab: null,
            isSlabNull: true,
            reason: missingReason,
            anySlabQualifiedByBookings,
            anySlabQualifiedByAmount,
          };
        }

        // Slab-level booking check: skip slabs where RM hasn't met slab.minimumBookings
        if (!slabPassesBookings(slab, minimumBookings)) {
          // do not mark anySlabQualifiedByBookings; just skip this slab
          continue;
        } else {
          anySlabQualifiedByBookings = true;
        }

        // Compute slab start threshold
        const currentStart = slab[rangeKey] * SLAB_MULTIPLIER;

        // Mark if amount criteria hit for this slab (independent of whether it's finally chosen)
        if (monthlyTotal >= currentStart) {
          anySlabQualifiedByAmount = true;

          // If there's a next slab, use its start as upper bound
          if (i < sorted.length - 1) {
            const nextRange = sorted[i + 1][rangeKey];
            // nextRange should not be null because we'd have returned earlier if it were
            const nextStart = nextRange * SLAB_MULTIPLIER;
            if (monthlyTotal < nextStart) {
              return {
                slab,
                isSlabNull: false,
                reason: null,
                anySlabQualifiedByBookings,
                anySlabQualifiedByAmount,
              };
            } else {
              // monthlyTotal >= nextStart -> current slab not applicable, continue scanning
              continue;
            }
          } else {
            // Last slab: if monthlyTotal >= currentStart then select it
            return {
              slab,
              isSlabNull: false,
              reason: null,
              anySlabQualifiedByBookings,
              anySlabQualifiedByAmount,
            };
          }
        }
        // monthlyTotal < currentStart -> continue scanning
      }

      // Nothing matched (no slab returned inside loop). Determine reason:
      // - If no slabs passed booking check at all => BOOKING_TARGET_MISSED
      // - Else => target missed for the project type (use targetMissedReason passed in)
      if (!anySlabQualifiedByBookings) {
        return {
          slab: null,
          isSlabNull: true,
          reason: IneligibilityReasonEnum.BOOKING_TARGET_MISSED,
          anySlabQualifiedByBookings,
          anySlabQualifiedByAmount,
        };
      }
      return {
        slab: null,
        isSlabNull: true,
        reason: targetMissedReason,
        anySlabQualifiedByBookings,
        anySlabQualifiedByAmount,
      };
    };

    // Route to the appropriate slab chooser based on project type
    if (bookingProjectType === ProjectStage.NEW_LAUNCH) {
      const result = chooseSlab(
        'launchStartRange',
        'launchMinBookings',
        IneligibilityReasonEnum.LAUNCH_SLAB_MISSING,
        IneligibilityReasonEnum.LAUNCH_TARGET_MISSED,
      );
      return {
        applicableSlab: result.slab,
        isSlabNull: result.isSlabNull,
        ineligibilityReason: result.reason,
      };
    } else {
      const result = chooseSlab(
        'sustenanceStartRange',
        'sustenanceMinBookings',
        IneligibilityReasonEnum.SUSTENANCE_SLAB_MISSING,
        IneligibilityReasonEnum.SUSTENANCE_TARGET_MISSED,
      );
      return {
        applicableSlab: result.slab,
        isSlabNull: result.isSlabNull,
        ineligibilityReason: result.reason,
      };
    }
  }

  /**
   * Updates the monthly incentive record and all relevant bookings if the new incentive
   * percentage differs from the currently stored one.
   *
   * This function works for both NEW_LAUNCH and SUSTENANCE project types:
   *   - It first compares the new incentive percentage with the existing one stored in the monthly record.
   *   - If there's a difference, it updates the monthly record with the new incentive percentage and persists it.
   *   - Then, it updates all related bookings for the specified user, month, and year with the new
   *     incentive percentage and recalculates the incentive amount using the provided formula.
   *
   * @param em - The EntityManager used for database operations.
   * @param booking - The booking record being processed.
   * @param userMonth - The user's monthly gross total record that stores the current incentive percentages.
   * @param finalIncentivePercentage - The new incentive percentage to be applied.
   * @param user - The user to whom the bookings belong.
   * @param month - The month for which the incentive is being updated.
   * @param year - The year for which the incentive is being updated.
   * @param policyToUse - The policy being used in the update.
   */
  private async updateIncentivePercentageIfNeeded(options: {
    em: EntityManager;
    booking: IncentiveBooking;
    userMonth: UserMonthlyGrossTotal;
    finalIncentivePercentage: number;
    user: Users;
    month: number;
    year: number;
    policyToUse: IncentivePolicy;
  }): Promise<void> {
    const {
      em,
      booking,
      userMonth,
      finalIncentivePercentage,
      user,
      month,
      year,
      policyToUse,
    } = options;
    // Step A: Store old deltas by booking ID before the update
    const oldDeltaMap = new Map<number, number>();
    const oldDeltas = await em
      .getRepository(IncentiveBooking)
      .createQueryBuilder('booking')
      .select(['booking.id', 'booking.incentiveDelta'])
      .where('booking.user_id = :userId', { userId: user.id })
      .andWhere('payment_status = :paid', { paid: PaymentStatusEnum.PAID })
      .getMany();

    oldDeltas.forEach((b) => {
      oldDeltaMap.set(b.id, Number(b.incentiveDelta || 0));
    });

    const isLaunch = booking.bookingProjectType === ProjectStage.NEW_LAUNCH;
    const projectType = isLaunch
      ? ProjectStage.NEW_LAUNCH
      : ProjectStage.SUSTENANCE;
    const oldRate = isLaunch
      ? userMonth.currentLaunchIncentivePercentage || 0
      : userMonth.currentSustenanceIncentivePercentage || 0;

    // Step B: If the incentive percentage has changed, update the monthly record and related bookings
    if (finalIncentivePercentage !== oldRate) {
      if (isLaunch) {
        userMonth.currentLaunchIncentivePercentage = finalIncentivePercentage;
      } else {
        userMonth.currentSustenanceIncentivePercentage =
          finalIncentivePercentage;
      }
      await em.save(UserMonthlyGrossTotal, userMonth);
      const dateRange = {
        start: policyToUse.startDate,
        end: policyToUse.endDate,
      };

      const baseConditions = em
        .createQueryBuilder()
        .update(IncentiveBooking)
        .where('user_id = :userId', { userId: user.id })
        .andWhere('EXTRACT(MONTH FROM booking_date) = :m', { m: month })
        .andWhere('EXTRACT(YEAR FROM booking_date) = :y', { y: year })
        .andWhere('booking_date BETWEEN :start AND :end', dateRange)
        .andWhere('unit_status != :cancelled', {
          cancelled: UnitStatusEnum.CANCELLED,
        })
        .andWhere('booking_project_type = :ptype', { ptype: projectType })
        .andWhere('shouldBeCalculated = :shouldBeCalculated', {
          shouldBeCalculated: true,
        });

      const getIncentiveFormula = (percentage: number) =>
        `(gross_total_value * ${percentage} / 100) / COALESCE(NULLIF(split_factor, 0), 1)`;

      // Update non-paid bookings
      await baseConditions
        .clone()
        .andWhere('payment_status != :paid', { paid: PaymentStatusEnum.PAID })
        .set({
          incentivePercentage: finalIncentivePercentage,
          baseIncentiveAmount: () =>
            `gross_total_value * ${finalIncentivePercentage} / 100`,
          incentiveAmount: () => getIncentiveFormula(finalIncentivePercentage),
          incentiveDelta: 0,
          policyUsed: policyToUse,
          ineligibilityReason: () => `
          CASE
            WHEN ${finalIncentivePercentage} < ${oldRate} THEN
              CONCAT('${IneligibilityReasonEnum.CANCELLATION_IMPACTED} {', property_number, '}')
            ELSE NULL
          END
        `,
          paymentStatus: () =>
            `CASE WHEN ${finalIncentivePercentage} > 0 THEN '${PaymentStatusEnum.PAYABLE}' ELSE '${PaymentStatusEnum.INELIGIBLE}' END`,
        })
        .execute();

      // Update paid bookings
      await baseConditions
        .clone()
        .andWhere('payment_status = :paid', { paid: PaymentStatusEnum.PAID })
        .set({
          incentivePercentage: finalIncentivePercentage,
          baseIncentiveAmount: () =>
            `gross_total_value * ${finalIncentivePercentage} / 100`,
          incentiveDelta: () =>
            `${getIncentiveFormula(finalIncentivePercentage)} - incentive_amount`,
          policyUsed: policyToUse,
          ineligibilityReason: () => `
          CASE
            WHEN ${finalIncentivePercentage} < ${oldRate} THEN
              CONCAT('${IneligibilityReasonEnum.DELTA_CALCULATED} {', property_number, '}')
            ELSE NULL
          END
        `,
        })
        .execute();
    }

    const newDeltaResult = await em
      .getRepository(IncentiveBooking)
      .createQueryBuilder('booking')
      .select(['booking.id', 'booking.incentiveDelta'])
      .where('booking.user_id = :userId', { userId: user.id })
      .andWhere('payment_status = :paid', { paid: PaymentStatusEnum.PAID })
      .getMany();

    const deltaHistoriesToInsert = newDeltaResult
      .map((updated) => ({
        user,
        booking: updated,
        deltaAmount: oldDeltaMap[updated.id] ?? 0,
      }))
      .filter((item) => item.deltaAmount !== 0); // Only keep non-zero deltas

    if (deltaHistoriesToInsert.length > 0) {
      await em.save(IncentiveDeltaHistory, deltaHistoriesToInsert);
    }
  }

  /**
   * Calculates incentive details for a booking based on the user's monthly total,
   * project policy, and booking details.
   *
   * The function performs several key steps:
   *  1. Validates input data and exits early for cancelled or invalid bookings.
   *  2. Sets the regularization and payable percentages based on RERA eligibility.
   *  3. Computes the regularized and payable amounts from the booking's gross total value.
   *  4. Determines the new unit status by checking if the booking meets payment criteria
   *     within the qualification deadline.
   *  5. Handles deadline logic, including detecting if the deadline is approaching.
   *  6. Processes incentive calculations, updating monthly records and related bookings
   *     if a new, higher incentive percentage is found.
   *  7. Returns an object with all computed fields.
   *
   * @param em - The EntityManager used for database operations.
   * @param booking - The booking for which incentive calculation is performed.
   * @param user - The user associated with the booking.
   * @param policy - The incentive policy containing slab definitions and percentages.
   * @param projectPhase - The project phase that contains project details.
   * @returns An object with computed incentive fields or null if processing cannot proceed.
   */
  private async calculateIncentiveUsingMonthlyTotal(
    em: EntityManager,
    booking: IncentiveBooking,
    user: Users | null,
    policy: IncentivePolicy | null,
    projectPhase: ProjectPhase | null,
  ): Promise<Partial<IncentiveBooking> | null> {
    // Validate essential inputs: user, policy, and project data must be present.
    if (!user || !policy || !projectPhase?.project) {
      return null;
    }
    // Use a helper function to compute the incentive details based on monthly totals.
    // This function returns an object containing the computed incentivePercentage and incentiveAmount.
    const {
      incentivePercentage,
      incentiveAmount,
      baseIncentiveAmount,
      areSlabsNull,
      ineligibilityReason,
    } = await this.computeIncentiveDetails(em, booking, user, policy);
    // Return the computed incentive values to be applied to the booking.
    return {
      incentivePercentage,
      incentiveAmount,
      baseIncentiveAmount,
      areSlabsNull,
      ineligibilityReason,
    };
  }

  /*
   * Update monthly totals.
   *
   * This function aggregates all non-cancelled incentive bookings for a user within a specific month,
   * identified by the bookingDate, to update the user's monthly gross total record.
   * It calculates separate totals for NEW_LAUNCH and SUSTENANCE project types.
   */
  private async updateUserMonthlyGrossTotal(
    em: EntityManager,
    userId: number,
    bookingDate: Date | null,
  ): Promise<void> {
    // Exit early if no bookingDate is provided.
    if (!bookingDate) {
      return;
    }

    /* Extract the month and year from the bookingDate using moment.js.
     * Note: moment.month() returns a zero-indexed value (0-11), so add 1 for the actual month.
     */
    const month = moment(bookingDate).month() + 1;
    const year = moment(bookingDate).year();

    // Define start and end dates for the month.
    const startOfMonth = moment(bookingDate).startOf('month').toDate();
    const endOfMonth = moment(bookingDate).endOf('month').toDate();

    /* Retrieve all incentive bookings for the user that fall within the month.
     * Only include bookings whose unitStatus is REGULARIZED, QUALIFIED, or QUALIFIED_CANCELLED.
     */
    const bookings = await em
      .createQueryBuilder(IncentiveBooking, 'booking')
      .where('booking.user = :userId', { userId })
      .andWhere('booking.bookingDate BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .andWhere('booking.unitStatus IN (:...statuses)', {
        statuses: [
          UnitStatusEnum.REGULARIZED,
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ],
      })
      .getMany();

    // Initialize accumulators for gross totals for each project type.
    let totalLaunchGross = 0;
    let totalSustenanceGross = 0;

    /* Sum the grossTotalValue for each booking based on its project type.
     * NEW_LAUNCH bookings add to totalLaunchGross; others add to totalSustenanceGross.
     */
    bookings.forEach((b) => {
      if (b.bookingProjectType === ProjectStage.NEW_LAUNCH) {
        totalLaunchGross += b.grossTotalValue;
      } else {
        totalSustenanceGross += b.grossTotalValue;
      }
    });

    // Try to find an existing monthly record for the user for the given month and year.
    let userMonth = await em.findOne(UserMonthlyGrossTotal, {
      where: { user: { id: userId }, month, year },
      relations: ['user'],
    });

    // If no record exists, create a new record with the aggregated totals.
    if (!userMonth) {
      userMonth = em.create(UserMonthlyGrossTotal, {
        user: { id: userId } as Users,
        month,
        year,
        eligibleBookings: bookings?.length ?? 0,
        launchGrossTotal: totalLaunchGross,
        sustenanceGrossTotal: totalSustenanceGross,
      });
    } else {
      // Update the existing record with the new totals.
      userMonth.eligibleBookings = bookings?.length ?? 0;
      userMonth.launchGrossTotal = totalLaunchGross;
      userMonth.sustenanceGrossTotal = totalSustenanceGross;
    }

    // Prevent negative values by resetting totals to zero if necessary.
    if (userMonth.launchGrossTotal < 0) {
      userMonth.launchGrossTotal = 0;
    }
    if (userMonth.sustenanceGrossTotal < 0) {
      userMonth.sustenanceGrossTotal = 0;
    }

    // Save the new or updated monthly record.
    await em.save(UserMonthlyGrossTotal, userMonth);
  }

  /**
   * Fetch all bookings with applied filters, pagination, and search.
   This function retrieves incentive bookings for a user based on various filters
  such as type, incentiveFilter, project IDs, month/year, and search terms.
  It validates the filters, constructs the query conditions, and returns
  paginated results along with metadata.
  * @param options - An object containing filter and pagination options.
  * @returns A promise resolving to the paginated booking results.
  *
  */
  async findAllBookings(options: {
    userId: number;
    page: number;
    limit: number;
    type?: string;
    incentiveFilter?: string; // New param to filter by incentive cards
    projectIds?: string; // Comma-separated project IDs
    month?: string;
    year?: number;
    search?: string;
  }): Promise<any> {
    const {
      userId,
      page,
      limit,
      type,
      incentiveFilter,
      projectIds,
      month,
      year,
      search,
    } = options;

    try {
      const skip = (page - 1) * limit;

      // 1) Validate date filters & compute dateRange + monthInt
      const { dateRange, filtersApplied, monthInt } =
        this.validateAndComputeDateRange(month, year);

      // 2) Validate filter values (global + cross checks)
      this.validateFilters(incentiveFilter, type);

      // 3) Special case retained from original: if month/year filter applied and incentiveFilter is PAYABLE/RISK -> early return
      if (
        filtersApplied &&
        (incentiveFilter === IncentiveFilterEnum.PAYABLE ||
          incentiveFilter === IncentiveFilterEnum.RISK)
      ) {
        return {
          message: 'No bookings found (payable/risk with month filter)',
          data: {
            totalRecords: 0,
            currentPage: page,
            totalPages: 0,
            limit,
          },
        };
      }

      // 4) Build the whereCondition (includes base, projectIds, incentiveFilter and type logic)
      let whereCondition: any = this.buildWhereCondition({
        userId,
        projectIds,
        incentiveFilter,
        type,
        dateRange,
        filtersApplied,
        monthInt,
      });

      // 5) Apply search (if provided)
      whereCondition = this.applySearch(whereCondition, search);

      // 6) Fetch and transform results
      return await this.fetchBookingsAndTransform(
        whereCondition,
        skip,
        limit,
        page,
      );
    } catch (error) {
      logsAndErrorHandling('IncentiveBookingService - findAllBookings', error, {
        userId,
        type,
        incentiveFilter,
        projectIds,
      });
    }
  }

  /**
   * validates month/year filters and computes dateRange if both provided
   * @param month as string
   * @param year as number
   * @returns dateRange, filtersApplied, monthInt
   */
  private validateAndComputeDateRange(month?: string, year?: number) {
    const filtersApplied = !!(month && year);
    const monthInt = getMonthNumber(month);

    if (filtersApplied) {
      const yearInt = year;

      if ((month && !year) || (!month && year)) {
        throw new BadRequestException(
          'Please select both month and year to apply filters.',
        );
      }

      if (isNaN(monthInt) || isNaN(yearInt) || monthInt < 1 || monthInt > 12) {
        throw new BadRequestException('Invalid month or year provided');
      }

      // Prevent future month/year filters
      const filterDate = moment(`${year}-${monthInt}-01`, DATE_FORMAT);
      const today = moment().startOf('month');
      if (filterDate.isAfter(today)) {
        throw new BadRequestException('Selected month/year is in the future.');
      }

      const start = moment(`${year}-${monthInt}-01`).startOf('month').toDate();
      const end = moment(start).endOf('month').toDate();
      return {
        dateRange: [start, end] as [Date, Date],
        filtersApplied: true,
        monthInt,
      };
    }

    return { dateRange: null, filtersApplied: false, monthInt: null };
  }

  /**
   * Validates the incentiveFilter and type parameters.
   * Performs global validation for both parameters and cross-validates
   * type against specific incentiveFilter values.
   * @param incentiveFilter - The incentive filter to validate.
   * @param type - The type to validate.
   * @throws BadRequestException if any validation fails.
   */
  private validateFilters(incentiveFilter?: string, type?: string) {
    // Validate incentiveFilter value
    const allowedIncentiveFilters = Object.values(IncentiveFilterEnum);
    if (
      incentiveFilter &&
      !allowedIncentiveFilters.includes(incentiveFilter as IncentiveFilterEnum)
    ) {
      throw new BadRequestException(
        `Invalid incentiveFilter value. Allowed values: ${allowedIncentiveFilters.join(', ')}.`,
      );
    }

    // Validate type globally
    if (type) {
      const allowedTypes = Object.values(IncentiveTypeEnum);
      if (!allowedTypes.includes(type.toLowerCase() as IncentiveTypeEnum)) {
        throw new BadRequestException(
          `Invalid type value. Allowed values: ${allowedTypes.join(', ')}.`,
        );
      }
    }

    // Validate type against incentiveFilter-specific allowed values (same checks as original)
    if (incentiveFilter && type) {
      const lowerType = type.toLowerCase();

      switch (incentiveFilter) {
        case IncentiveFilterEnum.RISK:
          if (
            ![
              IncentiveTypeEnum.UNREGULARIZED,
              IncentiveTypeEnum.MANAGEMENT_SALE,
            ].includes(lowerType as IncentiveTypeEnum)
          ) {
            throw new BadRequestException(
              `Type "${type}" is not valid for incentiveFilter "risk". Allowed: unregularized, management sale.`,
            );
          }
          break;

        case IncentiveFilterEnum.PAID_YTD:
        case IncentiveFilterEnum.PAID:
        case IncentiveFilterEnum.PAYABLE:
          if (
            ![
              IncentiveTypeEnum.QUALIFIED,
              IncentiveTypeEnum.MGMT_APPROVED_CREDIT_SALE,
            ].includes(lowerType as IncentiveTypeEnum)
          ) {
            throw new BadRequestException(
              `Type "${type}" is not valid for incentiveFilter "${incentiveFilter}". Allowed: qualified, management approved credit sale.`,
            );
          }
          break;
      }
    }
  }

  /**
   * Builds the where condition for fetching incentive bookings based on provided filters.
   * This includes base conditions, project filtering, incentiveFilter logic,
   * type-specific conditions, and date range filtering.
   *
   * @param args - An object containing filter parameters.
   * @returns The constructed where condition object.
   */
  private buildWhereCondition(args: {
    userId: number;
    projectIds?: string;
    incentiveFilter?: string;
    type?: string;
    dateRange: [Date, Date] | null;
    filtersApplied: boolean;
    monthInt?: number | null;
  }) {
    const {
      userId,
      projectIds,
      incentiveFilter,
      type,
      dateRange,
      filtersApplied,
      monthInt,
    } = args;

    // Base condition: exclude "User Or Project Or Policy Not Found"
    let whereCondition: any = {
      user: { id: userId },
      unitStatus: Not(In([UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND])),
    };

    // Project filter: parse comma-separated ids and apply if present
    if (projectIds) {
      const projectIdsArray = projectIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);
      if (projectIdsArray.length > 0) {
        whereCondition.projectPhase = { project: { id: In(projectIdsArray) } };
      }
    }

    // If incentiveFilter provided, delegate to the incentive-filter handler (may override whereCondition)
    if (incentiveFilter) {
      // Delegate RISK separately because it has different FY fallback semantics
      if (incentiveFilter === IncentiveFilterEnum.RISK) {
        whereCondition = this.applyRiskConditions(
          whereCondition,
          type,
          dateRange,
          filtersApplied,
        );
      } else {
        // PAID_YTD, PAYABLE, PAID handled here
        whereCondition = this.applyDateBasedIncentiveConditions(
          whereCondition,
          incentiveFilter,
          type,
          dateRange,
          filtersApplied,
          monthInt,
        );
      }
    } else if (type) {
      whereCondition = this.applyTypeOnlyFilters(
        whereCondition,
        type,
        filtersApplied,
        dateRange,
      );
    }
    return whereCondition;
  }

  /** Applies risk-related conditions based on the provided type.
   * This method adjusts the whereCondition for "risk" incentives,
   * handling unregularized and management sale types with specific logic.
   *
   * @param whereCondition - The initial where condition object.
   * @param type - The type to filter by.
   * @param dateRange - The date range for filtering (if applicable).
   * @param filtersApplied - Indicates if any date filters are applied.
   * @returns The modified where condition object.
   */
  private applyRiskConditions(
    whereCondition: any,
    type?: string,
    dateRange: [Date, Date] | null = null,
    filtersApplied = false,
  ) {
    const isUnregularized =
      type?.toLowerCase() === IncentiveTypeEnum.UNREGULARIZED;
    const isManagementSale =
      type?.toLowerCase() === IncentiveTypeEnum.MANAGEMENT_SALE;

    // If no month/year filters set, set FY start -> today range (original behavior)
    let localDateRange = dateRange;
    if (!filtersApplied) {
      const now = moment();
      const fyStart =
        now.month() < 3
          ? moment(`${now.year() - 1}-${FY_START}`, DATE_FORMAT)
          : moment(`${now.year()}-${FY_START}`, DATE_FORMAT);

      localDateRange = [fyStart.toDate(), moment().toDate()];
    }

    if (isUnregularized) {
      return {
        ...whereCondition,
        unitStatus: UnitStatusEnum.UNREGULARIZED,
        isDeadlineApproaching: true,
      };
    } else if (isManagementSale) {
      const wc: any = {
        ...whereCondition,
        unitStatus: UnitStatusEnum.DISQUALIFIED,
      };
      if (localDateRange) {
        wc.disqualifiedDate = Between(localDateRange[0], localDateRange[1]);
      }
      return wc;
    }

    return whereCondition;
  }

  /** Applies date-based incentive conditions based on the provided incentiveFilter.
   * This method adjusts the whereCondition based on the incentiveFilter value,
   * delegating to specific handlers for PAID_YTD or PAYABLE/PAID conditions.
   *
   * @param whereCondition - The initial where condition object.
   * @param incentiveFilter - The incentive filter to apply.
   * @param type - The type to filter by.
   * @param dateRange - The date range for filtering (if applicable).
   * @param filtersApplied - Indicates if any date filters are applied.
   * @returns The modified where condition object.
   */
  private applyDateBasedIncentiveConditions(
    whereCondition: any,
    incentiveFilter: string,
    type?: string,
    dateRange: [Date, Date] | null = null,
    filtersApplied = false,
    monthInt?: number | null,
  ) {
    if (incentiveFilter === IncentiveFilterEnum.PAID_YTD) {
      return this.applyPaidYtdConditions(
        whereCondition,
        type,
        filtersApplied,
        monthInt,
      );
    } else {
      return this.applyPayableOrPaidConditions(
        whereCondition,
        incentiveFilter,
        type,
        dateRange,
        filtersApplied,
        monthInt,
      );
    }
  }

  /** Applies type-only filters when no incentiveFilter is provided.
   * This method adjusts the whereCondition based on the specified type.
   *
   * @param whereCondition - The initial where condition object.
   * @param type - The type to filter by.
   * @param filtersApplied - Indicates if any date filters are applied.
   * @param dateRange - The date range for filtering (if applicable).
   * @returns The modified where condition object.
   */
  private applyPaidYtdConditions(
    whereCondition: any,
    type?: string,
    filtersApplied = false,
    monthInt?: number | null,
  ) {
    let startDate: Date;
    let endDate: Date;

    if (filtersApplied && monthInt) {
      const selectedMoment = moment(`${monthInt}-01`, 'M-DD');
      if (monthInt === 4) {
        startDate = moment(`${monthInt - 1}-${FY_START}`, DATE_FORMAT)
          .startOf('month')
          .toDate();
        endDate = moment(`${monthInt}-03-31`, DATE_FORMAT)
          .endOf('day')
          .toDate();
      } else if (monthInt > 4) {
        startDate = moment(`${monthInt}-${FY_START}`, DATE_FORMAT)
          .startOf('month')
          .toDate();
        endDate = selectedMoment
          .clone()
          .subtract(1, 'month')
          .endOf('month')
          .toDate();
      } else {
        startDate = moment(`${monthInt - 1}-${FY_START}`, DATE_FORMAT)
          .startOf('month')
          .toDate();
        endDate = selectedMoment
          .clone()
          .subtract(1, 'month')
          .endOf('month')
          .toDate();
      }
    } else {
      // Original currentMonth logic preserved
      const now = moment();
      const currentMonth = now.month();
      const currentYear = now.year();
      const twoMonthsBack = now.clone().subtract(2, 'months').endOf('month');

      if (currentMonth === 3) {
        startDate = moment(
          `${currentYear - 1}-${FY_START}`,
          DATE_FORMAT,
        ).toDate();
        endDate = moment(`${currentYear}-02-28`, DATE_FORMAT)
          .endOf('day')
          .toDate();
      } else if (currentMonth === 4) {
        startDate = moment(
          `${currentYear - 1}-${FY_START}`,
          DATE_FORMAT,
        ).toDate();
        endDate = moment(`${currentYear}-03-31`, DATE_FORMAT)
          .endOf('day')
          .toDate();
      } else if (currentMonth === 5) {
        startDate = moment(`${currentYear}-${FY_START}`, DATE_FORMAT).toDate();
        endDate = moment(`${currentYear}-04-30`, DATE_FORMAT)
          .endOf('day')
          .toDate();
      } else if (currentMonth === 6) {
        startDate = moment(`${currentYear}-${FY_START}`, DATE_FORMAT).toDate();
        endDate = moment(`${currentYear}-05-31`, DATE_FORMAT)
          .endOf('day')
          .toDate();
      } else if (currentMonth <= 2) {
        startDate = moment(
          `${currentYear - 1}-${FY_START}`,
          DATE_FORMAT,
        ).toDate();
        endDate = twoMonthsBack.toDate();
      } else {
        startDate = moment(`${currentYear}-${FY_START}`, DATE_FORMAT).toDate();
        endDate = twoMonthsBack.isSameOrBefore(startDate)
          ? moment(startDate).endOf('month').toDate()
          : twoMonthsBack.toDate();
      }
    }

    if (type?.toLowerCase() === IncentiveTypeEnum.QUALIFIED) {
      return {
        ...whereCondition,
        unitStatus: In([
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ]),
        paymentStatus: PaymentStatusEnum.PAID,
        saleType: Not(SalesTypeEnum.CREDIT_SALE_MGT_APPROVED),
        paidDate: Between(startDate, endDate),
      };
    } else if (
      type?.toLowerCase() === IncentiveTypeEnum.MGMT_APPROVED_CREDIT_SALE
    ) {
      return [
        {
          ...whereCondition,
          unitStatus: In([
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ]),
          saleType: SalesTypeEnum.CREDIT_SALE_MGT_APPROVED,
          paymentStatus: PaymentStatusEnum.PAID,
          paidDate: Between(startDate, endDate),
        },
      ];
    }

    return whereCondition;
  }

  /** Applies payable or paid conditions to the whereCondition based on the incentiveFilter and type.
   *
   * @param whereCondition - The initial where condition object.
   * @param incentiveFilter - The incentive filter to apply (PAYABLE or PAID).
   * @param type - The type to filter by.
   * @param dateRange - The date range for filtering (if applicable).
   * @param filtersApplied - Indicates if any date filters are applied.
   * @param monthInt - The month integer (if applicable).
   * @returns The modified where condition object.
   */
  private applyPayableOrPaidConditions(
    whereCondition: any,
    incentiveFilter: string,
    type?: string,
    dateRange: [Date, Date] | null = null,
    filtersApplied = false,
    monthInt?: number | null,
  ) {
    let startDate: Date;
    let endDate: Date;

    if (incentiveFilter === IncentiveFilterEnum.PAID) {
      if (filtersApplied && monthInt) {
        const selectedMoment = moment(`${monthInt}-01`, 'M-DD').subtract(
          1,
          'month',
        );
        startDate = selectedMoment.clone().startOf('month').toDate();
        endDate = selectedMoment.clone().endOf('month').toDate();
      } else {
        const twoMonthsAgo = moment().subtract(1, 'month');
        startDate = twoMonthsAgo.clone().startOf('month').toDate();
        endDate = twoMonthsAgo.clone().endOf('month').toDate();
      }
    } else if (incentiveFilter === IncentiveFilterEnum.PAYABLE) {
      const range = dateRange || [
        moment().startOf('month').toDate(),
        moment().endOf('month').toDate(),
      ];
      startDate = range[0];
      endDate = range[1];
    }

    if (type?.toLowerCase() === IncentiveTypeEnum.QUALIFIED) {
      return {
        ...whereCondition,
        unitStatus: In([
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ]),
        paymentStatus:
          incentiveFilter === IncentiveFilterEnum.PAYABLE
            ? PaymentStatusEnum.PAYABLE
            : PaymentStatusEnum.PAID,
        saleType: Not(SalesTypeEnum.CREDIT_SALE_MGT_APPROVED),
        ...(incentiveFilter === IncentiveFilterEnum.PAYABLE
          ? { payableReceivedDate: Between(startDate, endDate) }
          : { paidDate: Between(startDate, endDate) }),
      };
    } else if (
      type?.toLowerCase() === IncentiveTypeEnum.MGMT_APPROVED_CREDIT_SALE
    ) {
      return {
        ...whereCondition,
        unitStatus: In([
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ]),
        saleType: SalesTypeEnum.CREDIT_SALE_MGT_APPROVED,
        paymentStatus:
          incentiveFilter === IncentiveFilterEnum.PAYABLE
            ? PaymentStatusEnum.PAYABLE
            : PaymentStatusEnum.PAID,
        ...(incentiveFilter === IncentiveFilterEnum.PAYABLE
          ? { payableReceivedDate: Between(startDate, endDate) }
          : { paidDate: Between(startDate, endDate) }),
      };
    }

    return whereCondition;
  }

  /** Applies type-only filters to the where condition.
   *
   * @param whereCondition - The initial where condition object.
   * @param type - The type to filter by.
   * @param filtersApplied - Indicates if any date filters are applied.
   * @param dateRange - The date range for filtering (if applicable).
   * @returns The modified where condition object.
   */
  private applyTypeOnlyFilters(
    whereCondition: any,
    type: string,
    filtersApplied: boolean,
    dateRange: [Date, Date] | null,
  ) {
    const lowerType = type?.toLowerCase() ?? 'all';

    const dateBetween =
      filtersApplied && dateRange ? Between(dateRange[0], dateRange[1]) : null;

    const config: Record<string, any> = {
      [IncentiveTypeEnum.ALL]: {
        dateField: 'bookingDate',
      },
      [IncentiveTypeEnum.REGULARIZED]: {
        base: {
          unitStatus: UnitStatusEnum.REGULARIZED,
          saleType: Not(SalesTypeEnum.CREDIT_SALE_MGT_APPROVED),
        },
        dateField: 'receivedDate',
      },
      [IncentiveTypeEnum.UNREGULARIZED]: {
        base: {
          unitStatus: UnitStatusEnum.UNREGULARIZED,
        },
        dateField: 'bookingDate',
      },
      [IncentiveTypeEnum.QUALIFIED]: {
        base: {
          unitStatus: In([
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ]),
          saleType: Not(SalesTypeEnum.CREDIT_SALE_MGT_APPROVED),
        },
        dateField: 'payableReceivedDate',
      },
      [IncentiveTypeEnum.MANAGEMENT_SALE]: {
        base: {
          unitStatus: UnitStatusEnum.DISQUALIFIED,
        },
        dateField: 'disqualifiedDate',
      },
      [IncentiveTypeEnum.CANCELLED]: {
        base: {
          unitStatus: In([
            UnitStatusEnum.CANCELLED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ]),
        },
        dateField: 'cancellationDate',
      },
      [IncentiveTypeEnum.MGMT_APPROVED_CREDIT_SALE]: {
        multi: [
          {
            base: {
              unitStatus: UnitStatusEnum.REGULARIZED,
              saleType: SalesTypeEnum.CREDIT_SALE_MGT_APPROVED,
            },
            dateField: 'receivedDate',
          },
          {
            base: {
              unitStatus: In([
                UnitStatusEnum.QUALIFIED,
                UnitStatusEnum.QUALIFIED_CANCELLED,
              ]),
              saleType: SalesTypeEnum.CREDIT_SALE_MGT_APPROVED,
            },
            dateField: 'payableReceivedDate',
          },
        ],
      },
    };

    const rule = config[lowerType];
    if (!rule) return whereCondition;

    if (rule.multi) {
      return rule.multi.map(({ base, dateField }) => {
        const wc: any = { ...whereCondition, ...base };
        if (dateBetween) wc[dateField] = dateBetween;
        return wc;
      });
    }

    const wc: any = { ...whereCondition, ...rule.base };
    if (dateBetween) wc[rule.dateField] = dateBetween;
    return wc;
  }

  /**
   * Applies search filtering to the where condition.
   * If a search term is provided, it modifies the where condition to include
   * case-insensitive partial matches on customerName and propertyNumber fields.
   *
   * @param whereCondition - The existing where condition object.
   * @param search - The search term to apply.
   * @returns The modified where condition with search applied.
   */
  private applySearch(whereCondition: any, search?: string) {
    if (!search) return whereCondition;
    const searchLower = search.toLowerCase();
    return [
      { ...whereCondition, customerName: ILike(`%${searchLower}%`) },
      { ...whereCondition, propertyNumber: ILike(`%${searchLower}%`) },
    ];
  }

  /**
   * Fetches incentive bookings based on the where condition,
   * applies pagination, and transforms the results for response.
   *
   * @param whereCondition - The conditions to filter bookings.
   * @param skip - The number of records to skip (for pagination).
   * @param limit - The maximum number of records to return.
   * @param page - The current page number.
   * @returns An object containing the message and paginated booking data.
   */
  private async fetchBookingsAndTransform(
    whereCondition: any,
    skip: number,
    limit: number,
    page: number,
  ) {
    const [bookings, totalRecords] =
      await this.incentiveBookingRepository.findAndCount({
        where: whereCondition,
        relations: ['projectPhase', 'projectPhase.project', 'user'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

    if (!bookings.length) {
      return {
        message: 'No bookings found',
        data: {
          totalRecords: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
      };
    }

    const transformed = bookings.map((b) => {
      let message: string | null = null;
      if (b.isDeadlineApproaching && b.bookingDeadline) {
        const today = moment();
        const deadline = moment(b.bookingDeadline);
        const remainingDays = deadline.diff(today, 'days');
        if (remainingDays > 0) {
          message = `If ${b.customerName}'s booking ${b.bookingId} isn't regularized within ${remainingDays} days, the incentive for this sale will be lost.`;
        }
      }

      return {
        id: b.id,
        bookingId: b.bookingId,
        unitStatus: b.unitStatus,
        customerName: b.customerName,
        rmName: b.user?.name ?? 'N/A',
        unitDetails: {
          phaseName: b.projectPhase?.name || null,
          propertyNumber: b.propertyNumber,
        },
        bookingDate: formatDateUtil(b.bookingDate, 'display'),
        agreementReceivedDate: formatDateUtil(
          b.agreementReceivedDate,
          'display',
        ),
        receivedDate: formatDateUtil(b.receivedDate, 'display'),
        qualifiedDate: formatDateUtil(b.payableReceivedDate, 'display'),
        incentivePaidDate: formatDateUtil(b.paidDate, 'display'),
        receivedPercent: b.receivedPercent,
        grossTotalValue: b.grossTotalValue,
        incentivePercentage: b.incentivePercentage,
        incentivePayable: { amount: b.incentiveAmount },
        paymentStatus: b.paymentStatus,
        stage: b.bookingProjectType || null,
        flag: b.isDeadlineApproaching,
        createdAt: b.createdAt,
        message,
      };
    });

    return {
      message: 'All Bookings Fetched Successfully',
      data: {
        transformed,
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
    };
  }

  private parseExcelDate(dateCell: any): Date | null {
    if (dateCell instanceof Date) return dateCell;
    if (typeof dateCell === 'string') {
      const parsedDate = moment(dateCell, MONTH_DATE_YEAR, true);
      if (parsedDate.isValid()) return parsedDate.toDate();
    }
    return null;
  }

  public async bulkUpdatePayableReceivedDatesFromExcel(): Promise<any> {
    try {
      // 1. Load the Excel File
      const excelFilePath = this.configService.get<string>(
        'FROZEN_DATE_EXCEL_FILE_PATH',
      );

      if (!excelFilePath) {
        throw new BadRequestException(
          'Excel file path is not defined in environment variables.',
        );
      }

      const resolvedPath = path.resolve(process.cwd(), excelFilePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(resolvedPath);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('Worksheet not found in Excel file');
      }

      // 2. Build a map of composite key (bookingId__vendor) => optional dates
      const bookingKeyToDates = new Map<
        string,
        { qualifiedDate?: Date; paidDate?: Date }
      >();
      const invalidRows: number[] = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const vendor = getCellValue(row, 8)?.toString().trim();
        const bookingId = getCellValue(row, 12)?.toString().trim();
        const qualifiedDate = this.parseExcelDate(getCellValue(row, 32));
        const paidDate = this.parseExcelDate(getCellValue(row, 33));

        if (!bookingId || !vendor || (!qualifiedDate && !paidDate)) {
          invalidRows.push(rowNumber);
          return;
        }

        if (qualifiedDate && paidDate && qualifiedDate > paidDate) {
          throw new BadRequestException(
            `Qualified date cannot be after paid date in row ${rowNumber}.`,
          );
        }

        const uniqueKey = `${bookingId}__${vendor}`;
        bookingKeyToDates.set(uniqueKey, {
          ...(qualifiedDate && { qualifiedDate }),
          ...(paidDate && { paidDate }),
        });
      });

      if (!bookingKeyToDates.size) {
        throw new BadRequestException(
          'No valid booking records found in Excel to process.',
        );
      }

      // 3. Build array of composite keys to match in DB
      const compositeKeys = Array.from(bookingKeyToDates.keys()).map((key) => {
        const [bookingId, vendor] = key.split('__');
        return { bookingId, vendor };
      });

      // 4. Use a transaction for atomicity
      return await this.incentiveBookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Query Builder with actual column names
          const qb = transactionalEntityManager
            .createQueryBuilder(IncentiveBooking, 'booking')
            .leftJoinAndSelect('booking.user', 'user')
            .select([
              'booking.id',
              'booking.bookingId',
              'booking.vendor',
              'booking.payableReceivedDate',
              'booking.paidDate',
              'booking.paymentStatus',
              'booking.incentiveAmount',
              'booking.incentivePercentage',
              'user.id',
              'user.name',
            ]);

          if (compositeKeys.length) {
            qb.andWhere(
              new Brackets((subQb) => {
                compositeKeys.forEach((key, index) => {
                  subQb.orWhere(
                    `(booking.booking_id = :bookingId${index} AND booking.vendor = :vendor${index})`,
                    {
                      [`bookingId${index}`]: key.bookingId,
                      [`vendor${index}`]: key.vendor,
                    },
                  );
                });
              }),
            );
          }

          const matchedBookings = await qb.getMany();

          // 5. In-memory update of dates; payout uses incentive_booking amounts
          const groupedByUserAndMonth = new Map<
            string,
            {
              user: any;
              year: number;
              month: number;
              totalIncentive: number;
              bookingIds: number[];
            }
          >();

          matchedBookings.forEach((booking) => {
            const uniqueKey = `${booking.bookingId}__${booking.vendor}`;
            const dates = bookingKeyToDates.get(uniqueKey);
            if (!dates) return;

            if (dates.qualifiedDate) {
              booking.payableReceivedDate = dates.qualifiedDate;
            }
            if (dates.paidDate) {
              booking.paidDate = dates.paidDate;
              booking.paymentStatus = PaymentStatusEnum.PAID;

              const user = booking?.user;
              const year = getYear(dates.paidDate);
              const month = getMonth(dates.paidDate) + 1;
              if (user) {
                const key = `${user?.id}__${year}__${month}`;
                if (!groupedByUserAndMonth.has(key)) {
                  groupedByUserAndMonth.set(key, {
                    user,
                    year,
                    month,
                    totalIncentive: 0,
                    bookingIds: [],
                  });
                }

                const group = groupedByUserAndMonth.get(key);
                group.totalIncentive += booking.incentiveAmount || 0;
                group.bookingIds.push(booking?.id);
              }
            }
          });

          // 6. Bulk Save updates to DB
          if (matchedBookings.length) {
            await transactionalEntityManager.save(matchedBookings);
          }

          for (const group of groupedByUserAndMonth.values()) {
            // Fetch the user again to ensure it is complete and valid
            const user = await transactionalEntityManager.findOne(Users, {
              where: { id: group?.user?.id },
              // select: ['id', 'name'],
            });

            if (!user) {
              throw new InternalServerErrorException(
                `User with ID ${group.user.id} not found.`,
              );
            }

            // Create a new UserIncentivePayout entity
            const newPayout = transactionalEntityManager.create(
              UserIncentivePayout,
              {
                user,
                year: group.year,
                month: group.month,
                totalIncentive: Number(group.totalIncentive),
                incentivePaid: Number(group.totalIncentive),
                accrualAmount: 0,
                utilizedDelta: 0,
                salary: 0,
                carryForwardAmount: 0,
                maxMultiplier: 0,
                bookingIds: group.bookingIds,
              },
            );
            await transactionalEntityManager.save(newPayout);
          }

          return {
            message: 'Bulk update completed successfully.',
            updatedRecords: matchedBookings.length,
            skippedRecords: invalidRows.length,
          };
        },
      );
    } catch (error) {
      logger.error(
        'Error in the bulkUpdatePayableReceivedDatesFromExcel function',
        error,
      );
      logsAndErrorHandling(
        'IncentiveBookingService - bulkUpdatePayableReceivedDatesFromExcel',
        error,
        null,
      );
    }
  }

  public async bulkUpdatePayoutsFromExcel(
    updateOnlyDates = false,
  ): Promise<any> {
    try {
      const excelFilePath = this.configService.get<string>(
        'FROZEN_DATE_EXCEL_FILE_PATH',
      );

      if (!excelFilePath) {
        throw new BadRequestException(
          'Payout Excel file path is not defined in environment variables.',
        );
      }

      const resolvedPath = path.resolve(process.cwd(), excelFilePath);
      const fileName = path.basename(resolvedPath);

      const job = await this.bulkPayoutUpdateQueue.add(
        'process',
        { filePath: excelFilePath, fileName, updateOnlyDates },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      );

      await this.queueJobAuditService.append({
        queueName: BULK_PAYOUT_UPDATE_QUEUE,
        jobId: String(job.id),
        jobName: 'process',
        event: QUEUE_JOB_AUDIT_EVENT.ENQUEUED,
        sourceModule: 'incentive_booking',
        summary: `Bulk payout update queued: ${fileName}`,
        context: { filePath: excelFilePath, fileName, updateOnlyDates },
      });

      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'Bulk payout update job queued for processing.',
        data: { jobId: String(job.id) },
      };
    } catch (error) {
      logger.error('Error queuing bulk payout update job', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to queue bulk payout update job.',
      );
    }
  }

  public async runBulkUpdatePayableReceivedDatesJob(
    payload: BulkPayoutUpdateJobPayload,
  ): Promise<any> {
    try {
      const { filePath, updateOnlyDates = false } = payload;
      if (!filePath) {
        throw new BadRequestException(
          'Bulk payout job payload is missing filePath',
        );
      }

      const resolvedPath = path.resolve(process.cwd(), filePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(resolvedPath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new BadRequestException('Worksheet not found in Excel file');
      }

      const bookingKeyToDates = new Map<
        string,
        {
          qualifiedDate?: Date;
          paidDate?: Date;
          incentiveAmount?: number;
          incentivePercentage?: number;
        }
      >();
      const invalidRows: number[] = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const vendor = getCellValue(row, 9)?.toString().trim();
        const bookingId = getCellValue(row, 13)?.toString().trim();
        const qualifiedDate = this.parseExcelDate(getCellValue(row, 34));
        const paidDate = this.parseExcelDate(getCellValue(row, 35));

        let incentiveAmount: number | undefined;
        let incentivePercentage: number | undefined;

        if (!updateOnlyDates) {
          const rawIncentiveAmount = getCellValue(row, 61)?.toString().trim();
          const rawIncentivePercentage = getCellValue(row, 60)
            ?.toString()
            .trim()
            .replace('%', '');

          const parsedIncentiveAmount = rawIncentiveAmount
            ? Number(rawIncentiveAmount)
            : NaN;
          let parsedIncentivePercentage = rawIncentivePercentage
            ? Number(rawIncentivePercentage)
            : NaN;
          if (
            !isNaN(parsedIncentivePercentage) &&
            parsedIncentivePercentage <= 1
          ) {
            parsedIncentivePercentage *= 100;
          }

          if (!isNaN(parsedIncentiveAmount)) {
            incentiveAmount = parsedIncentiveAmount;
          }
          if (!isNaN(parsedIncentivePercentage)) {
            incentivePercentage = parsedIncentivePercentage;
          }
        }

        const rowHasValidPayoutInfo =
          bookingId &&
          vendor &&
          (qualifiedDate || paidDate) &&
          (updateOnlyDates ||
            (incentiveAmount !== undefined &&
              incentivePercentage !== undefined &&
              incentiveAmount > 0 &&
              incentivePercentage > 0));

        if (!rowHasValidPayoutInfo) {
          invalidRows.push(rowNumber);
          return;
        }
        console.log({
          bookingId,
          vendor,
          qualifiedDate,
          paidDate,
          incentiveAmount,
          incentivePercentage,
          rowHasValidPayoutInfo,
        });

        if (qualifiedDate && paidDate && qualifiedDate > paidDate) {
          throw new BadRequestException(
            `Qualified date cannot be after paid date in row ${rowNumber}.`,
          );
        }

        const uniqueKey = `${bookingId}__${vendor}`;
        bookingKeyToDates.set(uniqueKey, {
          ...(qualifiedDate && { qualifiedDate }),
          ...(paidDate && { paidDate }),
          ...(incentiveAmount !== undefined && { incentiveAmount }),
          ...(incentivePercentage !== undefined && {
            incentivePercentage,
          }),
        });
      });

      if (!bookingKeyToDates.size) {
        throw new BadRequestException(
          'No valid booking records found in Excel to process.',
        );
      }

      const compositeKeys = Array.from(bookingKeyToDates.keys()).map((key) => {
        const [bookingId, vendor] = key.split('__');
        return { bookingId, vendor };
      });

      return await this.incentiveBookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const qb = transactionalEntityManager
            .createQueryBuilder(IncentiveBooking, 'booking')
            .leftJoinAndSelect('booking.user', 'user')
            .select([
              'booking.id',
              'booking.bookingId',
              'booking.vendor',
              'booking.payableReceivedDate',
              'booking.paidDate',
              'booking.paymentStatus',
              'booking.incentiveAmount',
              'booking.incentivePercentage',
              'user.id',
              'user.name',
            ]);

          if (compositeKeys.length) {
            qb.andWhere(
              new Brackets((subQb) => {
                compositeKeys.forEach((key, index) => {
                  subQb.orWhere(
                    `(booking.booking_id = :bookingId${index} AND booking.vendor = :vendor${index})`,
                    {
                      [`bookingId${index}`]: key.bookingId,
                      [`vendor${index}`]: key.vendor,
                    },
                  );
                });
              }),
            );
          }

          const matchedBookings = await qb.getMany();

          const groupedByUserAndMonth = new Map<
            string,
            {
              user: any;
              year: number;
              month: number;
              totalIncentive: number;
              bookingIds: number[];
            }
          >();

          matchedBookings.forEach((booking) => {
            const uniqueKey = `${booking.bookingId}__${booking.vendor}`;
            const dates = bookingKeyToDates.get(uniqueKey);
            if (!dates) return;

            if (dates.qualifiedDate) {
              booking.payableReceivedDate = dates.qualifiedDate;
            }
            if (dates.paidDate) {
              booking.paidDate = dates.paidDate;
              booking.paymentStatus = PaymentStatusEnum.PAID;

              if (!updateOnlyDates) {
                if (dates.incentiveAmount !== undefined) {
                  booking.incentiveAmount = dates.incentiveAmount;
                }
                if (dates.incentivePercentage !== undefined) {
                  booking.incentivePercentage = dates.incentivePercentage;
                }
              }

              const user = booking?.user;
              const year = getYear(dates.paidDate);
              const month = getMonth(dates.paidDate) + 1;
              if (user) {
                const key = `${user?.id}__${year}__${month}`;
                if (!groupedByUserAndMonth.has(key)) {
                  groupedByUserAndMonth.set(key, {
                    user,
                    year,
                    month,
                    totalIncentive: 0,
                    bookingIds: [],
                  });
                }

                const group = groupedByUserAndMonth.get(key);
                group.totalIncentive += booking.incentiveAmount || 0;
                group.bookingIds.push(booking?.id);
              }
            }
          });

          if (matchedBookings.length) {
            await transactionalEntityManager.save(matchedBookings);
          }

          for (const group of groupedByUserAndMonth.values()) {
            const user = await transactionalEntityManager.findOne(Users, {
              where: { id: group?.user?.id },
            });

            if (!user) {
              throw new InternalServerErrorException(
                `User with ID ${group.user.id} not found.`,
              );
            }

            const newPayout = transactionalEntityManager.create(
              UserIncentivePayout,
              {
                user,
                year: group.year,
                month: group.month,
                totalIncentive: Number(group.totalIncentive),
                incentivePaid: Number(group.totalIncentive),
                accrualAmount: 0,
                utilizedDelta: 0,
                salary: 0,
                carryForwardAmount: 0,
                maxMultiplier: 0,
                bookingIds: group.bookingIds,
              },
            );
            await transactionalEntityManager.save(newPayout);
          }

          return {
            message: 'Bulk payout update completed successfully.',
            updatedRecords: matchedBookings.length,
            skippedRecords: invalidRows.length,
          };
        },
      );
    } catch (error) {
      logger.error('Error in runBulkUpdatePayableReceivedDatesJob', error);
      logsAndErrorHandling(
        'IncentiveBookingService - runBulkUpdatePayableReceivedDatesJob',
        error,
        null,
      );
      throw error;
    }
  }

  public async bulkUpdateQualifiedDates(): Promise<any> {
    try {
      // 1. Load the Excel File
      const excelFilePath = this.configService.get<string>(
        'QUALIFIED_DATE_FILE_PATH',
      );

      if (!excelFilePath) {
        throw new BadRequestException(
          'Excel file path is not defined in environment variables.',
        );
      }

      const resolvedPath = path.resolve(__dirname, excelFilePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(resolvedPath);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('Worksheet not found in Excel file');
      }

      // 2. Build a map of composite key (bookingId__vendor) => date
      const bookingKeyToDates = new Map<string, { qualifiedDate: Date }>();
      const invalidRows: number[] = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const vendor = row.getCell(8)?.text?.trim();
        const bookingId = row.getCell(12)?.text?.trim();
        const qualifiedDate = this.parseExcelDate(row.getCell(31)?.value);

        if (!bookingId || !vendor || !qualifiedDate) {
          invalidRows.push(rowNumber);
          return;
        }

        const uniqueKey = `${bookingId}__${vendor}`;
        bookingKeyToDates.set(uniqueKey, { qualifiedDate });
      });

      if (!bookingKeyToDates.size) {
        throw new BadRequestException(
          'No valid booking records found in Excel to process.',
        );
      }

      // 3. Build array of composite keys to match in DB
      const compositeKeys = Array.from(bookingKeyToDates.keys()).map((key) => {
        const [bookingId, vendor] = key.split('__');
        return { bookingId, vendor };
      });

      // 4. Use a transaction for atomicity
      return await this.incentiveBookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Query Builder with actual column names
          const qb = transactionalEntityManager
            .createQueryBuilder(IncentiveBooking, 'booking')
            .leftJoinAndSelect('booking.user', 'user')
            .select([
              'booking.id',
              'booking.bookingId',
              'booking.vendor',
              'booking.payableReceivedDate',
              'booking.paidDate',
              'booking.paymentStatus',
              'booking.incentiveAmount',
              'user.id',
              'user.name',
            ]);

          if (compositeKeys.length) {
            qb.andWhere(
              new Brackets((subQb) => {
                compositeKeys.forEach((key, index) => {
                  subQb.orWhere(
                    `(booking.booking_id = :bookingId${index} AND booking.vendor = :vendor${index})`,
                    {
                      [`bookingId${index}`]: key.bookingId,
                      [`vendor${index}`]: key.vendor,
                    },
                  );
                });
              }),
            );
          }

          const matchedBookings = await qb.getMany();
          matchedBookings.forEach((booking) => {
            const uniqueKey = `${booking.bookingId}__${booking.vendor}`;
            const dates = bookingKeyToDates.get(uniqueKey);
            if (dates) {
              booking.payableReceivedDate = dates.qualifiedDate;
            }
          });

          // 6. Bulk Save updates to DB
          if (matchedBookings.length) {
            await transactionalEntityManager.save(matchedBookings);
          }
          return {
            message: 'Bulk update completed successfully.',
            updatedRecords: matchedBookings.length,
            skippedRecords: invalidRows.length,
          };
        },
      );
    } catch (error) {
      logger.error('Failed to update payableReceivedDates from Excel', error);
      logsAndErrorHandling(
        'IncentiveBookingService - bulkUpdateQualifiedDates',
        error,
        null,
      );
    }
  }

  /** Excluded from split-structure counting (not on the deal). */
  private readonly excludedStructureStatuses: UnitStatusEnum[] = [
    UnitStatusEnum.CANCELLED,
    UnitStatusEnum.DISQUALIFIED,
  ];

  /** Excluded from incentive payout / split application. */
  private readonly excludedPayoutStatuses: UnitStatusEnum[] = [
    UnitStatusEnum.CANCELLED,
    UnitStatusEnum.DISQUALIFIED,
    UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND,
  ];

  private normalizeIncentiveAmount(value: number | null | undefined): number {
    return Number((value ?? 0).toFixed(3));
  }

  /**
   * RM present on the deal for Closing RM structure (includes ineligible / no-policy rows).
   */
  private isStructureParticipant(booking: IncentiveBooking): boolean {
    return (
      !!booking.externalBPNumber &&
      !this.excludedStructureStatuses.includes(booking.unitStatus)
    );
  }

  /**
   * RM eligible to receive a split incentive amount.
   */
  private isActiveParticipant(booking: IncentiveBooking): boolean {
    return (
      booking.shouldBeCalculated === true &&
      !this.excludedPayoutStatuses.includes(booking.unitStatus)
    );
  }

  private isClosingRM(booking: IncentiveBooking): boolean {
    const assignment = booking.user?.groupAssignments?.[0];
    return assignment?.group?.id === CLOSING_RM_GROUP_ID;
  }

  /**
   * Dedupe all deal RMs (including ineligible) by bookingId + externalBPNumber for split rules.
   */
  private getUniqueStructureParticipants(
    bookings: IncentiveBooking[],
  ): IncentiveBooking[] {
    const uniqueByParticipantKey = new Map<string, IncentiveBooking>();
    for (const booking of bookings) {
      if (!this.isStructureParticipant(booking)) {
        continue;
      }
      const participantKey = `${booking.bookingId}::${booking.externalBPNumber}`;
      if (!uniqueByParticipantKey.has(participantKey)) {
        uniqueByParticipantKey.set(participantKey, booking);
      }
    }
    return Array.from(uniqueByParticipantKey.values());
  }

  /**
   * Build per-RM split assignments from Closing RM count rules.
   * Uses full deal structure; payout is applied only to active participants separately.
   */
  private buildClosingRmSplitPlan(
    participants: IncentiveBooking[],
  ): 'NO_SPLIT' | 'INVALID' | Map<string, ClosingRmSplitAssignment> {
    const totalRmCount = participants.length;
    if (totalRmCount <= 2) {
      return 'NO_SPLIT';
    }

    const closingRmCount = participants.filter((p) =>
      this.isClosingRM(p),
    ).length;

    if (closingRmCount === 0 || closingRmCount === totalRmCount) {
      return 'INVALID';
    }

    const nonClosingCount = totalRmCount - closingRmCount;
    const splitByBp = new Map<string, ClosingRmSplitAssignment>();

    if (closingRmCount === 1) {
      for (const participant of participants) {
        const isClosing = this.isClosingRM(participant);
        const splitFactor = isClosing ? 1 : nonClosingCount;
        splitByBp.set(participant.externalBPNumber, {
          splitFactor,
          sharedGroupMetadata:
            splitFactor > 1
              ? {
                  splitReason: 'NON_CLOSING_RM_SPLIT',
                  participantCount: totalRmCount,
                  closingRmCount,
                }
              : null,
        });
      }
      return splitByBp;
    }

    if (closingRmCount === 2) {
      for (const participant of participants) {
        const isClosing = this.isClosingRM(participant);
        const splitFactor = isClosing ? 2 : 1;
        splitByBp.set(participant.externalBPNumber, {
          splitFactor,
          sharedGroupMetadata:
            splitFactor > 1
              ? {
                  splitReason: 'CLOSING_RM_SPLIT',
                  participantCount: totalRmCount,
                  closingRmCount,
                }
              : null,
        });
      }
      return splitByBp;
    }

    return 'INVALID';
  }

  private metadataEquals(
    a: ClosingRmSplitMetadata | null,
    b: ClosingRmSplitMetadata | null,
  ): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private async enqueueInvalidRmNotification(
    em: EntityManager,
    bookingId: string,
    notifications?: any[],
  ): Promise<void> {
    const type = 'Invalid RM Configuration Alert';
    const message = `Booking ${bookingId}: ${IneligibilityReasonEnum.INVALID_RM_CONFIGURATION}. Incentive calculation skipped.`;

    if (notifications?.some((n) => n.type === type && n.message === message)) {
      return;
    }

    const existing = await em.findOne(Notifications, {
      where: { type, message },
    });
    if (existing) {
      return;
    }

    notifications?.push({
      title: 'Invalid RM Configuration',
      message,
      type,
      isForAllAdmin: true,
    });
  }

  private applyInvalidRmConfigurationToRow(booking: IncentiveBooking): boolean {
    const hasChanges =
      booking.shouldBeCalculated !== false ||
      booking.splitFactor !== 1 ||
      this.normalizeIncentiveAmount(booking.incentiveAmount) !== 0 ||
      booking.incentivePercentage !== 0 ||
      booking.ineligibilityReason !==
        IneligibilityReasonEnum.INVALID_RM_CONFIGURATION ||
      booking.sharedGroupMetadata !== null;

    if (!hasChanges) {
      return false;
    }

    booking.shouldBeCalculated = false;
    booking.splitFactor = 1;
    booking.incentiveAmount = 0;
    booking.incentivePercentage = 0;
    booking.ineligibilityReason =
      IneligibilityReasonEnum.INVALID_RM_CONFIGURATION;
    booking.sharedGroupMetadata = null;
    return true;
  }

  /**
   * Post-processing: apply Closing RM incentive split after base slab calculation.
   * Split structure is derived from all deal RMs (including ineligible); amounts apply to eligible RMs only.
   */
  async applyGroupSharingLogic(
    bookingIds: string[],
    em: EntityManager,
    notifications?: any[],
  ): Promise<void> {
    if (!bookingIds?.length) return;

    const records = await em
      .createQueryBuilder(IncentiveBooking, 'booking')
      .leftJoinAndSelect('booking.user', 'u')
      .leftJoinAndSelect(
        'u.groupAssignments',
        'uga',
        'uga.startDate <= :now AND (uga.endDate IS NULL OR uga.endDate >= :now)',
        { now: new Date() },
      )
      .leftJoinAndSelect('uga.group', 'g')
      .where('booking.bookingId IN (:...bookingIds)', { bookingIds })
      .getMany();

    const recordsByBookingId = records.reduce(
      (acc, record) => {
        if (!acc[record.bookingId]) acc[record.bookingId] = [];
        acc[record.bookingId].push(record);
        return acc;
      },
      {} as Record<string, IncentiveBooking[]>,
    );

    const updatesToSave: IncentiveBooking[] = [];
    const deltasToSave: IncentiveDeltaHistory[] = [];

    for (const [bookingId, bookings] of Object.entries(recordsByBookingId)) {
      const structureParticipants =
        this.getUniqueStructureParticipants(bookings);
      const splitPlan = this.buildClosingRmSplitPlan(structureParticipants);

      if (splitPlan === 'INVALID') {
        await this.enqueueInvalidRmNotification(em, bookingId, notifications);

        for (const booking of bookings) {
          if (this.applyInvalidRmConfigurationToRow(booking)) {
            updatesToSave.push(booking);
          }
        }

        continue;
      }

      this.processBookingSplitPlan(
        bookings,
        splitPlan,
        updatesToSave,
        deltasToSave,
        em,
      );
    }

    if (updatesToSave.length > 0) {
      await em.save(IncentiveBooking, updatesToSave);
    }
    if (deltasToSave.length > 0) {
      await em.save(IncentiveDeltaHistory, deltasToSave);
    }
  }

  private processBookingSplitPlan(
    bookings: IncentiveBooking[],
    splitPlan: 'NO_SPLIT' | Map<string, ClosingRmSplitAssignment>,
    updatesToSave: IncentiveBooking[],
    deltasToSave: IncentiveDeltaHistory[],
    em: EntityManager,
  ): void {
    const splitByBp = splitPlan === 'NO_SPLIT' ? null : splitPlan;

    for (const booking of bookings) {
      if (!this.isActiveParticipant(booking)) {
        continue;
      }

      let newSplitFactor = 1;
      let newMetadata: ClosingRmSplitMetadata | null = null;

      if (splitByBp && booking.externalBPNumber) {
        const assignment = splitByBp.get(booking.externalBPNumber);

        if (assignment) {
          newSplitFactor = assignment.splitFactor;
          newMetadata = assignment.sharedGroupMetadata;
        }
      }

      const oldIncentiveAmount = this.normalizeIncentiveAmount(
        booking.incentiveAmount,
      );

      const newIncentiveAmount = this.normalizeIncentiveAmount(
        this.normalizeIncentiveAmount(booking.baseIncentiveAmount) /
          newSplitFactor,
      );

      const splitChanged =
        booking.splitFactor !== newSplitFactor ||
        !this.metadataEquals(
          booking.sharedGroupMetadata as ClosingRmSplitMetadata | null,
          newMetadata,
        ) ||
        newIncentiveAmount !== oldIncentiveAmount;

      if (!splitChanged) {
        continue;
      }

      booking.splitFactor = newSplitFactor;
      booking.sharedGroupMetadata = newMetadata;
      booking.incentiveAmount = newIncentiveAmount;

      updatesToSave.push(booking);

      if (
        booking.paymentStatus === PaymentStatusEnum.PAID &&
        newIncentiveAmount !== oldIncentiveAmount
      ) {
        const deltaDiff = this.normalizeIncentiveAmount(
          newIncentiveAmount - oldIncentiveAmount,
        );

        if (Math.abs(deltaDiff) > 0.0) {
          booking.incentiveDelta = this.normalizeIncentiveAmount(
            (booking.incentiveDelta || 0) + deltaDiff,
          );

          deltasToSave.push(
            em.create(IncentiveDeltaHistory, {
              user: booking.user,
              booking,
              deltaAmount: deltaDiff,
            }),
          );
        }
      }
    }
  }
}
